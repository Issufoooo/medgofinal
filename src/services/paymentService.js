import { supabase } from '../lib/supabase'

/**
 * Pagamentos MedGo
 *
 * CASH_ON_DELIVERY continua manual.
 * MPESA / EMOLA são cobrados pela Débito Pay através de Supabase Edge Functions.
 * Credenciais da Débito Pay ficam apenas nos Supabase Secrets.
 */

async function isGatewayEnabled() {
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'payment_gateway_enabled')
    .single()
  return data?.value === 'true'
}

export async function initiatePayment({ orderId, method, amount, phone }) {
  if (method === 'CASH_ON_DELIVERY') {
    return {
      success: true,
      method: 'CASH_ON_DELIVERY',
      manual: true,
      message: 'Pagamento na entrega. O operador confirmará quando o motoboy entregar.',
    }
  }

  const gatewayOn = await isGatewayEnabled()

  if (!gatewayOn) {
    await supabase.from('orders').update({ payment_status: 'PENDING' }).eq('id', orderId)
    return {
      success: false,
      pending: true,
      method,
      reason: 'gateway_not_configured',
      message: 'Pagamento online ainda não está activo. O operador irá contactar o cliente.',
    }
  }

  return createDebitopayCharge({ orderId, method, amount, phone })
}

export async function createDebitopayCharge({ orderId, method, amount, phone }) {
  const { data, error } = await supabase.functions.invoke('debitopay-create-payment', {
    body: { orderId, method, amount, phone },
  })

  if (error) {
    throw new Error(error.message || 'Não foi possível contactar a função de pagamento.')
  }

  if (!data?.success) {
    throw new Error(data?.message || data?.reason || 'Não foi possível criar a cobrança na Débito Pay.')
  }

  return data
}

export async function getPaymentStatus(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, payment_status, payment_method, payment_reference, total_price')
    .eq('id', orderId)
    .single()
  if (error) throw error
  return data
}

export async function getPaymentTransactions(orderId) {
  const { data, error } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function confirmCODPayment({ orderId, reference }) {
  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: 'CONFIRMED',
      payment_reference: reference || null,
    })
    .eq('id', orderId)
  if (error) throw new Error('Erro ao confirmar pagamento: ' + error.message)
  return { confirmed: true }
}

export const confirmPaymentManually = confirmCODPayment
