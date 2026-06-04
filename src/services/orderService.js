import { supabase }           from '../lib/supabase'
import { auditLog }           from './auditService'
import { checkBlacklist }     from './blacklistService'
import { uploadPrescription } from './prescriptionService'
import { sendNotification, buildTrackingUrl } from './notificationService'
import { VALID_TRANSITIONS, ORDER_STATUS, BLACKLIST_SEVERITY } from '../lib/constants'

// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO DE TRANSIÇÃO
// ─────────────────────────────────────────────────────────────
export function assertValidTransition(fromStatus, toStatus) {
  const allowed = VALID_TRANSITIONS[fromStatus] || []
  if (!allowed.includes(toStatus)) {
    throw new Error(
      `Transição inválida: ${fromStatus} → ${toStatus}. ` +
      `Permitido: [${allowed.join(', ') || 'nenhum'}]`
    )
  }
}

// ─────────────────────────────────────────────────────────────
// CRIAR PEDIDO
// ─────────────────────────────────────────────────────────────
export async function createOrder({
  customerData, medicationId, zoneId, deliveryAddress,
  paymentMethod, prescriptionFile, customerNotes,
}) {
  const whatsapp = customerData.whatsapp.replace(/[\s\-()]/g, '')

  // 1. Blacklist — BLOCKED para o pedido completamente
  const bl = await checkBlacklist(whatsapp)
  if (bl.isBlacklisted && bl.entry?.severity === BLACKLIST_SEVERITY.BLOCKED) {
    throw new Error(
      'Este número está bloqueado. Não é possível fazer novos pedidos. ' +
      'Contacte o suporte para mais informações.'
    )
  }

  // 2. Upsert cliente
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .upsert(
      {
        full_name:       customerData.fullName,
        whatsapp_number: whatsapp,
        address_notes:   deliveryAddress,
        zone_id:         zoneId,
        last_order_at:   new Date().toISOString(),
      },
      { onConflict: 'whatsapp_number' }
    )
    .select()
    .single()

  if (custErr) throw new Error('Erro ao registar cliente: ' + custErr.message)

  await supabase.rpc('increment_customer_order_count', { p_customer_id: customer.id }).catch(() => null)

  // 3. Re-verificar medicamento no momento do submit (race-condition guard)
  const { data: med, error: medErr } = await supabase
    .from('medications')
    .select('id, commercial_name, requires_prescription, is_visible, deleted_at')
    .eq('id', medicationId)
    .eq('is_visible', true)
    .is('deleted_at', null)
    .single()

  if (medErr || !med) {
    throw new Error(
      'O medicamento seleccionado já não está disponível. ' +
      'Por favor volte atrás e escolha outro.'
    )
  }

  // 4. Buscar taxa de entrega da zona
  const { data: zone } = await supabase
    .from('delivery_zones')
    .select('delivery_fee')
    .eq('id', zoneId)
    .single()

  const needsPrescription = med.requires_prescription
  const initialStatus = needsPrescription
    ? ORDER_STATUS.PRESCRIPTION_PENDING
    : ORDER_STATUS.IN_VALIDATION

  // 5. Criar pedido
  // CRÍTICO: total_price é GENERATED ALWAYS — NUNCA incluir no INSERT.
  // Postgres calcula: total_price = COALESCE(medication_price,0) + COALESCE(delivery_fee,0)
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_id:             customer.id,
      medication_id:           medicationId,
      medication_name_snapshot: med.commercial_name,
      zone_id:                 zoneId,
      delivery_address:        deliveryAddress,
      delivery_fee:            zone?.delivery_fee ?? null,
      payment_method:          paymentMethod,
      status:                  initialStatus,
      customer_notes:          customerNotes || null,
      prescription_status:     needsPrescription ? 'PENDING' : null,
    })
    .select()
    .single()

  if (orderErr) throw new Error('Erro ao criar pedido: ' + orderErr.message)

  // 6. Histórico inicial
  await supabase.from('order_status_history').insert({
    order_id:    order.id,
    from_status: null,
    to_status:   initialStatus,
    notes:       'Pedido criado pelo cliente',
  })

  // 7. Upload de receita — rollback do pedido se falhar
  if (prescriptionFile && needsPrescription) {
    try {
      await uploadPrescription(order.id, prescriptionFile)
    } catch (uploadErr) {
      await supabase.from('orders')
        .update({
          status: ORDER_STATUS.CANCELLED,
          cancellation_reason: 'Falha no upload da receita — pedido cancelado automaticamente.',
        })
        .eq('id', order.id)
      await supabase.from('order_status_history').insert({
        order_id:    order.id,
        from_status: initialStatus,
        to_status:   ORDER_STATUS.CANCELLED,
        notes:       'Cancelado: falha no envio da receita.',
      })
      throw new Error(
        'Não foi possível enviar a receita. O pedido foi cancelado. ' +
        'Por favor tente novamente. (' + uploadErr.message + ')'
      )
    }
  }

  // 8. Audit
  await auditLog({
    action: 'ORDER_CREATED', entityType: 'order', entityId: order.id,
    metadata: {
      medicationId, medicationName: med.commercial_name,
      zoneId, needsPrescription,
      blacklisted: bl.isBlacklisted,
      blacklistSeverity: bl.entry?.severity ?? null,
    },
  })

  return {
    order,
    trackingToken:  order.tracking_token,
    blacklistAlert: bl.isBlacklisted ? bl.entry : null,
  }
}

