export const CLOCK_FONT_OPTIONS = [
  { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:wght@700' },
  { id: 'oswald', name: 'Oswald', family: "'Oswald', sans-serif", google: 'Oswald:wght@600;700' },
  { id: 'cormorant', name: 'Cormorant Garamond', family: "'Cormorant Garamond', Georgia, serif", google: 'Cormorant+Garamond:wght@600;700' },
  { id: 'jetbrains', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace", google: 'JetBrains+Mono:wght@400;500;600;700;800' },
  { id: 'caveat', name: 'Caveat', family: "'Caveat', cursive", google: 'Caveat:wght@700' },
  { id: 'sf-apple', name: 'SF Pro (Apple)', family: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', sans-serif", google: null },
];

export const TEXT_FONT_OPTIONS = [
  { id: 'inter', name: 'Inter', family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", google: 'Inter:wght@400;500;600;700;800' },
  ...CLOCK_FONT_OPTIONS,
];

export const CLOCK_FONT_FAMILIES = CLOCK_FONT_OPTIONS.map((option) => option.family);
export const TYPOGRAPHY_STORAGE_KEY = 'twocode-typography-preferences';
export const CLOCK_STORAGE_KEY = 'twocode-clock-preferences';
export const CODE_FONT_FAMILY = "'JetBrains Mono', monospace";

export function normalizeFontIndex(value, count, fallback = 0) {
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 && index < count ? index : fallback;
}

export function readTypographyPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(TYPOGRAPHY_STORAGE_KEY) || '{}');
    return { textFontIndex: normalizeFontIndex(stored.textFontIndex, TEXT_FONT_OPTIONS.length, 0) };
  } catch {
    return { textFontIndex: 0 };
  }
}

export function applyTypographyTokens({ textFontIndex = 0, numberFontIndex = 3 } = {}) {
  if (typeof document === 'undefined') return;
  const text = TEXT_FONT_OPTIONS[normalizeFontIndex(textFontIndex, TEXT_FONT_OPTIONS.length, 0)];
  const number = CLOCK_FONT_OPTIONS[normalizeFontIndex(numberFontIndex, CLOCK_FONT_OPTIONS.length, 3)];
  const root = document.documentElement;
  root.style.setProperty('--font-family-ui', text.family);
  root.style.setProperty('--font-family-display', text.family);
  root.style.setProperty('--font-family-body', text.family);
  root.style.setProperty('--font-family-support', text.family);
  root.style.setProperty('--font-family-label', text.family);
  root.style.setProperty('--font-family-code', CODE_FONT_FAMILY);
  root.style.setProperty('--font-family-number', number.family);
  root.style.setProperty('--clock-number-font', number.family);
  root.dataset.textFont = text.id;
  root.dataset.numberFont = number.id;
}

export function loadTypographyFonts() {
  if (typeof document === 'undefined') return;
  const families = [...new Set([...TEXT_FONT_OPTIONS, ...CLOCK_FONT_OPTIONS].map(({ google }) => google).filter(Boolean))];
  if (!document.querySelector('link[data-twocode-font-preconnect]')) {
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://fonts.googleapis.com';
    preconnect.dataset.twocodeFontPreconnect = 'true';
    document.head.appendChild(preconnect);
    const fontsPreconnect = document.createElement('link');
    fontsPreconnect.rel = 'preconnect';
    fontsPreconnect.href = 'https://fonts.gstatic.com';
    fontsPreconnect.crossOrigin = 'anonymous';
    fontsPreconnect.dataset.twocodeFontPreconnect = 'true';
    document.head.appendChild(fontsPreconnect);
  }
  if (document.querySelector('link[data-twocode-fonts]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${families.map((family) => `family=${family}`).join('&')}&display=swap`;
  link.dataset.twocodeFonts = 'true';
  document.head.appendChild(link);
}

export function initializeTypography() {
  loadTypographyFonts();
  let clockFontIndex = 3;
  try {
    clockFontIndex = normalizeFontIndex(JSON.parse(localStorage.getItem(CLOCK_STORAGE_KEY) || '{}').fontIndex, CLOCK_FONT_OPTIONS.length, 3);
  } catch { /* Keep the default numeric font. */ }
  applyTypographyTokens({ ...readTypographyPreferences(), numberFontIndex: clockFontIndex });
}
