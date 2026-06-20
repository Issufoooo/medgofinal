import { supabase } from '../lib/supabase'
import { auditLog } from './auditService'

/**
 * Arquitectura WhatsApp: Meta Cloud API via Supabase Edge Function.
 *
 * Frontend → supabase.functions.invoke('whatsapp-send') → Meta API
 *
 * Secrets no Supabase (nunca no frontend):
 *   WHATSAPP_ACCESS_TOKEN
 *   WHATSAPP_PHONE_NUMBER_ID
 *
 * Fallback: link wa.me manual quando API não está configurada.
 * ThankYouPage incentiva o cliente a iniciar a conversa primeiro
 * (estratégia de custo — janela gratuita de 24h Meta).
 */

// ─── Config cache ──────────────────────────────────────────────────────────
let _cfg = null
let _cfgAt = 0
const CFG_TTL = 60_000

export async function getConfig() {
  if (_cfg && Date.now() - _cfgAt < CFG_TTL) return _cfg

  const { data } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', [
      'operation_name', 'platform_name', 'platform_phone', 'whatsapp_number',
      'tracking_base_url', 'whatsapp_enabled',
      'wa_tpl_order_created', 'wa_tpl_price_confirmation', 'wa_tpl_order_dispatched',
      'wa_tpl_order_delivered', 'wa_tpl_order_cancelled',
    ])

  const m = Object.fromEntries((data || []).map(r => [r.key, r.value]))

  _cfg = {
    // 'operation_name' é o campo real editado em Configurações → Parâmetros do sistema.
    // 'platform_name' fica como alias de compatibilidade caso exista de versões antigas.
    platformName:    m.operation_name   || m.platform_name || 'MedGo',
    platformPhone:   m.platform_phone   || m.whatsapp_number || '',
    trackingBaseUrl: m.tracking_base_url || (typeof window !== 'undefined' ? window.location.origin : ''),
    whatsappEnabled: m.whatsapp_enabled === 'true',
    templates: {
      order_created:      m.wa_tpl_order_created      || '',
      price_confirmation: m.wa_tpl_price_confirmation || '',
      order_dispatched:   m.wa_tpl_order_dispatched   || '',
      order_delivered:    m.wa_tpl_order_delivered    || '',
      order_cancelled:    m.wa_tpl_order_cancelled    || '',
    },
  }
  _cfgAt = Date.now()
  return _cfg
}

export function invalidateNotificationCache() { _cfg = null }

// ─── Interpolação de templates ─────────────────────────────────────────────
export function interpolate(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

function buildVars({ order, customer, trackingUrl, config, cancellationReason }) {
  const fmt = v => v != null
    ? new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2 }).format(v) + ' MZN'
    : '—'
  return {
    customer_name:       customer?.full_name || 'Cliente',
    medication_name:     order?.medication_name_snapshot || '',
    tracking_url:        trackingUrl || '',
    medication_price:    fmt(order?.medication_price),
    delivery_fee:        fmt(order?.delivery_fee),
    total_price:         fmt(order?.total_price),
    platform_name:       config.platformName,
    platform_phone:      config.platformPhone,
    cancellation_reason: cancellationReason || order?.cancellation_reason || 'Não especificado',
  }
}

// ─── Envio via Edge Function (Meta Cloud API) ──────────────────────────────
async function sendViaEdgeFunction(phone, message, templateKey) {
  const { data, error } = await supabase.functions.invoke('whatsapp-send', {
    body: { phone, message, templateKey },
  })
  if (error) throw new Error(error.message || 'Edge Function error')
  return data
}

// ─── Gerar link wa.me (fallback manual) ───────────────────────────────────
export function buildWaLink(phone, message) {
  const clean = phone.replace(/\D/g, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
}

// ─── API pública ───────────────────────────────────────────────────────────
/**
 * Envia notificação WhatsApp.
 * Sempre resolve — nunca lança excepção (falha silenciosa com log).
 * Retorna { sent, reason, waLink }.
 */
export async function sendNotification(templateKey, { order, customer, trackingUrl, cancellationReason }) {
  const result = { sent: false, reason: null, waLink: null }

  try {
    const config = await getConfig()
    const phone  = customer?.whatsapp_number
    if (!phone) { result.reason = 'no_phone'; return result }

    const tpl = config.templates[templateKey]
    if (!tpl)  { result.reason = `unknown_template:${templateKey}`; return result }

    const vars    = buildVars({ order, customer, trackingUrl, config, cancellationReason })
    const message = interpolate(tpl, vars)

    // Gerar link de fallback sempre (útil para o operador copiar)
    result.waLink = buildWaLink(phone, message)

    if (!config.whatsappEnabled) {
      result.reason = 'whatsapp_disabled'
      // Não é erro — é estado esperado enquanto API não está configurada
      return result
    }

    await sendViaEdgeFunction(phone, message, templateKey)
    result.sent   = true
    result.reason = 'ok'

    await auditLog({
      action: 'NOTIFICATION_SENT',
      entityType: 'order', entityId: order?.id,
      metadata: { templateKey, phone, sent: true },
    }).catch(() => null)

  } catch (err) {
    result.reason = err?.message || 'unknown_error'
    await auditLog({
      action: 'NOTIFICATION_FAILED',
      entityType: 'order', entityId: order?.id,
      metadata: { templateKey, reason: result.reason },
    }).catch(() => null)
    console.warn('[Notification] Failed:', templateKey, result.reason)
  }

  return result
}

/**
 * Constrói a URL de tracking pública.
 * Rota correcta: /acompanhar/:token (nunca /rastrear)
 */
export async function buildTrackingUrl(trackingToken) {
  const config = await getConfig()
  const base   = config.trackingBaseUrl.replace(/\/$/, '')
  return `${base}/acompanhar/${trackingToken}`
}
