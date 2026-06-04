import { supabase } from '../lib/supabase'

/**
 * Verifica se um número WhatsApp está na blacklist.
 * Coluna correcta: whatsapp_number (nunca customer_phone).
 */
export async function checkBlacklist(whatsappNumber) {
  const clean = whatsappNumber.replace(/[\s\-()]/g, '')

  const { data, error } = await supabase
    .from('blacklist')
    .select('id, whatsapp_number, severity, reason, expires_at')
    .eq('whatsapp_number', clean)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .maybeSingle()

  if (error) {
    console.warn('[Blacklist] Query error:', error.message)
    return { isBlacklisted: false, entry: null }
  }

  return {
    isBlacklisted: !!data,
    entry: data || null,
  }
}

export async function addToBlacklist({ whatsappNumber, customerName, severity, reason, notes, expiresAt, actorId }) {
  const { data, error } = await supabase
    .from('blacklist')
    .upsert(
      {
        whatsapp_number: whatsappNumber.replace(/[\s\-()]/g, ''),
        customer_name:   customerName || null,
        severity,
        reason:          reason || null,
        notes:           notes || null,
        added_by:        actorId || null,
        expires_at:      expiresAt || null,
      },
      { onConflict: 'whatsapp_number' }
    )
    .select()
    .single()

  if (error) throw new Error('Erro ao adicionar à blacklist: ' + error.message)
  return data
}

export async function removeFromBlacklist(id) {
  const { error } = await supabase.from('blacklist').delete().eq('id', id)
  if (error) throw new Error('Erro ao remover da blacklist: ' + error.message)
}

export async function getBlacklist() {
  const { data, error } = await supabase
    .from('blacklist')
    .select('*, added_by_profile:profiles(full_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
