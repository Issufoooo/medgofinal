import { useEffect, useRef, useState } from 'react'

/**
 * useReveal — IntersectionObserver hook for scroll-triggered entrances.
 * Returns a ref to attach and a boolean for "has entered viewport".
 * Fires once by default (entrance, not toggle-on-scroll-up).
 */
export function useReveal({ threshold = 0.15, rootMargin = '0px 0px -8% 0px', once = true } = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // Respect reduced motion
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) io.unobserve(node)
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold, rootMargin }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [threshold, rootMargin, once])

  return [ref, visible]
}

/**
 * useMousePosition — tracks pointer position relative to a container,
 * normalized to -0.5..0.5. Used for parallax / magnetic effects.
 */
export function useTilt(strength = 1) {
  const ref = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const onMouseMove = (e) => {
    const node = ref.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: x * strength, y: y * strength })
  }
  const onMouseLeave = () => setTilt({ x: 0, y: 0 })

  return { ref, tilt, onMouseMove, onMouseLeave }
}
