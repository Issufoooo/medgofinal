import { useRef, useState } from 'react'

/**
 * MagneticButton — wraps any element (button/Link) and adds a subtle
 * cursor-following pull on hover, like Linear/Stripe CTA buttons.
 * Pass `as` to render a different element (defaults to button-like div wrapper
 * around children, so it composes with react-router <Link>).
 */
export function MagneticButton({ children, strength = 0.35, className = '' }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const handleMove = (e) => {
    const node = ref.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) * strength
    const y = (e.clientY - rect.top - rect.height / 2) * strength
    setPos({ x, y })
  }
  const handleLeave = () => setPos({ x: 0, y: 0 })

  return (
    <span
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`inline-block transition-transform duration-200 ease-out ${className}`}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      {children}
    </span>
  )
}
