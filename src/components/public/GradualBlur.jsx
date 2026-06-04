/**
 * GradualBlur — gradual backdrop-filter blur overlay.
 * No mathjs dependency needed — uses native JS math only.
 * Self-injects minimal CSS into document.head.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';

// ── Inject CSS once ─────────────────────────────────────────────
const injectStyles = () => {
  if (typeof document === 'undefined') return;
  const id = 'gradual-blur-styles';
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = `
    .gradual-blur { pointer-events: none; }
    .gradual-blur-parent { overflow: hidden; }
    .gradual-blur-inner { position: relative; width: 100%; height: 100%; pointer-events: none; }
    .gradual-blur { isolation: isolate; }
    @supports not (backdrop-filter: blur(1px)) {
      .gradual-blur-inner > div { background: rgba(0,0,0,0.25); opacity: 0.5; }
    }
  `;
  document.head.appendChild(el);
};
if (typeof document !== 'undefined') injectStyles();

// ── Curve functions ─────────────────────────────────────────────
const CURVES = {
  linear:     p => p,
  bezier:     p => p * p * (3 - 2 * p),
  'ease-in':  p => p * p,
  'ease-out': p => 1 - Math.pow(1 - p, 2),
};

const DEFAULT = {
  position: 'bottom', strength: 2, height: '6rem', divCount: 6,
  exponential: false, zIndex: 10, opacity: 1, curve: 'bezier',
  target: 'parent', className: '', style: {},
};

function GradualBlur(rawProps) {
  const props = useMemo(() => ({ ...DEFAULT, ...rawProps }), [rawProps]);
  const containerRef = useRef(null);

  const blurDivs = useMemo(() => {
    const { divCount, strength, curve, exponential, position, opacity } = props;
    const curveF = CURVES[curve] || CURVES.bezier;
    const increment = 100 / divCount;
    const dir = { top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right' }[position] || 'to bottom';
    const divs = [];

    for (let i = 1; i <= divCount; i++) {
      const progress = curveF(i / divCount);
      const blur = exponential
        ? Math.pow(2, progress * 4) * 0.0625 * strength
        : 0.0625 * (progress * divCount + 1) * strength;

      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      divs.push(
        <div
          key={i}
          style={{
            position: 'absolute', inset: 0,
            maskImage: `linear-gradient(${dir}, ${gradient})`,
            WebkitMaskImage: `linear-gradient(${dir}, ${gradient})`,
            backdropFilter: `blur(${blur.toFixed(3)}rem)`,
            WebkitBackdropFilter: `blur(${blur.toFixed(3)}rem)`,
            opacity,
          }}
        />
      );
    }
    return divs;
  }, [props]);

  const containerStyle = useMemo(() => {
    const { position, height, zIndex, target, style } = props;
    const isVertical = ['top', 'bottom'].includes(position);
    const base = { position: 'absolute', pointerEvents: 'none', zIndex, ...style };
    if (isVertical) {
      Object.assign(base, { height, width: '100%', left: 0, right: 0, [position]: 0 });
    } else {
      Object.assign(base, { width: height, height: '100%', top: 0, bottom: 0, [position]: 0 });
    }
    return base;
  }, [props]);

  return (
    <div
      ref={containerRef}
      className={`gradual-blur gradual-blur-parent ${props.className}`}
      style={containerStyle}
    >
      <div className="gradual-blur-inner">{blurDivs}</div>
    </div>
  );
}

const GradualBlurMemo = React.memo(GradualBlur);
GradualBlurMemo.displayName = 'GradualBlur';
export default GradualBlurMemo;
