// Web Audio API Synthesizer for TwoCode Robo Voices, Emotions & Notification Sounds

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playToneGlide(ctx, { startFreq, endFreq, startTime, duration, type = 'sine', peakGain = 0.14 }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, startTime);
  if (endFreq && endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), startTime + duration);
  }
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.02, duration * 0.25));
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

export function playRoboSound(kind = 'happy', enabled = true) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const k = String(kind || 'happy').toLowerCase().replace(/\s+/g, '');

  if (k === 'happy' || k === 'pet') {
    playToneGlide(ctx, { startFreq: 520, endFreq: 680, startTime: now, duration: 0.075, type: 'sine', peakGain: 0.14 });
    playToneGlide(ctx, { startFreq: 700, endFreq: 980, startTime: now + 0.08, duration: 0.11, type: 'triangle', peakGain: 0.13 });
  } else if (k === 'inlove' || k === 'love') {
    playToneGlide(ctx, { startFreq: 440, endFreq: 587, startTime: now, duration: 0.09, type: 'sine', peakGain: 0.12 });
    playToneGlide(ctx, { startFreq: 587, endFreq: 880, startTime: now + 0.09, duration: 0.14, type: 'sine', peakGain: 0.14 });
    playToneGlide(ctx, { startFreq: 880, endFreq: 1174, startTime: now + 0.22, duration: 0.16, type: 'triangle', peakGain: 0.11 });
  } else if (k === 'surprised') {
    playToneGlide(ctx, { startFreq: 360, endFreq: 1020, startTime: now, duration: 0.12, type: 'sine', peakGain: 0.15 });
    playToneGlide(ctx, { startFreq: 980, endFreq: 860, startTime: now + 0.13, duration: 0.06, type: 'sine', peakGain: 0.1 });
  } else if (k === 'curious') {
    playToneGlide(ctx, { startFreq: 410, endFreq: 460, startTime: now, duration: 0.07, type: 'triangle', peakGain: 0.12 });
    playToneGlide(ctx, { startFreq: 480, endFreq: 790, startTime: now + 0.08, duration: 0.14, type: 'sine', peakGain: 0.14 });
  } else if (k === 'focused') {
    playToneGlide(ctx, { startFreq: 640, endFreq: 660, startTime: now, duration: 0.055, type: 'triangle', peakGain: 0.12 });
    playToneGlide(ctx, { startFreq: 820, endFreq: 840, startTime: now + 0.07, duration: 0.07, type: 'triangle', peakGain: 0.13 });
  } else if (k === 'wink') {
    playToneGlide(ctx, { startFreq: 560, endFreq: 920, startTime: now, duration: 0.085, type: 'sine', peakGain: 0.14 });
  } else if (k === 'sad') {
    playToneGlide(ctx, { startFreq: 480, endFreq: 350, startTime: now, duration: 0.16, type: 'sine', peakGain: 0.13 });
    playToneGlide(ctx, { startFreq: 340, endFreq: 240, startTime: now + 0.17, duration: 0.22, type: 'sine', peakGain: 0.11 });
  } else if (k === 'dizzy') {
    for (let i = 0; i < 5; i++) {
      playToneGlide(ctx, {
        startFreq: i % 2 === 0 ? 430 : 620,
        endFreq: i % 2 === 0 ? 620 : 430,
        startTime: now + i * 0.05,
        duration: 0.048,
        type: 'sine',
        peakGain: 0.12,
      });
    }
  } else if (k === 'sleepy') {
    playToneGlide(ctx, { startFreq: 350, endFreq: 210, startTime: now, duration: 0.28, type: 'sine', peakGain: 0.1 });
  } else if (k === 'wave' || k === 'startup') {
    playToneGlide(ctx, { startFreq: 490, endFreq: 660, startTime: now, duration: 0.08, type: 'sine', peakGain: 0.13 });
    playToneGlide(ctx, { startFreq: 620, endFreq: 920, startTime: now + 0.095, duration: 0.13, type: 'triangle', peakGain: 0.14 });
  } else if (k === 'tap' || k === 'click') {
    playToneGlide(ctx, { startFreq: 520, endFreq: 680, startTime: now, duration: 0.032, type: 'sine', peakGain: 0.07 });
  }
}

export function playNotifSound(soundName = 'Ding', enabled = true) {
  if (!enabled || !soundName || soundName === 'None') return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  switch (soundName) {
    case 'Ding':
      playToneGlide(ctx, { startFreq: 880, endFreq: 880, startTime: now, duration: 0.36, type: 'sine', peakGain: 0.16 });
      playToneGlide(ctx, { startFreq: 1760, endFreq: 1760, startTime: now, duration: 0.22, type: 'sine', peakGain: 0.07 });
      break;
    case 'Pling':
      playToneGlide(ctx, { startFreq: 987.77, endFreq: 987.77, startTime: now, duration: 0.08, type: 'triangle', peakGain: 0.14 });
      playToneGlide(ctx, { startFreq: 1318.5, endFreq: 1318.5, startTime: now + 0.075, duration: 0.28, type: 'sine', peakGain: 0.16 });
      break;
    case 'Pop':
      playToneGlide(ctx, { startFreq: 260, endFreq: 690, startTime: now, duration: 0.065, type: 'sine', peakGain: 0.18 });
      break;
    case 'Warning':
      playToneGlide(ctx, { startFreq: 540, endFreq: 520, startTime: now, duration: 0.11, type: 'sawtooth', peakGain: 0.1 });
      playToneGlide(ctx, { startFreq: 430, endFreq: 410, startTime: now + 0.13, duration: 0.16, type: 'sawtooth', peakGain: 0.1 });
      break;
    case 'Party':
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        playToneGlide(ctx, {
          startFreq: freq,
          endFreq: freq,
          startTime: now + idx * 0.065,
          duration: idx === 3 ? 0.26 : 0.07,
          type: 'triangle',
          peakGain: 0.14,
        });
      });
      break;
    default:
      playToneGlide(ctx, { startFreq: 880, endFreq: 880, startTime: now, duration: 0.25, type: 'sine', peakGain: 0.14 });
      break;
  }
}
