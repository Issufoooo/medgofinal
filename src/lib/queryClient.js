import { QueryClient } from '@tanstack/react-query'

/**
 * Detect if an error is a network/connectivity issue
 * (relevant for Mozambique's unstable network conditions).
 */
export function isNetworkError(error) {
  if (!error) return false
  const msg = error?.message?.toLowerCase() || ''
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    error?.name === 'AbortError' ||
    error?.name === 'TimeoutError' ||
    !navigator.onLine
  )
}

/**
 * Only retry on network errors, never on 4xx/auth errors.
 */
function shouldRetry(failureCount, error) {
  if (failureCount >= 2) return false
  return isNetworkError(error)
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           1000 * 30,
      gcTime:              1000 * 60 * 5,
      retry:               shouldRetry,
      retryDelay:          attempt => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: false,
      // Surface network errors clearly instead of silent infinite loading
      throwOnError: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