// ─────────────────────────────────────────────────────────────
// ACTUALIZAR STATUS
// ─────────────────────────────────────────────────────────────
export async function updateOrderStatus({
  orderId, newStatus, actorId, actorRole, notes, extraFields = {},
}) {
  const { data: order, error: loadErr } = await supabase
    .from('orders')
    .select('id, status, tracking_token, customer_id, medication_id, pharmacy_id')
    .eq('id', orderId)
    .single()

  if (loadErr || !order) throw new Error('Pedido não encontrado.')

  assertValidTransition(order.status, newStatus)

  // CRÍTICO: total_price é GENERATED ALWAYS — remover de extraFields se vier por engano
  const { total_price: _ignored, ...safeFields } = extraFields
  const payload = { status: newStatus, ...safeFields }

  // Timestamps automáticos por estado
  if (newStatus === ORDER_STATUS.AWAITING_CLIENT) payload.price_confirmed_at  = new Date().toISOString()
  if (newStatus === ORDER_STATUS.CONFIRMED)       payload.client_confirmed_at = new Date().toISOString()
  if (newStatus === ORDER_STATUS.IN_DELIVERY)     payload.dispatched_at       = new Date().toISOString()
  if (newStatus === ORDER_STATUS.DELIVERED)       payload.delivered_at        = new Date().toISOString()

  const { error: updateErr } = await supabase
    .from('orders').update(payload).eq('id', orderId)

  if (updateErr) throw new Error('Erro ao actualizar pedido: ' + updateErr.message)

  await supabase.from('order_status_history').insert({
    order_id:    orderId,
    from_status: order.status,
    to_status:   newStatus,
    changed_by:  actorId || null,
    notes:       notes   || null,
  })

  await auditLog({
    actorId, actorRole,
    action: 'ORDER_STATUS_CHANGED', entityType: 'order', entityId: orderId,
    metadata: { from: order.status, to: newStatus, notes },
  })

  // Reservar stock ao confirmar (via função DB atómica)
  if (newStatus === ORDER_STATUS.CONFIRMED && order.medication_id && order.pharmacy_id) {
    const { data: res } = await supabase.rpc('reserve_stock_for_order', {
      p_medication_id: order.medication_id,
      p_pharmacy_id:   order.pharmacy_id,
      p_order_id:      orderId,
      p_actor_id:      actorId || null,
    })
    if (res && !res.reserved) {
      await auditLog({
        actorId, actorRole,
        action: 'STOCK_RESERVE_SKIPPED', entityType: 'order', entityId: orderId,
        metadata: res,
      })
    }
  }

  // Liberar stock ao cancelar — só se havia reserva (função DB verifica)
  if (newStatus === ORDER_STATUS.CANCELLED && order.medication_id && order.pharmacy_id) {
    await supabase.rpc('release_stock_for_order', {
      p_medication_id: order.medication_id,
      p_pharmacy_id:   order.pharmacy_id,
      p_order_id:      orderId,
      p_actor_id:      actorId || null,
    }).catch(err => console.warn('[Stock] Release skipped:', err?.message))
  }

  // Notificações WhatsApp nos estados chave
  const notifyStates = [
    ORDER_STATUS.AWAITING_CLIENT,
    ORDER_STATUS.IN_DELIVERY,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
  ]
  if (notifyStates.includes(newStatus)) {
    const { data: fullOrder } = await supabase
      .from('orders')
      .select('*, customer:customers(full_name, whatsapp_number)')
      .eq('id', orderId)
      .single()

    if (fullOrder) {
      const tplMap = {
        [ORDER_STATUS.AWAITING_CLIENT]: 'price_confirmation',
        [ORDER_STATUS.IN_DELIVERY]:     'order_dispatched',
        [ORDER_STATUS.DELIVERED]:       'order_delivered',
        [ORDER_STATUS.CANCELLED]:       'order_cancelled',
      }
      const tpl = tplMap[newStatus]
      if (tpl) {
        const trackingUrl = await buildTrackingUrl(fullOrder.tracking_token)
        await sendNotification(tpl, {
          order:       fullOrder,
          customer:    fullOrder.customer,
          trackingUrl,
        })
      }
    }
  }

  return { success: true, previousStatus: order.status }
}

