/**
 * MedGo — whatsapp-webhook Edge Function
 * Recebe eventos da Meta WhatsApp Cloud API (mensagens, status, etc.)
 *
 * Secrets necessários:
 *   WHATSAPP_VERIFY_TOKEN — token de verificação (qualquer string aleatória)
 *   WHATSAPP_APP_SECRET   — para validar assinatura X-Hub-Signature-256
 *
 * Deploy: supabase functions deploy whatsapp-webhook
 * URL de webhook na Meta: https://<project>.supabase.co/functions/v1/whatsapp-webhook
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function verifySignature(req: Request, body: string): Promise<boolean> {
  const appSecret = Deno.env.get('WHATSAPP_APP_SECRET')
  if (!appSecret) return true // sem secret configurado, aceitar (dev)

  const signature = req.headers.get('x-hub-signature-256')
  if (!signature) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const hex = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
  return signature === `sha256=${hex}`
}

Deno.serve(async (req) => {
  // GET: verificação do webhook pela Meta
  if (req.method === 'GET') {
    const url    = new URL(req.url)
    const mode   = url.searchParams.get('hub.mode')
    const token  = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN')
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[webhook] Verification successful')
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // POST: eventos da Meta
  if (req.method === 'POST') {
    const rawBody = await req.text()

    // Verificar assinatura
    const valid = await verifySignature(req, rawBody)
    if (!valid) {
      console.warn('[webhook] Invalid signature')
      return new Response('Unauthorized', { status: 401 })
    }

    let payload
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return new Response('Bad Request', { status: 400 })
    }

    // Processar mensagens recebidas do cliente
    const entry = payload?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (value?.messages) {
      for (const msg of value.messages) {
        const from    = msg.from  // WhatsApp number do cliente
        const msgText = msg.text?.body || ''
        const msgId   = msg.id

        // Procurar cliente pelo WhatsApp e associar ao último pedido
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('whatsapp_number', from)
          .maybeSingle()

        let orderId = null

        if (customer?.id) {
          const { data: order } = await supabase
            .from('orders')
            .select('id')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          orderId = order?.id || null
        }

        // Guardar conversa WhatsApp
        await supabase.from('whatsapp_messages').insert({
          customer_id: customer?.id || null,
          order_id: orderId,
          direction: 'incoming',
          message: msgText,
          whatsapp_message_id: msgId,
        }).catch((err) => console.error('[whatsapp] save message error', err))

        // Registar mensagem recebida no audit log
        await supabase.from('action_logs').insert({
          actor_id:    null,
          actor_role:  null,
          action:      'WHATSAPP_MESSAGE_RECEIVED',
          entity_type: 'customer',
          entity_id:   null,
          metadata:    { from, message: msgText, messageId: msgId },
        })

        // Auto-resposta simples se cliente enviar o tracking token
        // (Extensão futura: lookup do token e responder com status)
        console.log(`[webhook] Message from ${from}: ${msgText.slice(0, 50)}`)
      }
    }

    // Processar status de mensagens enviadas
    if (value?.statuses) {
      for (const status of value.statuses) {
        console.log(`[webhook] Message status: ${status.id} → ${status.status}`)
        // Futuramente: actualizar action_logs com delivered/read
      }
    }

    return new Response('OK', { status: 200 })
  }

  return new Response('Method Not Allowed', { status: 405 })
})
