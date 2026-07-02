/**
 * MedGo — debitopay-create-payment Edge Function v2
 * FIX: usa get_user_role() RPC para verificar permissão,
 *      evita 403 causado por profileError no admin query.
 *
 * Secrets necessários:
 *   DEBITOPAY_API_KEY
 *   DEBITOPAY_WALLET_ID
 *   DEBITOPAY_MERCHANT_ID
 *   DEBITOPAY_API_BASE_URL  (opcional, default: https://my.debito.co.mz/api/v1)
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
    const url        = Deno.env.get('SUPABASE_URL')!
    const anon       = Deno.env.get('SUPABASE_ANON_KEY')!
    const svc        = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const apiKey     = Deno.env.get('DEBITOPAY_API_KEY')
    const walletId   = Deno.env.get('DEBITOPAY_WALLET_ID')
    const merchantId = Deno.env.get('DEBITOPAY_MERCHANT_ID')
    const apiBase    = Deno.env.get('DEBITOPAY_API_BASE_URL') || 'https://my.debito.co.mz/api/v1'

    if (!apiKey || !walletId)
      return json({ success: false, reason: 'secrets_missing', message: 'Credenciais da Débito Pay não configuradas nos Supabase Secrets.' })

    const auth = req.headers.get('Authorization') || ''
    const user = createClient(url, anon, { global: { headers: { Authorization: auth } } })
    const admin = createClient(url, svc)

    const { data: { user: me }, error: authErr } = await user.auth.getUser()
    if (authErr || !me) return json({ success: false, reason: 'unauthorized', message: 'Sessão inválida.' }, 401)

    // ── Verificar role via RPC (mesmo mecanismo das RLS) ──────
    const { data: role, error: roleErr } = await user.rpc('get_user_role')
    if (roleErr) {
      console.error('[debitopay] role check error:', roleErr)
      return json({ success: false, reason: 'role_check_failed', message: 'Erro ao verificar permissão.' }, 500)
    }
    if (!['owner', 'operator'].includes(role))
      return json({ success: false, reason: 'forbidden', message: `Sem permissão (role: ${role}).` }, 403)

    const body     = await req.json()
    const orderId  = body.orderId
    const method   = String(body.method || '').toUpperCase()
    const amount   = Number(body.amount)
    const phone    = String(body.phone || '')
    const num      = msisdn(phone)

    if (!orderId)                          return json({ success: false, message: 'orderId obrigatório.' }, 400)
    if (!Number.isFinite(amount) || amount <= 0) return json({ success: false, message: 'Valor inválido.' }, 400)
    if (!/^8[2-7]\d{7}$/.test(num))       return json({ success: false, message: 'Número inválido (formato 8XXXXXXXX).' }, 400)
    if (!['MPESA', 'EMOLA'].includes(method)) return json({ success: false, reason: 'unsupported_method', message: 'Débito Pay activa só para M-Pesa/e-Mola.' }, 400)

    const { data: order, error: oErr } = await admin.from('orders')
      .select('id, tracking_token, status, payment_status, medication_name_snapshot')
      .eq('id', orderId).single()

    if (oErr || !order) return json({ success: false, reason: 'not_found', message: 'Pedido não encontrado.' }, 404)
    if (order.status === 'CANCELLED') return json({ success: false, reason: 'cancelled', message: 'Pedido cancelado.' }, 400)
    if (order.payment_status === 'CONFIRMED') return json({ success: false, reason: 'already_paid', message: 'Já pago.' })

    const providerPath = method === 'EMOLA' ? 'emola' : 'mpesa'
    const endpoint     = `${apiBase.replace(/\/$/, '')}/wallets/${walletId}/c2b/${providerPath}`

    const pRes  = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ msisdn: num, amount, reference_description: `MedGo ${order.tracking_token}` }),
    })
    const pData = await pRes.json().catch(() => ({}))
    console.log('[debitopay] provider', pRes.status, JSON.stringify(pData))

    const ref  = pData.debito_reference || pData.reference || null
    const txId = pData.transaction_id   || pData.id        || null
    const localStatus = pRes.ok ? 'AWAITING_CONFIRMATION' : 'FAILED'

    await admin.from('payment_transactions').insert({
      order_id: order.id, provider: 'DEBITOPAY', method, amount, currency: 'MZN',
      phone: num, status: String(pData.status || 'PENDING').toUpperCase(),
      debito_reference: ref, provider_transaction_id: txId ? String(txId) : null,
      provider_response: pData, merchant_id: merchantId || null, wallet_id: walletId,
      created_by: me.id,
    })

    if (!pRes.ok)
      return json({ success: false, reason: 'provider_error', message: pData?.message || `Débito Pay recusou (HTTP ${pRes.status}).`, provider: pData })

    await admin.from('orders').update({ payment_status: localStatus, payment_reference: ref }).eq('id', order.id)
    await admin.from('action_logs').insert({
      actor_id: me.id, actor_role: role, action: 'DEBITOPAY_CHARGE_CREATED',
      entity_type: 'order', entity_id: order.id,
      metadata: { method, amount, ref, txId, walletId },
    })

    return json({ success: true, pending: true, orderId: order.id, paymentStatus: localStatus, ref, txId })

  } catch (err) {
    console.error('[debitopay] fatal:', err)
    return json({ success: false, reason: 'fatal', message: err?.message || 'Erro inesperado.' }, 500)
  }
})
