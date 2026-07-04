/**
 * MedGo — debitopay-create-payment v3
 * Adicionado logging detalhado para diagnosticar "order not found".
 * Usa get_user_role() em vez de query profiles (evita 403).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (p: unknown, s = 200) =>
  new Response(JSON.stringify(p), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

function msisdn(phone: string) {
  const d = String(phone || '').replace(/\D/g, '')
  return d.startsWith('258') ? d.slice(3) : d
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const apiKey     = Deno.env.get('DEBITOPAY_API_KEY')
    const walletId   = Deno.env.get('DEBITOPAY_WALLET_ID')
    const merchantId = Deno.env.get('DEBITOPAY_MERCHANT_ID')
    const apiBase    = Deno.env.get('DEBITOPAY_API_BASE_URL') || 'https://my.debito.co.mz/api/v1'

    console.log('[debitopay] env check — supabaseUrl:', !!supabaseUrl, 'anonKey:', !!anonKey, 'serviceKey:', !!serviceKey, 'apiKey:', !!apiKey, 'walletId:', !!walletId)

    if (!supabaseUrl || !anonKey || !serviceKey)
      return json({ success: false, reason: 'supabase_env_missing' }, 500)

    if (!apiKey || !walletId)
      return json({ success: false, reason: 'debitopay_secrets_missing', message: 'Configura DEBITOPAY_API_KEY e DEBITOPAY_WALLET_ID nos Supabase Secrets.' })

    // ── Auth do utilizador ────────────────────────────────────
    const auth = req.headers.get('Authorization') || ''
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } })
    const admin      = createClient(supabaseUrl, serviceKey)

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    console.log('[debitopay] auth — userId:', user?.id, 'authErr:', authErr?.message)
    if (authErr || !user?.id) return json({ success: false, reason: 'unauthorized', message: 'Sessão inválida.' }, 401)

    // ── Verificar role via RPC (evita 403 por profileError) ──
    const { data: userRole, error: roleErr } = await userClient.rpc('get_user_role')
    console.log('[debitopay] role:', userRole, 'roleErr:', roleErr?.message)
    if (roleErr) return json({ success: false, reason: 'role_check_failed', message: 'Erro ao verificar permissão.' }, 500)
    if (!['owner', 'operator'].includes(userRole))
      return json({ success: false, reason: 'forbidden', message: `Sem permissão (role: ${userRole}).` }, 403)

    // ── Parse do body ─────────────────────────────────────────
    const rawBody = await req.text()
    console.log('[debitopay] rawBody:', rawBody)
    const body = JSON.parse(rawBody)
    const orderId = body.orderId
    console.log('[debitopay] orderId received:', orderId, 'type:', typeof orderId)

    if (!orderId) return json({ success: false, reason: 'missing_order_id', message: 'orderId obrigatório.' }, 400)

    // ── Buscar pedido — admin bypassa RLS ────────────────────
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select(`
        id, tracking_token, payment_method, payment_status,
        payment_reference, total_price, status,
        medication_name_snapshot,
        customer:customers(full_name, whatsapp_number)
      `)
      .eq('id', orderId)
      .maybeSingle()

    // LOG COMPLETO para diagnóstico
    console.log('[debitopay] order query — found:', !!order, 'orderError:', JSON.stringify(orderError), 'orderId sent:', orderId)
    if (order) console.log('[debitopay] order status:', order.status, 'payment_status:', order.payment_status)

    if (orderError) return json({ success: false, reason: 'db_error', message: `Erro na base de dados: ${orderError.message}`, detail: orderError }, 500)
    if (!order)     return json({ success: false, reason: 'not_found', message: 'Pedido não encontrado. Verifica se o UUID está correcto.', orderId }, 404)

    if (order.status === 'CANCELLED')         return json({ success: false, reason: 'order_cancelled', message: 'Pedido cancelado.' }, 400)
    if (order.payment_status === 'CONFIRMED') return json({ success: false, reason: 'already_paid', message: 'Pedido já pago.' })

    const method = String(body.method || order.payment_method || '').toUpperCase()
    if (!['MPESA', 'EMOLA'].includes(method))
      return json({ success: false, reason: 'unsupported_method', message: 'Método não suportado. Use MPESA ou EMOLA.' }, 400)

    const amount = Number(body.amount || order.total_price || 0)
    if (!Number.isFinite(amount) || amount <= 0)
      return json({ success: false, reason: 'invalid_amount', message: 'Valor inválido.' }, 400)

    const phone  = String(body.phone || (order.customer as Record<string,string>)?.whatsapp_number || '')
    const num    = msisdn(phone)
    console.log('[debitopay] phone:', phone, '→ msisdn:', num)
    if (!/^8[2-7]\d{7}$/.test(num))
      return json({ success: false, reason: 'invalid_phone', message: `Número inválido para cobrança: ${num}` }, 400)

    // ── Chamada à Débito Pay ──────────────────────────────────
    const providerPath = method === 'EMOLA' ? 'emola' : 'mpesa'
    const endpoint     = `${apiBase.replace(/\/$/, '')}/wallets/${walletId}/c2b/${providerPath}`
    const dpPayload    = {
      msisdn: num,
      amount,
      reference_description: `MedGo ${order.tracking_token}`,
      internal_notes: `Pedido ${order.tracking_token} · ${order.medication_name_snapshot}`,
    }
    console.log('[debitopay] calling Débito Pay:', endpoint, JSON.stringify(dpPayload))

    const providerRes  = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(dpPayload),
    })
    const providerData = await providerRes.json().catch(() => ({}))
    console.log('[debitopay] Débito Pay status:', providerRes.status, JSON.stringify(providerData))

    const ref   = providerData.debito_reference || providerData.reference || null
    const txId  = providerData.transaction_id   || providerData.id        || null
    const localStatus = providerRes.ok ? 'AWAITING_CONFIRMATION' : 'FAILED'

    // ── Registar na payment_transactions ────────────────────
    const { error: txErr } = await admin.from('payment_transactions').insert({
      order_id:                order.id,
      provider:                'DEBITOPAY',
      method,
      amount,
      currency:                'MZN',
      phone:                   num,
      status:                  String(providerData.status || 'PENDING').toUpperCase(),
      debito_reference:        ref,
      provider_transaction_id: txId ? String(txId) : null,
      provider_response:       providerData,
      merchant_id:             merchantId || null,
      wallet_id:               walletId,
      created_by:              user.id,
    })
    if (txErr) console.error('[debitopay] payment_transactions insert error:', JSON.stringify(txErr))

    if (!providerRes.ok)
      return json({ success: false, reason: 'provider_error', message: providerData?.message || `Débito Pay rejeitou (HTTP ${providerRes.status}).`, provider: providerData })

    await admin.from('orders').update({ payment_status: localStatus, payment_reference: ref }).eq('id', order.id)

    await admin.from('action_logs').insert({
      actor_id: user.id, actor_role: userRole,
      action: 'DEBITOPAY_CHARGE_CREATED', entity_type: 'order', entity_id: order.id,
      metadata: { method, amount, ref, txId, walletId },
    }).catch(() => null)

    return json({ success: true, pending: true, orderId: order.id, paymentStatus: localStatus, ref, txId,
      message: 'Cobrança enviada. Aguarda confirmação do cliente.' })

  } catch (err) {
    console.error('[debitopay] FATAL:', err)
    return json({ success: false, reason: 'fatal', message: err?.message || 'Erro inesperado.' }, 500)
  }
})
