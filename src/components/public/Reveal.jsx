import { useReveal } from '../../hooks/useReveal'

/**
 * Reveal — wraps children, animating them in on scroll.
 * Variants: 'up' (default), 'fade', 'left', 'right', 'scale'
 */
const VARIANTS = {
  up:    { hidden: 'opacity-0 translate-y-7',  shown: 'opacity-100 translate-y-0' },
  fade:  { hidden: 'opacity-0',                shown: 'opacity-100' },
  left:  { hidden: 'opacity-0 -translate-x-6', shown: 'opacity-100 translate-x-0' },
  right: { hidden: 'opacity-0 translate-x-6',  shown: 'opacity-100 translate-x-0' },
  scale: { hidden: 'opacity-0 scale-95',       shown: 'opacity-100 scale-100' },
}

export function Reveal({ children, as: Tag = 'div', variant = 'up', delay = 0, duration = 600, className = '', ...rest }) {
  const [ref, visible] = useReveal()
  const v = VARIANTS[variant] || VARIANTS.up

  return (
    <Tag
      ref={ref}
      className={`transition-all ease-[cubic-bezier(.16,1,.3,1)] will-change-transform ${visible ? v.shown : v.hidden} ${className}`}
      style={{ transitionDuration: `${duration}ms`, transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/**
 * RevealGroup — staggers children automatically (each gets +stagger ms delay).
 * Pass children as an array; each item is wrapped in Reveal.
 */
export function RevealGroup({ children, variant = 'up', stagger = 90, baseDelay = 0, className = '', itemClassName = '' }) {
  const items = Array.isArray(children) ? children : [children]
  return (
    <div className={className}>
      {items.map((child, i) => (
        <Reveal key={i} variant={variant} delay={baseDelay + i * stagger} className={itemClassName}>
          {child}
        </Reveal>
      ))}
    </div>
  )
}
