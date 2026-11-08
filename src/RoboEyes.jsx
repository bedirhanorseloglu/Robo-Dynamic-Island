import React, { useState, useEffect, useRef } from 'react';
import { playRoboSound } from './sounds';

export default function RoboEyes({ mood = 'normal', onPoke, size = 'normal' }) {
  const [blink, setBlink] = useState(false);
  const [wakePhase, setWakePhase] = useState('closed'); // 'closed' | 'flutter' | 'look-left' | 'look-right' | 'happy' | 'done'
  const [lookOffset, setLookOffset] = useState({ x: 0, y: 0 });
  const [pokeCount, setPokeCount] = useState(0);
  const [isDizzy, setIsDizzy] = useState(false);
  const [idleAction, setIdleAction] = useState('');
  const containerRef = useRef(null);
  const blinkTimerRef = useRef(null);
  const pokeTimerRef = useRef(null);
  const lastLookUpdateRef = useRef(0);

  // Startup wake-up animation sequence when Robo first appears
  useEffect(() => {
    const t1 = setTimeout(() => setWakePhase('flutter'), 260);
    const t2 = setTimeout(() => setWakePhase('closed'), 460);
    const t3 = setTimeout(() => setWakePhase('look-left'), 620);
    const t4 = setTimeout(() => setWakePhase('look-right'), 940);
    const t5 = setTimeout(() => setWakePhase('happy'), 1240);
    const t6 = setTimeout(() => setWakePhase('done'), 1750);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, []);

  useEffect(() => () => clearTimeout(pokeTimerRef.current), []);

  // Natural periodic blinking
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = setTimeout(() => setBlink(false), 150);
    }, 3600 + Math.random() * 2200);
    return () => {
      clearInterval(interval);
      clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // Tiny bits of idle personality: an occasional glance, nap, or desk-side dance.
  useEffect(() => {
    let idleTimer;
    let actionTimer;
    let cancelled = false;
    const actions = ['peek', 'sleep', 'dance', 'boop'];
    const schedule = () => {
      idleTimer = setTimeout(() => {
        if (cancelled) return;
        setIdleAction(actions[Math.floor(Math.random() * actions.length)]);
        actionTimer = setTimeout(() => {
          setIdleAction('');
          if (!cancelled) schedule();
        }, 1050);
      }, 6500 + Math.random() * 5000);
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(idleTimer);
      clearTimeout(actionTimer);
    };
  }, []);

  // Subtle eye tracking toward cursor
  useEffect(() => {
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
  }, []);

  const handleClick = (e) => {
    e.stopPropagation();
    const next = pokeCount + 1;
    setPokeCount(next);
    setIdleAction(next % 2 === 0 ? 'dance' : 'boop');
    clearTimeout(pokeTimerRef.current);
    pokeTimerRef.current = setTimeout(() => setIdleAction(''), 900);
    if (next >= 4) {
      setIsDizzy(true);
      playRoboSound('dizzy', true);
      setTimeout(() => {
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
    : wakePhase !== 'done'
    ? `wake-${wakePhase}`
    : normalizedMood === 'normal' && idleAction
    ? `idle-${idleAction}`
    : normalizedMood;

  const scale = size === 'large' ? 1.55 : size === 'small' ? 0.82 : 1;

  const wakeShiftX =
    wakePhase === 'look-left' ? -3.5 : wakePhase === 'look-right' ? 3.5 : lookOffset.x;
  const wakeShiftY = wakePhase === 'closed' ? 1.5 : lookOffset.y;

  const isHeartEyes = activeMood === 'inlove' || activeMood === 'love';

  return (
    <div
      ref={containerRef}
      className={`robo-eyes-wrap ${activeMood}`}
      onClick={handleClick}
      title="Robo"
      style={{
        transform: `scale(${scale}) translate(${wakeShiftX}px, ${wakeShiftY}px)`,
      }}
    >
      <span className="robo-mood-spark" aria-hidden="true" />
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
