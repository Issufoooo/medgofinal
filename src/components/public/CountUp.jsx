import { useEffect, useState } from 'react'
import { useReveal } from '../../hooks/useReveal'

/**
 * CountUp — animates a number from 0 to `value` once it enters the viewport.
 * Used for trust-stat strips ("200+ pedidos", "2 zonas", etc.)
 */
export function CountUp({ value, duration = 1100, prefix = '', suffix = '', className = '' }) {
  const [ref, visible] = useReveal({ threshold: 0.5 })
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!visible) return
    let raf
    const start = performance.now()
    const ease = t => 1 - Math.pow(1 - t, 3)

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setN(Math.round(ease(p) * value))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [visible, value, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{n}{suffix}
    </span>
  )
}
