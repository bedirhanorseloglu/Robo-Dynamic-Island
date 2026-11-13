import React from 'react';
import { CLOCK_FONT_FAMILIES } from './typography';
export { CLOCK_FONT_FAMILIES } from './typography';

export default function HeroClock({
  timeStr = '04:24',
  suffix = '',
  fontIndex = 3,
  color = '#ffffff',
  scale = 1,
  onClick,
  size = 'hero',
}) {
  const chars = timeStr.split('');
  const fontFamily = CLOCK_FONT_FAMILIES[fontIndex] || CLOCK_FONT_FAMILIES[3];
  const isDottedMono = fontIndex === 3;

  return (
    <div
      className={`hero-clock ${size === 'focus' ? 'focus-size' : ''} ${
        isDottedMono ? 'dotted-mono' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      } : undefined}
      aria-label={onClick ? `Saat ${timeStr} ${suffix}. Saat görünümünü özelleştir` : undefined}
      title={onClick ? 'Font and colour' : undefined}
      style={{
        fontFamily,
        color,
        fontSize: size === 'focus' ? undefined : `clamp(${Math.round(92 * scale)}px, ${(16.2 * scale).toFixed(2)}vw, ${Math.round(148 * scale)}px)`,
      }}
    >
      {chars.map((ch, idx) => {
        if (ch === ':') {
          return (
            <span key={idx} className="hero-clock-colon">
              <i style={{ background: color }} />
              <i style={{ background: color }} />
            </span>
          );
        }
        return (
          <span
            key={idx}
            className={`hero-clock-digit ${ch === '0' && isDottedMono ? 'is-zero' : ''}`}
          >
            {ch}
          </span>
        );
      })}
      {suffix && <span className="hero-clock-suffix">{suffix}</span>}
    </div>
  );
}
