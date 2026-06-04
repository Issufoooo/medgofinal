import { useState, useEffect } from 'react'

/**
 * NetworkStatus — renders a persistent banner when the user is offline.
 * Relevant for Mozambique's unstable network conditions.
 */
export function NetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      if (wasOffline) {
        setShowReconnected(true)
        setTimeout(() => setShowReconnected(false), 4000)
      }
    }
    const handleOffline = () => {
      setOnline(false)
      setWasOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  if (online && showReconnected) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
        <div className="flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <span className="h-2 w-2 rounded-full bg-green-300 animate-pulse" />
          Ligação restabelecida
        </div>
      </div>
    )
  }

  if (online) return null

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white text-sm font-medium py-2 px-4 text-center">
      <span className="inline-flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M3 3l18 18" />
        </svg>
        Sem ligação à internet. As alterações não serão guardadas.
      </span>
    </div>
  )
}
