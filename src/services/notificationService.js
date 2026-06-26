import { supabase } from '../lib/supabase'
import { auditLog } from './auditService'

/**
 * Arquitectura WhatsApp: Meta Cloud API via Supabase Edge Function.
 * Frontend → supabase.functions.invoke('whatsapp-send') → Meta API
 *
 * Secrets no Supabase (nunca no frontend):
 *   WHATSAPP_ACCESS_TOKEN
 *   WHATSAPP_PHONE_NUMBER_ID
 *
 * Chaves do system_config lidas aqui:
 *   operation_name          → nome da operação (ex: "MedGo")
 *   platform_phone / whatsapp_number → número público
 *   tracking_base_url       → base URL para links de tracking
 *   whatsapp_enabled        → 'true' | 'false'
 *   wa_tpl_order_created    → template da ThankYouPage
 *   wa_tpl_price_confirmation
 *   wa_tpl_order_dispatched
 *   wa_tpl_order_delivered
 *   wa_tpl_order_cancelled
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
      'wa_tpl_order_created',
      'wa_tpl_price_confirmation',
      'wa_tpl_order_dispatched',
      'wa_tpl_order_delivered',
      'wa_tpl_order_cancelled',
    ])

  const m = Object.fromEntries((data || []).map(r => [r.key, r.value]))

  _cfg = {
    // 'operation_name' é o campo real editado em Configurações → Sistema
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

// ─── Interpolação ──────────────────────────────────────────────────────────
export function interpolate(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

/**
 * buildVars — valores disponíveis para templates.
 *
 * NOTA MZN: cada variável de preço já inclui " MZN" no valor.
 * Os templates NÃO devem adicionar "MZN" depois da variável — já está incluído.
 * Correcto:   "Total: *{{total_price}}*"     → "Total: *1910,21 MZN*"
 * Errado:     "Total: *{{total_price}} MZN*" → "Total: *1910,21 MZN MZN*"
 */
function buildVars({ order, customer, trackingUrl, config, cancellationReason }) {
  const fmt = v => v != null
    ? new Intl.NumberFormat('pt-MZ', { minimumFractionDigits: 2 }).format(v) + ' MZN'
    : '—'
  return {
    customer_name:       customer?.full_name           || 'Cliente',
    medication_name:     order?.medication_name_snapshot || '',
    tracking_url:        trackingUrl                   || '',
    medication_price:    fmt(order?.medication_price),
    delivery_fee:        fmt(order?.delivery_fee),
    total_price:         fmt(order?.total_price),
    platform_name:       config.platformName,
    platform_phone:      config.platformPhone,
    cancellation_reason: cancellationReason || order?.cancellation_reason || 'Não especificado',
  }
}

// ─── Envio via Edge Function ───────────────────────────────────────────────
async function sendViaEdgeFunction(phone, message, templateKey) {
  const { data, error } = await supabase.functions.invoke('whatsapp-send', {
    body: { phone, message, templateKey },
  })
  if (error) throw new Error(error.message || 'Edge Function error')
  return data
}

// ─── Link wa.me (fallback manual) ─────────────────────────────────────────
export function buildWaLink(phone, message) {
  const clean = String(phone || '').replace(/\D/g, '')
  const num   = clean.startsWith('258') ? clean : `258${clean}`
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}

// ─── API pública ───────────────────────────────────────────────────────────
/**
 * sendNotification — envia mensagem WhatsApp via Edge Function.
 * Resolve sempre — nunca lança excepção.
 * Retorna { sent, reason, waLink }.
 */
export async function sendNotification(templateKey, { order, customer, trackingUrl, cancellationReason }) {
  const result = { sent: false, reason: null, waLink: null }

  try {
    const config = await getConfig()
    const phone  = customer?.whatsapp_number
    if (!phone) { result.reason = 'no_phone'; return result }

    const tpl = config.templates[templateKey]
    if (!tpl)  { result.reason = `no_template:${templateKey}`; return result }

    const vars    = buildVars({ order, customer, trackingUrl, config, cancellationReason })
    const message = interpolate(tpl, vars)

    // Link wa.me sempre disponível — útil como fallback para o operador
    result.waLink = buildWaLink(phone, message)

    if (!config.whatsappEnabled) {
      result.reason = 'whatsapp_disabled'
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
 * buildTrackingUrl — URL pública para o cliente acompanhar o pedido.
 * Rota: /acompanhar/:token
 */
export async function buildTrackingUrl(trackingToken) {
  const config = await getConfig()
  const base   = config.trackingBaseUrl.replace(/\/$/, '')
  return `${base}/acompanhar/${trackingToken}`
}
