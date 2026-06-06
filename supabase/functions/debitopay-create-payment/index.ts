/**
 * MedGo — debitopay-create-payment Edge Function
 *
 * Cria cobrança C2B na Débito Pay para pedidos M-Pesa/e-Mola.
 * Frontend -> esta função -> Débito Pay API.
 *
 * Secrets necessários no Supabase:
 *   DEBITOPAY_API_KEY      = sk_sandbox_... ou sk_live_...
 *   DEBITOPAY_WALLET_ID    = 52539
 *   DEBITOPAY_MERCHANT_ID  = 844d4ae3-6993-40b4-95bf-c8ae384d7311
 *   DEBITOPAY_API_BASE_URL = https://my.debito.co.mz/api/v1  (opcional)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeMsisdn(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.startsWith('258')) return digits.slice(3)
  return digits
}

function normalizeStatus(status: unknown) {
  return String(status || 'PENDING').toUpperCase()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    const apiKey = Deno.env.get('DEBITOPAY_API_KEY')
    const walletId = Deno.env.get('DEBITOPAY_WALLET_ID')
    const merchantId = Deno.env.get('DEBITOPAY_MERCHANT_ID')
    const apiBaseUrl = Deno.env.get('DEBITOPAY_API_BASE_URL') || 'https://my.debito.co.mz/api/v1'

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ success: false, reason: 'supabase_secrets_missing', message: 'Supabase secrets em falta.' }, 500)
    }

    if (!apiKey || !walletId) {
      return json({ success: false, reason: 'debitopay_secrets_missing', message: 'Credenciais da Débito Pay ainda não configuradas no Supabase.' }, 200)
    }

    const authHeader = req.headers.get('Authorization') || ''
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const admin = createClient(supabaseUrl, serviceKey)

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user?.id) {
      return json({ success: false, reason: 'unauthorized', message: 'Sessão inválida.' }, 401)
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !profile?.is_active || !['owner', 'operator'].includes(profile.role)) {
      return json({ success: false, reason: 'forbidden', message: 'Sem permissão para criar cobrança.' }, 403)
    }

    const body = await req.json()
    const orderId = body.orderId
    const preferredMethod = String(body.method || '').toUpperCase()

    if (!orderId) return json({ success: false, message: 'orderId obrigatório.' }, 400)

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, tracking_token, payment_method, payment_status, payment_reference, total_price, status, medication_name_snapshot, customer:customers(full_name, whatsapp_number)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return json({ success: false, reason: 'order_not_found', message: 'Pedido não encontrado.' }, 404)
    }

    if (order.status === 'CANCELLED') {
      return json({ success: false, reason: 'order_cancelled', message: 'Pedido cancelado não pode receber cobrança.' }, 400)
    }

    if (order.payment_status === 'CONFIRMED') {
      return json({ success: false, reason: 'already_paid', message: 'Este pedido já está marcado como pago.' }, 200)
    }

    const method = preferredMethod || order.payment_method
    if (!['MPESA', 'EMOLA'].includes(method)) {
      return json({ success: false, reason: 'unsupported_method', message: 'A Débito Pay está activa apenas para M-Pesa/e-Mola.' }, 400)
    }

    const amount = Number(body.amount || order.total_price || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ success: false, reason: 'invalid_amount', message: 'O pedido ainda não tem valor total válido.' }, 400)
    }

    const phone = String(body.phone || order.customer?.whatsapp_number || '')
    const msisdn = normalizeMsisdn(phone)
    if (!/^8[2-7]\d{7}$/.test(msisdn)) {
      return json({ success: false, reason: 'invalid_phone', message: 'Número do cliente inválido para cobrança móvel.' }, 400)
    }

    const providerPath = method === 'EMOLA' ? 'emola' : 'mpesa'
    const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/wallets/${walletId}/c2b/${providerPath}`
    const description = `MedGo ${order.tracking_token}`

    const debitopayPayload = {
      msisdn,
      amount,
      reference_description: description,
      internal_notes: `Pedido ${order.tracking_token} · ${order.medication_name_snapshot}`,
    }

    const providerRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(debitopayPayload),
    })

    const providerData = await providerRes.json().catch(() => ({}))

    const providerReference =
      providerData.debito_reference ||
      providerData.clicpay_reference ||
      providerData.reference ||
      providerData.provider_reference ||
      null

    const transactionId = providerData.transaction_id || providerData.id || null
    const providerStatus = normalizeStatus(providerData.status)
    const localStatus = providerRes.ok ? 'AWAITING_CONFIRMATION' : 'FAILED'

    const { data: tx, error: txError } = await admin
      .from('payment_transactions')
      .insert({
        order_id: order.id,
        provider: 'DEBITOPAY',
        method,
        amount,
        currency: 'MZN',
        phone: msisdn,
        status: providerStatus,
        debito_reference: providerReference,
        provider_transaction_id: transactionId ? String(transactionId) : null,
        provider_response: providerData,
        merchant_id: merchantId || null,
        wallet_id: walletId,
        created_by: profile.id,
      })
      .select('*')
      .single()

    if (txError) {
      console.error('[debitopay-create-payment] tx insert error', txError)
    }

    if (!providerRes.ok) {
      return json({
        success: false,
        reason: 'debitopay_error',
        message: providerData?.message || 'A Débito Pay recusou a criação da cobrança.',
        provider: providerData,
      }, 200)
    }

    await admin
      .from('orders')
      .update({
        payment_status: localStatus,
        payment_reference: providerReference,
      })
      .eq('id', order.id)

    await admin.from('action_logs').insert({
      actor_id: profile.id,
      actor_role: profile.role,
      action: 'DEBITOPAY_CHARGE_CREATED',
      entity_type: 'order',
      entity_id: order.id,
      metadata: {
        method,
        amount,
        providerReference,
        transactionId,
        walletId,
      },
    })

    return json({
      success: true,
      pending: true,
      orderId: order.id,
      paymentStatus: localStatus,
      providerReference,
      transactionId,
      transaction: tx,
      message: 'Cobrança enviada. Aguarda confirmação do cliente e callback da Débito Pay.',
    })
  } catch (err) {
    console.error('[debitopay-create-payment] fatal', err)
    return json({ success: false, reason: 'fatal', message: err?.message || 'Erro inesperado.' }, 500)
  }
})
