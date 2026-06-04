/**
 * RotatingText — pure CSS + React state implementation.
 * Recreates the RotatingText visual from React Bits without motion/framer-motion.
 * Words cycle on an interval; each new word slides in from below with a spring-like
 * CSS cubic-bezier — no extra dependency required.
 */

import { useState, useEffect, useRef } from 'react';

export function RotatingText({
  texts = [],
  interval = 3200,
  className = '',
  wordClassName = '',
}) {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (texts.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(i => (i + 1) % texts.length);
      setAnimKey(k => k + 1);
    }, interval);
    return () => clearInterval(timerRef.current);
  }, [texts.length, interval]);

  if (!texts.length) return null;

  return (
    <span
      className={`inline-block overflow-hidden align-bottom leading-tight ${className}`}
      style={{ verticalAlign: 'text-bottom' }}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Visually hidden for screen readers */}
      <span className="sr-only">{texts[current]}</span>

      {/* Animated visible word — key change triggers re-mount → CSS enter animation */}
      <span
        key={animKey}
        className={`rotating-text-word inline-block ${wordClassName}`}
        aria-hidden="true"
      >
        {texts[current]}
      </span>
    </span>
  );
}
