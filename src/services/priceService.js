// ─────────────────────────────────────────────────────────────
// MedGo — Price Service
// Single source of truth for all pricing calculations.
// ─────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase'

let _cache = null
let _fetchedAt = 0

export async function getPricingConfig() {
  const now = Date.now()
  if (_cache && now - _fetchedAt < 60_000) return _cache

  const { data } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', ['platform_markup_percent', 'cash_on_delivery_fee_percent'])

  const m = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  _cache = {
    markupPercent: parseFloat(m.platform_markup_percent) || 0,
    codFeePercent: parseFloat(m.cash_on_delivery_fee_percent) || 0,
  }
  _fetchedAt = now
  return _cache
}

export function invalidatePricingCache() {
  _cache = null
}

/**
 * Pure price calculation (no side effects).
 * @returns {{ pharmacyPrice, markupAmount, medicationPrice, deliveryFee, codFeeAmount, totalPrice, isCod, markupPercent, codFeePercent }}
 */
export function calculatePrices({ pharmacyPrice, deliveryFee = 0, paymentMethod, markupPercent = 0, codFeePercent = 0 }) {
  const pharmacy = parseFloat(pharmacyPrice) || 0
  const delivery = parseFloat(deliveryFee) || 0
  const markup   = markupPercent > 0 ? round(pharmacy * markupPercent / 100) : 0
  const medPrice = round(pharmacy + markup)
  const subTotal = round(medPrice + delivery)
  const isCod    = paymentMethod === 'CASH_ON_DELIVERY'
  const codFee   = isCod && codFeePercent > 0 ? round(subTotal * codFeePercent / 100) : 0
  const total    = round(subTotal + codFee)

  return { pharmacyPrice: round(pharmacy), markupAmount: markup, medicationPrice: medPrice, deliveryFee: delivery, codFeeAmount: codFee, totalPrice: total, isCod, markupPercent, codFeePercent }
}

export async function calculateOrderPrices({ pharmacyPrice, deliveryFee, paymentMethod }) {
  const config = await getPricingConfig()
  return calculatePrices({ pharmacyPrice, deliveryFee, paymentMethod, markupPercent: config.markupPercent, codFeePercent: config.codFeePercent })
}

function round(n) { return Math.round(n * 100) / 100 }

export const fmtMZN = (v) =>
  v != null ? new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', minimumFractionDigits: 2 }).format(v) : '—'
