// Procedural charcoal sketch SVG matching the "Alçalmak - EGE!" cover aesthetic from Screenshot 1
const sketchSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <radialGradient id="bg" cx="40%" cy="45%" r="70%">
      <stop offset="0%" stop-color="#6e6b66"/>
      <stop offset="55%" stop-color="#474542"/>
      <stop offset="100%" stop-color="#1e1d1b"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" result="noise"/>
      <feColorMatrix type="matrix" values="0.3 0 0 0 0  0 0.3 0 0 0  0 0 0.3 0 0  0 0 0 0.28 0" in="noise" result="coloredNoise"/>
      <feComposite operator="in" in2="SourceGraphic"/>
    </filter>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <!-- Textured wall cracks & charcoal lines -->
  <path d="M30 140 Q95 160 130 220 T220 310" stroke="#222" stroke-width="2" fill="none" opacity="0.7"/>
  <path d="M180 40 Q150 120 190 200 T140 360" stroke="#292826" stroke-width="1.5" fill="none" opacity="0.6"/>
  <!-- Sketchy "ALÇALMAK" hand-scrawled text at top-left -->
  <g stroke="#e8e4dc" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
    <path d="M18 38 L28 10 L38 38 M21 28 L35 28"/>
    <path d="M44 10 L44 36 L58 36"/>
    <path d="M78 14 C64 10 62 36 78 35 M71 36 L69 43"/>
    <path d="M86 36 L95 10 L104 36 M89 27 L101 27"/>
    <path d="M110 10 L110 36 L122 36"/>
    <path d="M128 36 L132 10 L141 26 L150 10 L154 36"/>
    <path d="M160 36 L169 10 L178 36 M163 27 L175 27"/>
    <path d="M185 10 L185 36 M198 10 L185 24 L199 38"/>
  </g>
  <!-- Sketch face top right -->
  <g stroke="#232220" stroke-width="2.2" fill="none" opacity="0.75">
    <ellipse cx="290" cy="35" rx="46" ry="38"/>
    <circle cx="274" cy="28" r="7"/>
    <circle cx="305" cy="28" r="7"/>
    <path d="M275 52 Q290 60 306 50"/>
  </g>
  <!-- Sketch face middle right -->
  <g stroke="#d8d4cc" stroke-width="1.6" fill="none" opacity="0.65">
    <path d="M265 130 C250 110 335 110 325 135 C332 175 320 220 295 228 C270 220 258 175 265 130 Z"/>
    <path d="M262 128 Q280 105 295 120 Q312 105 328 128"/>
  </g>
  <g stroke="#22201e" stroke-width="2.2" fill="none" opacity="0.8">
    <ellipse cx="282" cy="158" rx="8" ry="14"/>
    <ellipse cx="306" cy="158" rx="8" ry="14"/>
    <ellipse cx="294" cy="200" rx="10" ry="15" fill="#1e1c1a"/>
  </g>
  <!-- Sketch character bottom left -->
  <g stroke="#e5e0d8" stroke-width="1.8" fill="none" opacity="0.78">
    <path d="M72 248 L60 225 M82 245 L75 220 M148 250 L166 232 M152 258 L174 252"/>
    <path d="M75 265 Q115 235 150 265"/>
    <path d="M78 265 Q75 330 112 350 Q148 330 146 265"/>
  </g>
  <g stroke="#23211f" stroke-width="2.2" fill="none" opacity="0.8">
    <path d="M90 292 Q100 298 108 292"/>
    <path d="M122 292 Q132 298 140 292"/>
    <path d="M113 295 L108 320 L118 322"/>
    <path d="M104 335 Q115 342 125 335"/>
  </g>
</svg>`;

export const DEMO_ALBUM_ART = `data:image/svg+xml;utf8,${encodeURIComponent(sketchSvg)}`;

export const DEMO_TRACK = {
  hasSession: true,
  isDemo: true,
  title: 'Alçalmak',
  artist: 'EGE!',
  album: 'Alçalmak - Single',
  duration: 146, // 0:39 + 1:47 = 2:26 (146 sec) matching Screenshot 1!
  position: 39,
  isPlaying: true,
  thumbnail: DEMO_ALBUM_ART,
  lyrics: [
    { time: 0, text: 'Gece çöker üstüme sessizce yine' },
    { time: 8, text: 'Karanlık sokaklarda yankılanır sesim' },
    { time: 16, text: 'Kendimden kaçarken hep sana tutuldum' },
    { time: 24, text: 'Yoruldum artık aynı döngüden' },
    { time: 31, text: 'Bırakmam dediğim ne varsa kül oldu' },
    { time: 36, text: 'Seninle konuşmak şeytanımla anlaşmak gibi' },
    { time: 43, text: 'Durur bir beyliğim masamda' },
    { time: 50, text: 'Gözlerin keskin bir bıçak sırtı gecede' },
    { time: 58, text: 'Alçalmak değil bu, dibe vurmak seninle' },
    { time: 66, text: 'Her cümlen zehir, her susuşun yangın' },
    { time: 74, text: 'Seninle konuşmak şeytanımla anlaşmak gibi' },
    { time: 82, text: 'Durur bir beyliğim masamda' },
    { time: 90, text: 'Küllerimden doğarım sanma bu sefer' },
    { time: 98, text: 'Saat dört bir geçe, yine aynı yerdeyim' },
    { time: 108, text: 'Seninle konuşmak şeytanımla anlaşmak gibi' },
    { time: 118, text: 'Durur bir beyliğim masamda' },
    { time: 128, text: 'Söner ışıklar, kalır gölgeler...' },
  ],
};

// Web Audio API sound effects (TwoCode Chime & Ambient Sounds)
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playChime(type = 'success') {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes =
      type === 'approval'
        ? [523.25, 659.25, 783.99] // C5 - E5 - G5 (curious ascending)
        : type === 'poke'
        ? [440, 392]
        : [587.33, 880.0]; // D5 - A5 (warm completion chime)

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      gain.gain.setValueAtTime(0.001, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.11 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.11 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.48);
    });
  } catch {}
}

let ambientNode = null;
let ambientGain = null;

export function toggleAmbientSound(mode) {
  try {
    if (ambientNode) {
      ambientNode.stop();
      ambientNode.disconnect();
      ambientNode = null;
    }
    if (!mode || mode === 'off') return false;

    const ctx = getAudioContext();
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (mode === 'brown') {
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      } else {
        // Pink / Rain texture
        output[i] = (lastOut + 0.08 * white) / 1.08;
        lastOut = output[i];
        output[i] *= 1.8;
      }
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = mode === 'rain' ? 950 : 420;

    ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.07;

    whiteNoise.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(ctx.destination);
    whiteNoise.start(0);
    ambientNode = whiteNoise;
    return true;
  } catch {
    return false;
  }
}
