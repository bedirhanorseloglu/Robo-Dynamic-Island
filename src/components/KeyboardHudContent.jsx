import React from 'react';
import { Sunrise } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SPRING_FLUID = { type: 'spring', stiffness: 320, damping: 24, mass: 0.8 };
const SPRING_TEXT = { type: 'spring', stiffness: 380, damping: 26, mass: 0.72 };

const MULTI_COLOR_EFFECTS = new Set([
  'rainbow',
  'colorcycle',
  'zonetest',
  'heatmap',
  'audiospectrum',
]);

function KeyboardMatrixGlyph({ effect, c1, c2 }) {
  const isSpectrum = MULTI_COLOR_EFFECTS.has(effect);
  const gradId = `kb-grad-${effect}`;

  return (
    <svg
      width="26"
      height="18"
      viewBox="0 0 26 18"
      fill="none"
      className={`hud-kb-svg effect-${effect}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          {isSpectrum ? (
            <>
              <stop offset="0%" stopColor="#ff3b7f" />
              <stop offset="35%" stopColor="#ffb800" />
              <stop offset="70%" stopColor="#00e5ff" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor={c1} />
              <stop offset="100%" stopColor={c2} />
            </>
          )}
        </linearGradient>
      </defs>

      {/* Outer keyboard frame */}
      <rect
        x="1"
        y="1"
        width="24"
        height="16"
        rx="4.5"
        stroke={`url(#${gradId})`}
        strokeOpacity="0.85"
        strokeWidth="1.35"
        fill={`url(#${gradId})`}
        fillOpacity="0.12"
      />

      {/* Row 1 keycaps (4 zones) */}
      <rect x="4" y="4.3" width="3.2" height="2.1" rx="0.8" fill={`url(#${gradId})`} className="kb-key kb-z1" />
      <rect x="8.6" y="4.3" width="3.2" height="2.1" rx="0.8" fill={`url(#${gradId})`} className="kb-key kb-z2" />
      <rect x="13.2" y="4.3" width="3.2" height="2.1" rx="0.8" fill={`url(#${gradId})`} className="kb-key kb-z3" />
      <rect x="17.8" y="4.3" width="4.2" height="2.1" rx="0.8" fill={`url(#${gradId})`} className="kb-key kb-z4" />

      {/* Row 2 keycaps */}
      <rect x="4" y="7.9" width="4.2" height="2.1" rx="0.8" fill={`url(#${gradId})`} className="kb-key kb-z2" />
      <rect x="9.6" y="7.9" width="3.2" height="2.1" rx="0.8" fill={`url(#${gradId})`} className="kb-key kb-z3" />
      <rect x="14.2" y="7.9" width="3.2" height="2.1" rx="0.8" fill={`url(#${gradId})`} className="kb-key kb-z4" />
      <rect x="18.8" y="7.9" width="3.2" height="2.1" rx="0.8" fill={`url(#${gradId})`} className="kb-key kb-z1" />

      {/* Spacebar row */}
      <rect x="7.2" y="11.5" width="11.6" height="2.2" rx="1" fill={`url(#${gradId})`} className="kb-key kb-z3" />
    </svg>
  );
}

function AnimatedModeLabel({ kicker, label }) {
  return (
    <div className="hud-kb-copy">
      <span className="hud-kb-kicker">{kicker}</span>
      <span className="hud-kb-dot" aria-hidden="true" />
      <div className="hud-kb-val-wrap">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={label}
            className="hud-kb-val"
            initial={{ y: 10, opacity: 0, filter: 'blur(4px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: -10, opacity: 0, filter: 'blur(4px)' }}
            transition={SPRING_TEXT}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function KeyboardHudContent({ ghelper }) {
  const isAura = ghelper?.category === 'aura';

  if (isAura) {
    const effect = ghelper.effectType || 'static';
    const c1 = ghelper.color || '#e2e8f0';
    const c2 = ghelper.color2 || c1;
    const label = ghelper.valueText || 'Sabit';

    return (
      <motion.div
        className={`hud-kb-modern is-aura effect-${effect}`}
        style={{
          '--kb-color': c1,
          '--kb-color2': c2,
        }}
        initial={{ opacity: 0, scale: 0.94, filter: 'blur(4px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={SPRING_FLUID}
      >
        {/* Subtle one-shot specular sweep on mode change */}
        <motion.span
          key={`sheen-${effect}-${label}`}
          className="hud-kb-sheen"
          initial={{ x: '-110%', opacity: 0 }}
          animate={{ x: '160%', opacity: [0, 0.55, 0] }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
        />

        <div className="hud-kb-left">
          <motion.div
            key={`${effect}-${c1}`}
            className="hud-kb-badge"
            initial={{ scale: 0.8, rotate: -5, opacity: 0.5 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={SPRING_FLUID}
          >
            <KeyboardMatrixGlyph effect={effect} c1={c1} c2={c2} />
          </motion.div>

          <AnimatedModeLabel kicker="Klavye" label={label} />
        </div>

        {/* Right: Minimal live aura lightbar */}
        <div className="hud-kb-aura-pill" aria-hidden="true">
          <span className="hud-kb-aura-bar" />
        </div>
      </motion.div>
    );
  }

  // Backlight brightness levels (0..3)
  const level = typeof ghelper?.level === 'number' ? Math.max(0, Math.min(3, ghelper.level)) : 0;
  const isOff = level === 0;
  const label = ghelper?.valueText || (isOff ? 'Kapalı' : `${level}/3`);
  const iconScale = isOff ? 0.9 : 0.95 + level * 0.035;

  return (
    <motion.div
      className={`hud-kb-modern is-backlight level-${level} ${isOff ? 'is-off' : ''}`}
      initial={{ opacity: 0, scale: 0.94, filter: 'blur(4px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={SPRING_FLUID}
    >
      <motion.span
        key={`sheen-bl-${level}`}
        className="hud-kb-sheen"
        initial={{ x: '-110%', opacity: 0 }}
        animate={{ x: '160%', opacity: [0, 0.45, 0] }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden="true"
      />

      <div className="hud-kb-left">
        <motion.div
          key={level}
          className="hud-kb-badge is-backlight-badge"
          initial={{ scale: iconScale - 0.14, opacity: 0.5 }}
          animate={{ scale: iconScale, opacity: isOff ? 0.48 : 1 }}
          transition={SPRING_FLUID}
        >
          <Sunrise size={17} strokeWidth={2} className="hud-kb-glyph" />
        </motion.div>

        <AnimatedModeLabel kicker="Işık" label={label} />
      </div>

      {/* Right: 3-step segmented brightness pill */}
      <div className="hud-kb-steps" aria-hidden="true">
        {[1, 2, 3].map((step) => {
          const active = level >= step;
          return (
            <motion.span
              key={step}
              className={`hud-kb-step ${active ? 'is-active' : ''}`}
              initial={false}
              animate={{
                scaleY: active ? 1 : 0.72,
                opacity: active ? 1 : 0.24,
              }}
              transition={SPRING_FLUID}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
