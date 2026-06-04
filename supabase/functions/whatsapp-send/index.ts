/**
 * MedGo — whatsapp-send Edge Function
 * Arquitectura: Frontend → esta função → Meta WhatsApp Cloud API
 *
 * Secrets necessários (Supabase Secrets, nunca no frontend):
 *   WHATSAPP_ACCESS_TOKEN    — Bearer token da Meta API
 *   WHATSAPP_PHONE_NUMBER_ID — ID do número registado
 *
 * Deploy: supabase functions deploy whatsapp-send
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const META_API_VERSION = 'v19.0'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const accessToken   = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

    if (!accessToken || !phoneNumberId) {
      return new Response(
        JSON.stringify({ sent: false, reason: 'whatsapp_secrets_not_configured' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { phone, message, templateKey } = body

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'phone and message are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Normalizar número: remover + e espaços
    const cleanPhone = phone.replace(/[\s\-\+()]/g, '')

    // Enviar via Meta Cloud API
    const metaUrl = `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`

    const metaRes = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to:    cleanPhone,
        type:  'text',
        text:  { body: message, preview_url: false },
      }),
    })

    const metaData = await metaRes.json().catch(() => ({}))

    if (!metaRes.ok) {
      console.error('[whatsapp-send] Meta API error:', metaData)
      return new Response(
        JSON.stringify({
          sent:   false,
          reason: metaData?.error?.message || `HTTP ${metaRes.status}`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ sent: true, messageId: metaData?.messages?.[0]?.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[whatsapp-send] Fatal:', err)
    return new Response(
      JSON.stringify({ sent: false, reason: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
