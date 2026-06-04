import { supabase } from '../lib/supabase'

/**
 * Pagamentos MedGo
 *
 * Estado actual:
 *   - CASH_ON_DELIVERY: funcional — operador confirma manualmente
 *   - MPESA / EMOLA: infraestrutura preparada, gateway ainda não activo
 *
 * Quando payment_gateway_enabled = 'false' em system_config,
 * pagamentos online mostram aviso e ficam em PENDING.
 * O pedido NÃO é cancelado — fica aguardando confirmação do operador.
 * O operador trata o pagamento fora do sistema até o gateway estar activo.
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
      success:  true,
      method:   'CASH_ON_DELIVERY',
      manual:   true,
      message:  'Pagamento na entrega. O operador confirmará quando o motoboy entregar.',
    }
  }

  const gatewayOn = await isGatewayEnabled()

  if (!gatewayOn) {
    // Gateway não está activo — não tentar pagamento real
    await supabase.from('orders').update({ payment_status: 'PENDING' }).eq('id', orderId)
    return {
      success:  false,
      pending:  true,
      method,
      reason:   'gateway_not_configured',
      message:  'Pagamento online ainda não disponível nesta versão. O operador irá contactá-lo para confirmar o método de pagamento alternativo.',
    }
  }

  // Aqui entrará a lógica real do gateway (M-Pesa / e-Mola / PayDunya)
  // quando estiver configurado. Por agora retorna pending.
  return {
    success: false,
    pending: true,
    reason:  'gateway_not_implemented',
    message: 'Gateway em configuração. O operador irá contactá-lo.',
  }
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

export async function confirmCODPayment({ orderId, actorId }) {
  const { error } = await supabase
    .from('orders')
    .update({ payment_status: 'CONFIRMED' })
    .eq('id', orderId)
  if (error) throw new Error('Erro ao confirmar pagamento COD: ' + error.message)
  return { confirmed: true }
}

// Alias para retrocompatibilidade com OrderDetailPage
export const confirmPaymentManually = confirmCODPayment
