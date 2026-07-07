/**
 * MedGo — debitopay-webhook Edge Function
 *
 * Recebe notificações de pagamento da Débito Pay e actualiza o pedido.
 * URL: https://<project-ref>.supabase.co/functions/v1/debitopay-webhook
 *
 * Secret opcional:
 *   DEBITOPAY_WEBHOOK_SECRET — se configurado, valida header x-webhook-secret ou x-debitopay-signature.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-debitopay-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function firstValue(payload: any, keys: string[]) {
  for (const key of keys) {
    const value = key.split('.').reduce((acc, part) => acc?.[part], payload)
    if (value !== undefined && value !== null && value !== '') return value
  }
  return null
}

function normalizeProviderStatus(status: unknown) {
  const raw = String(status || '').trim().toUpperCase()
  if (['SUCCESS', 'SUCCEEDED', 'PAID', 'COMPLETED', 'COMPLETE', 'CONFIRMED', 'APPROVED'].includes(raw)) return 'CONFIRMED'
  if (['FAILED', 'FAILURE', 'REJECTED', 'CANCELLED', 'CANCELED', 'EXPIRED', 'DECLINED'].includes(raw)) return 'FAILED'
  if (['PENDING', 'PROCESSING', 'INITIATED', 'AWAITING_CONFIRMATION'].includes(raw)) return 'AWAITING_CONFIRMATION'
  return raw || 'AWAITING_CONFIRMATION'
}

Deno.Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, message: 'Method not allowed' }, 405)

  const webhookSecret = Deno.env.get('DEBITOPAY_WEBHOOK_SECRET')
  if (webhookSecret) {
    const provided = req.headers.get('x-webhook-secret') || req.headers.get('x-debitopay-signature') || ''
    if (provided !== webhookSecret) {
      return json({ ok: false, message: 'Invalid webhook secret' }, 401)
    }
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) return json({ ok: false, message: 'Supabase secrets em falta.' }, 500)

    const admin = createClient(supabaseUrl, serviceKey)
    const payload = await req.json()

    const providerReference = firstValue(payload, [
      'debito_reference',
      'clicpay_reference',
      'reference',
      'data.debito_reference',
      'data.clicpay_reference',
      'data.reference',
      'transaction.debito_reference',
    ])
    const providerTransactionId = firstValue(payload, [
      'transaction_id',
      'id',
      'data.transaction_id',
      'data.id',
      'transaction.id',
    ])
    const statusValue = firstValue(payload, [
      'status',
      'data.status',
      'transaction.status',
      'event.status',
    ])
    const localPaymentStatus = normalizeProviderStatus(statusValue)

    let transaction = null
    if (providerReference) {
      const { data } = await admin
        .from('payment_transactions')
        .select('*')
        .eq('debito_reference', String(providerReference))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      transaction = data
    }

    if (!transaction && providerTransactionId) {
      const { data } = await admin
        .from('payment_transactions')
        .select('*')
        .eq('provider_transaction_id', String(providerTransactionId))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      transaction = data
    }

    if (!transaction) {
      await admin.from('action_logs').insert({
        actor_id: null,
        actor_role: null,
        action: 'DEBITOPAY_WEBHOOK_UNMATCHED',
        entity_type: 'payment',
        entity_id: null,
        metadata: { payload },
      })
      return json({ ok: true, matched: false })
    }

    await admin
      .from('payment_transactions')
      .update({
        status: localPaymentStatus,
        provider_webhook: payload,
        confirmed_at: localPaymentStatus === 'CONFIRMED' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id)

    await admin
      .from('orders')
      .update({
        payment_status: localPaymentStatus,
        payment_reference: providerReference ? String(providerReference) : transaction.debito_reference,
      })
      .eq('id', transaction.order_id)

    await admin.from('action_logs').insert({
      actor_id: null,
      actor_role: null,
      action: 'DEBITOPAY_WEBHOOK_PROCESSED',
      entity_type: 'order',
      entity_id: transaction.order_id,
      metadata: {
        transactionId: transaction.id,
        providerReference,
        providerTransactionId,
        status: localPaymentStatus,
        payload,
      },
    })

    return json({ ok: true, matched: true, status: localPaymentStatus })
  } catch (err) {
    console.error('[debitopay-webhook] fatal', err)
    return json({ ok: false, message: err?.message || 'Erro inesperado.' }, 500)
  }
})
