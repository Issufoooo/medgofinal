/**
 * MedGo — whatsapp-webhook Edge Function
 *
 * Secrets necessários:
 *   WHATSAPP_VERIFY_TOKEN    — token de verificação
 *   WHATSAPP_ACCESS_TOKEN    — token Meta (para enviar auto-reply)
 *   WHATSAPP_PHONE_NUMBER_ID — ID do número Meta
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Suporta múltiplos nomes de secret
function getToken() {
  return Deno.env.get('WHATSAPP_ACCESS_TOKEN')
      || Deno.env.get('WHATSAPP_ACESS_TOKEN')
      || Deno.env.get('WHATSAPP_TOKEN')
      || ''
}
function getPhoneId() {
  return Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
      || Deno.env.get('WHATSAPP_PHONE_ID')
      || ''
}

async function sendWhatsApp(to: string, body: string) {
  const token   = getToken()
  const phoneId = getPhoneId()
  if (!token || !phoneId) {
    console.warn('[webhook] WhatsApp secrets em falta — auto-reply desactivado')
    return
  }
  const digits = String(to).replace(/\D/g, '')
  const dest   = digits.startsWith('258') ? digits : `258${digits}`
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: dest, type: 'text', text: { body } }),
  })
  if (!res.ok) console.error('[webhook] sendWhatsApp error', res.status, await res.text())
}

const CONFIRM_KEYWORDS = ['sim', 'confirmo', 'confirmar', 'confirma', 'yes', '1', 'ok', 'aceito']
function isConfirm(text: string) {
  const n = text.trim().toLowerCase().replace(/[!.?,]/g, '')
  return CONFIRM_KEYWORDS.some(k => n === k || n.startsWith(k + ' '))
}
function normPhone(p: string) { return String(p||'').replace(/\D/g,'').replace(/^258/,'') }

Deno.serve(async (req) => {
  // GET — verificação Meta
  if (req.method === 'GET') {
    const p   = new URL(req.url).searchParams
    const tok = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || ''
    if (p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === tok)
      return new Response(p.get('hub.challenge'), { status: 200 })
    return new Response('Forbidden', { status: 403 })
  }

  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const rawBody = await req.text()
  let payload: Record<string, unknown>
  try { payload = JSON.parse(rawBody) } catch { return new Response('Bad Request', { status: 400 }) }

  const entry   = (payload?.entry as unknown[])?.[0] as Record<string,unknown>
  const changes = (entry?.changes as unknown[])?.[0] as Record<string,unknown>
  const value   = changes?.value as Record<string,unknown>

  if (value?.messages) {
    for (const raw of value.messages as Record<string,unknown>[]) {
      const from    = raw.from as string
      const msgText = (raw.text as Record<string,string>)?.body?.trim() || ''
      const msgId   = raw.id as string
      const ts      = raw.timestamp as string

      console.log(`[webhook] msg from=${from} text="${msgText.slice(0,60)}"`)

      // Guardar mensagem — usa as colunas reais da tabela whatsapp_messages
      await supabase.from('whatsapp_messages').upsert({
        message_id:  msgId,
        from_number: from,
        type:        'text',
        text_body:   msgText || null,
        raw_payload: raw,
        received_at: ts ? new Date(Number(ts) * 1000).toISOString() : new Date().toISOString(),
      }, { onConflict: 'message_id', ignoreDuplicates: true })
        .catch(err => console.error('[webhook] whatsapp_messages insert error:', JSON.stringify(err)))

      if (!msgText) continue

      const fromNorm = normPhone(from)

      // ── Detectar keyword de confirmação ──────────────────────
      if (isConfirm(msgText)) {
        const { data: cust } = await supabase.from('customers').select('id')
          .or(`whatsapp_number.eq.${fromNorm},whatsapp_number.eq.258${fromNorm}`)
          .maybeSingle()

        if (cust?.id) {
          const { data: ord } = await supabase.from('orders').select('id, tracking_token, medication_name_snapshot')
            .eq('customer_id', cust.id).eq('status', 'AWAITING_CLIENT')
            .order('created_at', { ascending: false }).limit(1).maybeSingle()

          if (ord) {
            const { data: confirmResult } = await supabase
              .rpc('public_confirm_order', { p_token: ord.tracking_token })

            if (confirmResult?.confirmed) {
              console.log(`[webhook] Order ${ord.tracking_token} confirmed via WhatsApp`)

              // Buscar tracking_base_url do system_config
              const { data: cfgRows } = await supabase.from('system_config')
                .select('key,value').in('key', ['tracking_base_url','operation_name'])
              const cfg = Object.fromEntries((cfgRows||[]).map((r:Record<string,string>)=>[r.key,r.value]))
              const base = (cfg.tracking_base_url || 'https://www.medgo-mz.app').replace(/\/$/, '')
              const name  = cfg.operation_name || 'MedGo'

              await sendWhatsApp(from,
                `✅ Pedido de *${ord.medication_name_snapshot}* confirmado!\n\n` +
                `A equipa vai avançar com a preparação. Recebes uma mensagem quando estiver em entrega.\n\n` +
                `Acompanhar: ${base}/acompanhar/${ord.tracking_token}`
              )
              continue // Não enviar auto-reply genérico
            }
          }
        }
      }

      // ── Auto-reply genérico ───────────────────────────────────
      const { data: cfgRows } = await supabase.from('system_config')
        .select('key,value').in('key', ['wa_auto_reply','operation_name'])
      const cfg2 = Object.fromEntries((cfgRows||[]).map((r:Record<string,string>)=>[r.key,r.value]))
      const name  = cfg2.operation_name || 'MedGo'
      const reply = cfg2.wa_auto_reply  || `Olá 👋 Recebemos a tua mensagem no ${name}. A nossa equipa vai responder em breve.`

      await sendWhatsApp(from, reply)
    }
  }

  // Status updates (read receipts, etc.)
  if (value?.statuses) {
    for (const s of value.statuses as Record<string,unknown>[]) {
      console.log(`[webhook] status ${s.id} → ${s.status}`)
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })
})
