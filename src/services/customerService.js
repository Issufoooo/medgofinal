import { supabase } from '../lib/supabase'
import { checkBlacklist } from './blacklistService'

function normalizeWhatsApp(value = '') {
  return value.replace(/[\s\-()]/g, '')
}

function isMissingRpcError(error) {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
  return message.includes('public_upsert_customer') || message.includes('function') && message.includes('does not exist')
}

/**
 * Upsert a customer by WhatsApp number.
 *
 * Public order pages can run while an internal user is still authenticated in the
 * same browser. Calling a SECURITY DEFINER RPC avoids RLS blocking the public
 * customer creation/update flow and keeps customer rows from being broadly
 * exposed through SELECT policies.
 */
export async function upsertCustomer({
  fullName,
  whatsappNumber,
  addressNotes = null,
  zoneId = null,
  lastKnownLat = null,
  lastKnownLng = null,
}) {
  const normalizedPhone = normalizeWhatsApp(whatsappNumber)

  let customer = null
  const { data: rpcCustomer, error: rpcError } = await supabase
    .rpc('public_upsert_customer', {
      p_full_name: fullName,
      p_whatsapp_number: normalizedPhone,
      p_address_notes: addressNotes,
      p_zone_id: zoneId,
      p_last_known_lat: lastKnownLat,
      p_last_known_lng: lastKnownLng,
    })
    .single()

  if (rpcError) {
    if (!isMissingRpcError(rpcError)) {
      throw new Error('Erro ao criar cliente: ' + rpcError.message)
    }

    // Fallback for local/dev databases that have not applied the production RPC yet.
    const { data: fallbackCustomer, error: fallbackError } = await supabase
      .from('customers')
      .upsert(
        {
          full_name: fullName,
          whatsapp_number: normalizedPhone,
          address_notes: addressNotes,
          zone_id: zoneId,
          last_order_at: new Date().toISOString(),
        },
        { onConflict: 'whatsapp_number', ignoreDuplicates: false }
      )
      .select()
      .single()

    if (fallbackError) {
      throw new Error(
        'Erro ao criar cliente: ' + fallbackError.message +
        '. Se isto acontecer em produção, aplica o patch SQL MedGo_supabase_production_patch.sql.'
      )
    }
    customer = fallbackCustomer
  } else {
    customer = rpcCustomer
  }

  // Verificar blacklist ANTES de devolver o customer.
  // Se o cliente estiver BLOCKED, lançar erro — o pedido não pode ser criado.
  const blacklistResult = await checkBlacklist(normalizedPhone)
  if (blacklistResult.isBlacklisted && blacklistResult.entry?.severity === 'BLOCKED') {
    throw new Error(
      'Este número está bloqueado e não pode fazer novos pedidos. ' +
      'Contacte o suporte para mais informações.'
    )
  }

  return { customer, blacklistResult }
}

/**
 * Get customer order history by WhatsApp number.
 */
export async function getCustomerByWhatsApp(whatsappNumber) {
  const { data, error } = await supabase
    .from('customers')
    .select('*, orders(id, status, medication_name_snapshot, created_at, total_price)')
    .eq('whatsapp_number', whatsappNumber)
    .order('created_at', { foreignTable: 'orders', ascending: false })
    .single()

  if (error) return null
  return data
}

/**
 * Get paginated customer list for operator/owner view.
 */
export async function getCustomers({ page = 1, pageSize = 20, search = '' } = {}) {
  let query = supabase
    .from('customers')
    .select(
      '*, zone:delivery_zones(name), orders(count)',
      { count: 'exact' }
    )
    .order('last_order_at', { ascending: false, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,whatsapp_number.ilike.%${search}%`
    )
  }

  const { data, error, count } = await query
  if (error) throw error

  return { customers: data || [], total: count || 0 }
}
