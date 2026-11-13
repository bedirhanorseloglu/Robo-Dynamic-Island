import React, { useState, useEffect, useRef } from 'react';
import { playRoboSound } from './sounds';

export default function RoboEyes({ mood = 'normal', reaction = null, active = true, trackCursor = true, onPoke, size = 'normal', batteryPercent, batteryCharging = false }) {
  const [blink, setBlink] = useState(false);
  const [wakePhase, setWakePhase] = useState('closed'); // 'closed' | 'flutter' | 'look-left' | 'look-right' | 'happy' | 'done'
  const [lookOffset, setLookOffset] = useState({ x: 0, y: 0 });
  const [pokeCount, setPokeCount] = useState(0);
  const [isDizzy, setIsDizzy] = useState(false);
  const [pokeAction, setPokeAction] = useState('');
  const containerRef = useRef(null);
  const blinkTimerRef = useRef(null);
  const pokeTimerRef = useRef(null);
  const dizzyTimerRef = useRef(null);
  const lastLookUpdateRef = useRef(0);
  const hasWokenRef = useRef(false);

  // Smoothly open eyes once when a visible Robo instance first becomes active.
  useEffect(() => {
    if (!active || hasWokenRef.current) return undefined;
    const t = setTimeout(() => {
      setWakePhase('done');
      hasWokenRef.current = true;
    }, 260);
    return () => clearTimeout(t);
  }, [active]);

  useEffect(() => () => {
    clearTimeout(pokeTimerRef.current);
    clearTimeout(dizzyTimerRef.current);
  }, []);

  // A single lightweight blink timer runs only for the currently visible Robo instance.
  useEffect(() => {
    if (!active || mood === 'music' || mood === 'dnd-sleep') {
      setBlink(false);
      return undefined;
    }
    const interval = setInterval(() => {
      setBlink(true);
      clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = setTimeout(() => setBlink(false), 150);
    }, 3600 + Math.random() * 2200);
    return () => {
      clearInterval(interval);
      clearTimeout(blinkTimerRef.current);
    };
  }, [active, mood]);

  // Subtle eye tracking toward cursor (disabled in idle to avoid background re-renders)
  useEffect(() => {
    if (!active || !trackCursor) return undefined;
    const handleMove = (e) => {
      if (!containerRef.current) return;
      const now = performance.now();
      if (now - lastLookUpdateRef.current < 40) return;
      lastLookUpdateRef.current = now;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = Math.max(-3.5, Math.min(3.5, (e.clientX - cx) / 70));
      const dy = Math.max(-2.5, Math.min(2.5, (e.clientY - cy) / 70));
      setLookOffset((current) =>
        Math.abs(current.x - dx) < 0.35 && Math.abs(current.y - dy) < 0.35
          ? current
          : { x: dx, y: dy }
      );
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [active]);

  const handleClick = (e) => {
    e.stopPropagation();
    const next = pokeCount + 1;
    setPokeCount(next);
    setPokeAction(next % 2 === 0 ? 'poke-dance' : 'poke-boop');
    clearTimeout(pokeTimerRef.current);
    pokeTimerRef.current = setTimeout(() => setPokeAction(''), 900);
    if (next >= 4) {
      setIsDizzy(true);
      playRoboSound('dizzy', true);
      clearTimeout(dizzyTimerRef.current);
      dizzyTimerRef.current = setTimeout(() => {
        setIsDizzy(false);
        setPokeCount(0);
      }, 3500);
    } else {
      playRoboSound('wink', true);
    }
    if (onPoke) onPoke(next >= 4 ? 'dizzy' : 'wink');
  };

  const normalizedMood = String(mood || 'normal')
    .toLowerCase()
    .replace(/\s+/g, '');

  const activeMood = isDizzy
    ? 'dizzy'
    : normalizedMood === 'music'
    ? 'music'
    : wakePhase !== 'done'
    ? `wake-${wakePhase}`
    : normalizedMood;
  const activeReaction = isDizzy ? '' : pokeAction || (active ? reaction?.name || '' : '');

  const scale = size === 'large' ? 1.55 : size === 'small' ? 0.82 : 1;

  const wakeShiftX =
    wakePhase === 'look-left' ? -3.5 : wakePhase === 'look-right' ? 3.5 : lookOffset.x;
  const wakeShiftY = wakePhase === 'closed' ? 1.5 : lookOffset.y;

  const isHeartEyes = activeMood === 'inlove' || activeMood === 'love';
  const isLowBattery = !batteryCharging && Number.isFinite(batteryPercent) && batteryPercent <= 20;
  const isFocus = activeMood === 'focus-arc' || activeMood === 'focus';
  const isDndSleep = activeMood === 'dnd-sleep';
  const isTurbo = activeMood === 'turbo';
  const isThinking = activeMood === 'thinking' || activeReaction === 'thinking';
  const isBellAlert = activeReaction === 'notification';

  return (
    <div
      ref={containerRef}
      className={`robo-eyes-wrap ${activeMood} ${activeReaction ? `reaction-${activeReaction}` : ''} ${!active ? 'is-inactive' : ''} ${batteryCharging ? 'is-charging' : ''} ${isLowBattery ? 'is-low-battery' : ''}`}
      onClick={handleClick}
      title="Robo"
      style={{
        transform: `scale(${scale}) translate(${wakeShiftX}px, ${wakeShiftY}px)`,
      }}
    >
      <span className="robo-mood-spark" aria-hidden="true" />
      {batteryCharging && (
        <span className="robo-charge-battery" aria-hidden="true" title={`Şarj oluyor · ${batteryPercent}%`}>
          <span
            className="robo-charge-battery-fill"
            style={{ width: `${Math.min(100, Math.max(0, Number(batteryPercent) || 0))}%` }}
          />
        </span>
      )}
      {isLowBattery && (
        <span className="robo-low-battery" aria-hidden="true" title={`Düşük pil · ${batteryPercent}%`}>
          <span className="robo-low-battery-bar" />
        </span>
      )}
      {isFocus && (
        <svg className="robo-prop-glasses" viewBox="0 0 38 14" aria-hidden="true">
          <rect x="1.5" y="2" width="14" height="10" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <rect x="22.5" y="2" width="14" height="10" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M15.5 6.2h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
      {isDndSleep && (
        <span className="robo-prop-sleep" aria-hidden="true">zZ</span>
      )}
      {isThinking && (
        <span className="robo-prop-thinking" aria-hidden="true">
          <i /><i /><i />
        </span>
      )}
      {isBellAlert && (
        <svg className="robo-prop-bell" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 2a4 4 0 0 0-4 4v2.6L2.8 10.4a.6.6 0 0 0 .5.9h9.4a.6.6 0 0 0 .5-.9L12 8.6V6a4 4 0 0 0-4-4zm-1.4 10.5a1.5 1.5 0 0 0 2.8 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {isHeartEyes ? (
        <>
          <span className="robo-heart-eye left">♥</span>
          <span className="robo-heart-eye right">♥</span>
        </>
      ) : (
        <>
          <span className={`robo-eye left ${blink ? 'blinking' : ''} ${activeMood}`} />
          <span className={`robo-eye right ${blink ? 'blinking' : ''} ${activeMood}`} />
        </>
      )}
    </div>
  );
}