// ─────────────────────────────────────────────────────────────
// CONFIRMAR FARMÁCIA E PREÇO
// CRÍTICO: Nunca passar total_price — é GENERATED ALWAYS.
// Escrever apenas: medication_price, delivery_fee, pharmacy_price,
// platform_markup_amount, cod_fee_amount.
// ─────────────────────────────────────────────────────────────
export async function confirmPharmacyAndPrice({
  orderId, pharmacyId, pharmacyPrice, medicationPrice,
  markupAmount, codFeeAmount, priceAdjustmentReason,
  actorId, actorRole,
}) {
  return updateOrderStatus({
    orderId,
    newStatus:   ORDER_STATUS.AWAITING_CLIENT,
    actorId,     actorRole,
    notes:       `Farmácia confirmada. Preço medicamento: ${medicationPrice} MZN`,
    extraFields: {
      pharmacy_id:             pharmacyId,
      pharmacy_price:          pharmacyPrice          ?? null,
      medication_price:        medicationPrice,
      platform_markup_amount:  markupAmount            ?? null,
      cod_fee_amount:          codFeeAmount            ?? null,
      price_adjustment_reason: priceAdjustmentReason   ?? null,
      // total_price = medication_price + delivery_fee + cod_fee_amount (calculado pelo Postgres)
    },
  })
}

// ─────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────
export async function getOrdersForOperator({ statusFilter, search, limit = 50 } = {}) {
  let query = supabase
    .from('orders')
    .select(`
      id, tracking_token, status, medication_name_snapshot,
      delivery_address, delivery_fee, medication_price, total_price,
      payment_method, payment_status, created_at, updated_at,
      operator_notes, prescription_status,
      customer:customers(id, full_name, whatsapp_number, is_blacklisted),
      zone:delivery_zones(name, delivery_fee)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (statusFilter && statusFilter !== 'ALL') {
    query = query.eq('status', statusFilter)
  }
  if (search) {
    query = query.or(
      `medication_name_snapshot.ilike.%${search}%,` +
      `tracking_token.ilike.%${search}%,` +
      `delivery_address.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) throw error

  // Segunda passagem: busca por nome/WhatsApp do cliente
  if (search && search.length >= 3) {
    const { data: byCust } = await supabase
      .from('orders')
      .select(`
        id, tracking_token, status, medication_name_snapshot,
        delivery_address, delivery_fee, medication_price, total_price,
        payment_method, payment_status, created_at, updated_at,
        operator_notes, prescription_status,
        customer:customers!inner(id, full_name, whatsapp_number, is_blacklisted),
        zone:delivery_zones(name, delivery_fee)
      `)
      .or(
        `full_name.ilike.%${search}%,whatsapp_number.ilike.%${search}%`,
        { foreignTable: 'customers' }
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (byCust?.length) {
      const seen = new Set((data || []).map(o => o.id))
      const merged = [
        ...(data || []),
        ...byCust.filter(o => !seen.has(o.id)),
      ]
      return merged
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit)
    }
  }

  return data || []
}

export async function getOrderDetail(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      medication:medications(commercial_name, generic_name, category, requires_prescription),
      zone:delivery_zones(name, delivery_fee),
      pharmacy:pharmacies(name, address, contact_phone),
      motoboy:profiles!orders_assigned_motoboy_id_fkey(full_name, phone),
      operator:profiles!orders_assigned_operator_id_fkey(full_name),
      status_history:order_status_history(
        id, from_status, to_status, notes, created_at,
        changed_by_profile:profiles(full_name)
      )
    `)
    .eq('id', orderId)
    .single()

  if (error) throw error
  return data
}

export async function getOrderByToken(token) {
  const { data, error } = await supabase
    .rpc('get_order_by_token', { p_token: token })
  if (error) throw error
  return data?.[0] || null
}

export async function cancelOrderByToken(token, reason) {
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, tracking_token, medication_id, pharmacy_id')
    .eq('tracking_token', token)
    .single()

  if (!order) throw new Error('Pedido não encontrado.')

  const cancellable = [
    ORDER_STATUS.PRESCRIPTION_PENDING,
    ORDER_STATUS.IN_VALIDATION,
    ORDER_STATUS.AWAITING_CLIENT,
  ]
  if (!cancellable.includes(order.status)) {
    throw new Error('Este pedido já não pode ser cancelado neste estado.')
  }

  // Usar updateOrderStatus para garantir:
  //  — release_stock_for_order se farmácia estava atribuída (AWAITING_CLIENT)
  //  — notificação de cancelamento ao cliente via WhatsApp
  //  — registo correcto no histórico com actor e motivo
  const result = await updateOrderStatus({
    orderId:    order.id,
    newStatus:  ORDER_STATUS.CANCELLED,
    actorId:    null,
    actorRole:  'client',
    notes:      reason || 'Cancelado pelo cliente',
    extraFields: {
      cancellation_reason: reason || 'Cancelado pelo cliente',
    },
  })

  return { cancelled: result.success }
}
