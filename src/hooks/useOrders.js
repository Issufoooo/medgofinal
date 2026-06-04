import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getOrdersForOperator, getOrderDetail, updateOrderStatus } from '../services/orderService'

/**
 * Orders list for operator dashboard.
 * Realtime disabled temporarily because polling already keeps the dashboard updated.
 */
export function useOrders({ statusFilter = 'ALL', search = '' } = {}) {
  return useQuery({
    queryKey: ['orders', statusFilter, search],
    queryFn: () => getOrdersForOperator({ statusFilter, search }),
    refetchInterval: 20_000,
  })
}

/**
 * Single order detail — used in the order detail page.
 */
export function useOrderDetail(orderId) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderDetail(orderId),
    enabled: !!orderId,
    staleTime: 10_000,
  })
}

/**
 * Mutation: update order status.
 * Auto-invalidates order lists and detail cache.
 */
export function useUpdateStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order', variables.orderId] })
      qc.invalidateQueries({ queryKey: ['order-counts'] })
    },
  })
}

/**
 * Count of orders by status — used for dashboard badges.
 */
export function useOrderCounts() {
  return useQuery({
    queryKey: ['order-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('status')
        .not('status', 'in', '("DELIVERED","CANCELLED")')

      if (error) throw error
      if (!data) return {}

      return data.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1
        acc._total = (acc._total || 0) + 1
        return acc
      }, {})
    },
    refetchInterval: 15_000,
  })
}