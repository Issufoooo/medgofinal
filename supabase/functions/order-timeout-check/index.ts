/**
 * MedGo — order-timeout-check Edge Function
 * Cancela pedidos AWAITING_CLIENT que excederam o timeout.
 * Libera stock APENAS se existiu reserva prévia (função DB verifica).
 * Respeita horário de funcionamento definido em system_config.
 *
 * Deploy:  supabase functions deploy order-timeout-check
 * Cron:    */15 * * * * (cada 15 minutos)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function getCfg(key: string, fallback: string): Promise<string> {
  const { data } = await supabase
    .from('system_config').select('value').eq('key', key).single()
  return data?.value ?? fallback
}

function isWithinBusinessHours(start: string, end: string): boolean {
  const now = new Date()
  // Maputo: UTC+2
  const maputoHour = (now.getUTCHours() + 2) % 24
  const maputoMin  = now.getUTCMinutes()
  const current    = maputoHour * 60 + maputoMin

  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin   = eh * 60 + em

  return current >= startMin && current <= endMin
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const results = { cancelled: 0, errors: 0, skipped: 0 }

  try {
    // Verificar horário de funcionamento
    const bizStart = await getCfg('business_hours_start', '08:00')
    const bizEnd   = await getCfg('business_hours_end',   '20:00')

    if (!isWithinBusinessHours(bizStart, bizEnd)) {
      return new Response(
        JSON.stringify({ message: 'Fora do horário de funcionamento.', skipped: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const timeoutMin = parseInt(await getCfg('client_confirm_timeout_minutes', '60'), 10)
    const cutoff = new Date(Date.now() - timeoutMin * 60_000).toISOString()

    const { data: timedOut, error: fetchErr } = await supabase
      .from('orders')
      .select('id, medication_id, pharmacy_id')
      .eq('status', 'AWAITING_CLIENT')
      .lt('price_confirmed_at', cutoff)
      .not('price_confirmed_at', 'is', null)
      .limit(50)

    if (fetchErr) throw fetchErr
    if (!timedOut?.length) {
      return new Response(
        JSON.stringify({ message: 'Sem pedidos expirados.', ...results }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const reason = `Cancelado automaticamente: cliente não confirmou em ${timeoutMin} minutos.`

    for (const order of timedOut) {
      try {
        // Cancelar pedido
        await supabase.from('orders')
          .update({ status: 'CANCELLED', cancellation_reason: reason })
          .eq('id', order.id)

        await supabase.from('order_status_history').insert({
          order_id:    order.id,
          from_status: 'AWAITING_CLIENT',
          to_status:   'CANCELLED',
          changed_by:  null,
          notes:       reason,
        })

        // Liberar stock APENAS se houve reserva
        if (order.medication_id && order.pharmacy_id) {
          await supabase.rpc('release_stock_for_order', {
            p_medication_id: order.medication_id,
            p_pharmacy_id:   order.pharmacy_id,
            p_order_id:      order.id,
            p_actor_id:      null,
          })
        }

        await supabase.from('action_logs').insert({
          action: 'ORDER_AUTO_CANCELLED',
          entity_type: 'order', entity_id: order.id,
          metadata: { reason: 'client_confirm_timeout', timeout_minutes: timeoutMin },
        })

        results.cancelled++
      } catch (err) {
        console.error(`[timeout] Failed order ${order.id}:`, err)
        results.errors++
      }
    }

    return new Response(
      JSON.stringify({ message: 'Timeout check concluído.', ...results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
