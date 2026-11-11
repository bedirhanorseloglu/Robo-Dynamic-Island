const fs = require('fs');
const path = require('path');
const net = require('net');
const { execFile } = require('child_process');

let stringsMap = null;
function getStringsMap() {
  if (!stringsMap) {
    try {
      stringsMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'ghelper-toast-strings.json'), 'utf8'));
    } catch {
      stringsMap = { exact: {}, prefixes: {} };
    }
  }
  return stringsMap;
}

function resolveGHelperToast(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const normalized = raw.normalize('NFC').toLocaleLowerCase('en-US');
  const map = getStringsMap();

  let category = 'generic';
  if (map.exact[normalized] && map.exact[normalized].length > 0) {
    category = map.exact[normalized][0];
  } else {
    for (const [prefix, cats] of Object.entries(map.prefixes || {})) {
      if (normalized.startsWith(prefix)) {
        category = cats[0];
        break;
      }
    }
  }

  // Fallback heuristics
  if (category === 'generic') {
    if (/%$/.test(raw) || /parlakl|bright/i.test(raw)) category = 'brightness';
    else if (/backlight|klavye|yüksek|düşük|orta/i.test(raw)) category = 'backlight';
    else if (/mic|sessiz|mute|unmute|ses/i.test(raw)) category = /unmute|açık/i.test(raw) ? 'mic' : 'micMute';
    else if (/touchpad|touchscreen/i.test(raw)) category = 'touchpad';
    else if (/mode|mod|silent|turbo|balanced|dengeli|sessiz/i.test(raw)) category = 'mode';
    else if (/fn.?lock/i.test(raw)) category = 'fnlock';
    else if (/fps|limit/i.test(raw)) category = 'fps';
    else if (/gamepad|mouse|controller/i.test(raw)) category = 'controller';
    else if (/camera|kamera/i.test(raw)) category = 'camera';
    else if (/aura|zone|rainbow|gradient|ambient|breathe|heatmap|color|renk|gökkuşağı|gradyan|ortam/i.test(raw)) category = 'aura';
  }

  const categoryLabels = {
    backlight: 'Klavye Işığı',
    aura: 'Laptop Klavyesi',
    micMute: 'Mikrofon',
    mic: 'Mikrofon',
    mode: 'Performans Modu',
    gpu: 'GPU Modu',
    fnlock: 'Fn Kilidi',
    touchpad: 'Dokunmatik Yüzey',
    display: 'Ekran Modu',
    overlay: 'Ekran Göstergesi',
    fps: 'FPS Limiti',
    controller: 'Kontrolcü',
    camera: 'Kamera',
    brightness: 'Ekran Parlaklığı',
    generic: 'G-Helper',
  };

  const categoryIcons = {
    backlight: 'backlight',
    aura: 'keyboard',
    micMute: 'mic-mute',
    mic: 'mic',
    mode: 'mode',
    gpu: 'gpu',
    fnlock: 'lock',
    touchpad: 'touchpad',
    display: 'display',
    overlay: 'layers',
    fps: 'gauge',
    controller: 'gamepad',
    camera: 'camera',
    brightness: 'sun',
    generic: 'ghelper',
  };

  const res = {
    raw,
    label: categoryLabels[category] || 'G-Helper',
    icon: categoryIcons[category] || 'ghelper',
    category,
    valueText: raw,
  };

  if (category === 'aura') {
    const bridge = new GHelperBridgeClient();
    const aura = bridge.getAuraDetails(raw);
    Object.assign(res, aura);
  } else if (category === 'mode') {
    let modeIndex = 0;
    if (/turbo/i.test(raw)) modeIndex = 1;
    else if (/sessiz|silent/i.test(raw)) modeIndex = 2;
    else if (/dengeli|balanced/i.test(raw)) modeIndex = 0;
    const colors = { 0: '#38a6ff', 1: '#ff453a', 2: '#64d2ff' };
    const icons = { 0: 'car', 1: 'rocket', 2: 'bike' };
    res.modeIndex = modeIndex;
    res.color = colors[modeIndex] || '#38a6ff';
    res.iconName = icons[modeIndex] || 'car';
  } else if (category === 'gpu') {
    let gpuIndex = 0;
    if (/eko|eco/i.test(raw)) gpuIndex = 0;
    else if (/standart|standard/i.test(raw)) gpuIndex = 1;
    else if (/ultimate/i.test(raw)) gpuIndex = 2;
    else if (/optimize|auto/i.test(raw)) gpuIndex = 3;
    const colors = { 0: '#00b874', 1: '#0a84ff', 2: '#ff453a', 3: '#ffd60a' };
    const icons = { 0: 'leaf', 1: 'flower', 2: 'gamepad', 3: 'rotate-cw' };
    res.gpuIndex = gpuIndex;
    res.color = colors[gpuIndex] || '#00b874';
    res.iconName = icons[gpuIndex] || 'leaf';
  }

  return res;
}

function readGHelperStatus() {
  try {
    const cfgPath = path.join(process.env.APPDATA || '', 'GHelper', 'config.json');
    if (!fs.existsSync(cfgPath)) return null;
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const json = JSON.parse(raw);

    const perfMode = typeof json.performance_mode === 'number' ? json.performance_mode : 0;
    const perfNames = { 0: 'Dengeli', 1: 'Turbo', 2: 'Sessiz' };
    const perfName = perfNames[perfMode] || `Mod ${perfMode}`;

    let gpuMode = typeof json.gpu_mode === 'number' ? json.gpu_mode : 0;
    if (json.gpu_auto === 1) {
      gpuMode = 3;
    }
    const gpuNames = { 0: 'Eko', 1: 'Standart', 2: 'Ultimate', 3: 'Optimize' };
    const gpuName = gpuNames[gpuMode] || `GPU ${gpuMode}`;

    return {
      performanceMode: perfMode,
      performanceName: perfName,
      gpuMode,
      gpuName,
      gpuAuto: json.gpu_auto === 1,
    };
  } catch {
    return null;
  }
}

class GHelperBridgeClient {
  constructor(options = {}) {
    this.pipeName = options.pipeName || 'twocode-ghelper-bridge';
    this.pipePath = `\\\\.\\pipe\\${this.pipeName}`;
    this.onToast = options.onToast || (() => {});
    this.onStatus = options.onStatus || (() => {});
    this.server = null;
    this.activeSocket = null;
    this.isListening = false;
    this.logInterval = null;
    this.dirWatcher = null;
    this.lastLogSize = 0;
    this.lastDispatchedToastAt = 0;
    this.cachedAuraColor = null;
    this.lastStatus = null;

    // Fast-tracked internal state for ZERO-LATENCY instant UI response
    this.currentBacklight = 3;
    this.currentMode = 0; // 0: Dengeli, 1: Turbo, 2: Sessiz
    this.currentMicMuted = false;
    this.lastBacklightAt = 0;
    this.lastAutoWakeAt = 0;
    this.lastAuraKeyAt = 0;
  }

  intToHex(num) {
    if (typeof num !== 'number') return null;
    const unsigned = num >>> 0;
    const r = (unsigned >> 16) & 0xff;
    const g = (unsigned >> 8) & 0xff;
    const b = unsigned & 0xff;
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  }

  checkConfigStatus() {
    const status = readGHelperStatus();
    if (!status) return;
    if (
      !this.lastStatus ||
      this.lastStatus.performanceMode !== status.performanceMode ||
      this.lastStatus.gpuMode !== status.gpuMode ||
      this.lastStatus.gpuAuto !== status.gpuAuto
    ) {
      this.lastStatus = status;
      this.currentMode = status.performanceMode;
      if (typeof this.onStatus === 'function') {
        this.onStatus(status);
      }
    }
  }

  getGHelperStatus() {
    if (!this.lastStatus) {
      this.lastStatus = readGHelperStatus();
    }
    return this.lastStatus;
  }

  getAuraConfig() {
    let color1 = '#af0000';
    let color2 = '#ff8000';
    try {
      const cfgPath = path.join(process.env.APPDATA || '', 'GHelper', 'config.json');
      if (fs.existsSync(cfgPath)) {
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        if (typeof cfg.aura_color === 'number') color1 = this.intToHex(cfg.aura_color) || color1;
        if (typeof cfg.aura_color2 === 'number') color2 = this.intToHex(cfg.aura_color2) || color2;
      }
    } catch {}
    if (this.cachedAuraColor) color1 = this.cachedAuraColor;
    return { color1, color2 };
  }

  getAuraDetails(rawMode) {
    const { color1, color2 } = this.getAuraConfig();
    const mode = String(rawMode || '').toUpperCase();

    // 1. Color Cycle (360° Hue Rotation)
    if (mode.includes('COLORCYCLE') || mode.includes('DÖNGÜ') || mode.includes('DONGU')) {
      return {
        color: '#00e5ff',
        color2: '#ff007f',
        effectType: 'colorcycle',
        gradient: 'linear-gradient(135deg, #00e5ff, #7928ca, #ff007f)',
      };
    }
    // 2. Rainbow (Liquid Spectrum Stream)
    if (mode.includes('RAINBOW') || mode.includes('GÖKKUŞAĞI') || mode.includes('GOKKUSAGI')) {
      return {
        color: '#00e5ff',
        color2: '#ff007f',
        effectType: 'rainbow',
        gradient: 'linear-gradient(135deg, #ff0055, #ff9900, #ffee00, #00ff66, #00bbff, #7700ff)',
      };
    }
    // 3. Gradient (Dual-Tone Shift)
    if (mode.includes('GRADIENT') || mode.includes('GRADYAN')) {
      return {
        color: color1,
        color2: color2,
        effectType: 'gradient',
        gradient: `linear-gradient(135deg, ${color1}, ${color2})`,
      };
    }
    // 4. Ambient (Screen Mirror Drift)
    if (mode.includes('AMBIENT') || mode.includes('ORTAM')) {
      return {
        color: '#00c6ff',
        color2: '#4facfe',
        effectType: 'ambient',
        gradient: 'linear-gradient(135deg, #00c6ff, #0072ff, #4facfe, #00f2fe)',
      };
    }
    // 5. Nefes / Breathe (Organic Pulsing Luma)
    if (mode.includes('BREATHE') || mode.includes('NEFES')) {
      return {
        color: color1,
        color2: color1,
        effectType: 'breathe',
        gradient: `linear-gradient(135deg, ${color1}, ${color1})`,
      };
    }
    // 6. Flaş / Strobe (High-Energy Flash)
    if (mode.includes('FLASH') || mode.includes('FLAŞ') || mode.includes('FLAS') || mode.includes('STROBE')) {
      return {
        color: color1,
        color2: '#ffffff',
        effectType: 'flash',
        gradient: `linear-gradient(135deg, ${color1}, #ffffff)`,
      };
    }
    // 7. Heatmap (Cold Blue -> Cyan -> Green -> Amber -> Red)
    if (mode.includes('HEATMAP') || mode.includes('CPUTEMP') || mode.includes('ISI')) {
      return {
        color: '#ff3b30',
        color2: '#007aff',
        effectType: 'heatmap',
        gradient: 'linear-gradient(135deg, #007aff, #34c759, #ffcc00, #ff3b30)',
      };
    }
    // 8. GPU Mode (Nvidia Green to Cyber Teal)
    if (mode.includes('GPUMODE') || mode.includes('GPU MODE')) {
      return {
        color: '#76b900',
        color2: '#00e5ff',
        effectType: 'gpumode',
        gradient: 'linear-gradient(135deg, #76b900, #00e5ff)',
      };
    }
    // 9. Battery (Status Pulse)
    if (mode.includes('BATTERY') || mode.includes('PİL') || mode.includes('PIL')) {
      return {
        color: '#34c759',
        color2: '#ffd60a',
        effectType: 'battery',
        gradient: 'linear-gradient(135deg, #34c759, #ffd60a)',
      };
    }
    // 10. Audio Pulse (Rhythmic Bass Bounce)
    if (mode.includes('AUDIOPULSE') || mode.includes('AUDIO PULSE') || mode.includes('NABIZ') || mode.includes('NABZ')) {
      return {
        color: '#ff007f',
        color2: '#7928ca',
        effectType: 'audiopulse',
        gradient: 'linear-gradient(135deg, #ff007f, #7928ca)',
      };
    }
    // 11. Audio Spectrum (Fast Equalizer Flow)
    if (mode.includes('AUDIO') || mode.includes('SPECTRUM') || mode.includes('SES')) {
      return {
        color: '#78ffd6',
        color2: '#00c6ff',
        effectType: 'audiospectrum',
        gradient: 'linear-gradient(135deg, #78ffd6, #00c6ff, #ff007f)',
      };
    }
    // 12. Zone Test (Multi-Zone Wave)
    if (mode.includes('ZONETEST') || mode.includes('ZONE TEST') || mode.includes('BÖLGE') || mode.includes('BOLGE') || mode.includes('ZONE')) {
      return {
        color: '#ff3b30',
        color2: '#007aff',
        effectType: 'zonetest',
        gradient: 'linear-gradient(90deg, #ff3b30, #ff9500, #34c759, #007aff, #af52de)',
      };
    }
    // 13. Custom (Dual Accent Sweep)
    if (mode.includes('CUSTOM') || mode.includes('ÖZEL') || mode.includes('OZEL')) {
      return {
        color: color1,
        color2: color2,
        effectType: 'custom',
        gradient: `linear-gradient(135deg, ${color1}, ${color2})`,
      };
    }
    // 14. Sabit / Static (Pure Solid Tone)
    return {
      color: color1,
      color2: color1,
      effectType: 'static',
      gradient: `linear-gradient(135deg, ${color1}, ${color1})`,
    };
  }

  getCurrentAuraColor(rawMode) {
    return this.getAuraDetails(rawMode).color;
  }

  handleLogLine(line) {
    if (!line) return;

    // Track explicit Aura key press
    if (/Key:\s*179\b/i.test(line)) {
      this.lastAuraKeyAt = Date.now();
    }

    // Instant hardware key reaction (G-Helper writes Key: XXX at 0ms before slow ACPI operations)
    if (/Key:\s*174\b/i.test(line)) {
      this.currentMode = (this.currentMode + 1) % 3;
      const modeNames = ['Dengeli', 'Turbo', 'Sessiz'];
      const modeColors = ['#38a6ff', '#ff453a', '#64d2ff'];
      const modeIcons = ['car', 'rocket', 'bike'];
      const val = modeNames[this.currentMode];
      this.lastDispatchedToastAt = Date.now();
      this.onToast({
        raw: val,
        label: 'Performans',
        icon: 'mode',
        valueText: val,
        category: 'mode',
        modeIndex: this.currentMode,
        color: modeColors[this.currentMode],
        iconName: modeIcons[this.currentMode],
      });
      this.checkConfigStatus();
      return;
    }

    if (/Key:\s*124\b/i.test(line)) {
      this.currentMicMuted = !this.currentMicMuted;
      const val = this.currentMicMuted ? 'Susturuldu' : 'Ses Açık';
      this.lastDispatchedToastAt = Date.now();
      this.onToast({
        raw: val,
        label: 'Mikrofon',
        icon: this.currentMicMuted ? 'mic-mute' : 'mic',
        valueText: val,
        category: 'mic',
        isMuted: this.currentMicMuted,
      });
      return;
    }

    if (/Key:\s*196\b/i.test(line)) {
      this.lastBacklightAt = Date.now();
      this.currentBacklight = Math.min(3, this.currentBacklight + 1);
      const names = ['Kapalı', 'Düşük', 'Orta', 'Yüksek'];
      const val = names[this.currentBacklight];
      this.lastDispatchedToastAt = Date.now();
      this.onToast({
        raw: val,
        label: 'Klavye Işığı',
        icon: 'backlight',
        valueText: val,
        category: 'backlight',
        level: this.currentBacklight,
        maxLevel: 3,
      });
      return;
    }

    if (/Key:\s*197\b/i.test(line)) {
      this.lastBacklightAt = Date.now();
      this.currentBacklight = Math.max(0, this.currentBacklight - 1);
      const names = ['Kapalı', 'Düşük', 'Orta', 'Yüksek'];
      const val = names[this.currentBacklight];
      this.lastDispatchedToastAt = Date.now();
      this.onToast({
        raw: val,
        label: 'Klavye Işığı',
        icon: 'backlight',
        valueText: val,
        category: 'backlight',
        level: this.currentBacklight,
        maxLevel: 3,
      });
      return;
    }

    // Automatic timeout or auto-wake restore: Update internal state quietly WITHOUT showing HUD!
    const isAutoOrTimeout = /(?:Auto|Timeout)[^:]*:\s*5A-BA-C5-C4-0([0-3])/i.exec(line);
    if (isAutoOrTimeout) {
      this.lastAutoWakeAt = Date.now();
      const level = parseInt(isAutoOrTimeout[1], 10);
      this.currentBacklight = level;
      return; // Suppress HUD completely on automatic sleep timeout or auto-wake!
    }

    // Confirmed Keyboard backlight from explicit user HotKey packet
    const kbMatch = line.match(/^HotKey[^:]*:\s*5A-BA-C5-C4-0([0-3])/i);
    if (kbMatch) {
      const level = parseInt(kbMatch[1], 10);
      this.currentBacklight = level;
      this.lastBacklightAt = Date.now();

      // If user pressed key (Key: 196 / Key: 197) already dispatched within 400ms, prevent duplicate toast
      if (Date.now() - this.lastDispatchedToastAt < 400) {
        return;
      }

      const names = ['Kapalı', 'Düşük', 'Orta', 'Yüksek'];
      const val = names[level] || `Seviye ${level}`;
      this.lastDispatchedToastAt = Date.now();
      this.onToast({
        raw: val,
        label: 'Klavye Işığı',
        icon: 'backlight',
        valueText: val,
        category: 'backlight',
        level: level,
        maxLevel: 3,
      });
      return;
    }

    // Aura byte parsing: e.g. "Aura 19B6: 5D-B3-00-00-AF-00-00-EB-..."
    const auraBytesMatch = line.match(/Aura\s+(?:19B6|HID)?[^:]*:\s*5D-B3-([0-9A-Fa-f]{2})-([0-9A-Fa-f]{2})-([0-9A-Fa-f]{2})-([0-9A-Fa-f]{2})-([0-9A-Fa-f]{2})/i);
    if (auraBytesMatch) {
      const r = parseInt(auraBytesMatch[3], 16);
      const g = parseInt(auraBytesMatch[4], 16);
      const b = parseInt(auraBytesMatch[5], 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        this.cachedAuraColor = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
      }
    }

    // Aura Mode / Klavye Rengi: e.g. "AuraMode: AuraStatic", "AuraMode: ZONETEST"
    const auraMatch = line.match(/AuraMode:\s*([^\r\n]+)/i);
    if (auraMatch) {
      // G-Helper internally re-applies AuraMode whenever keyboard backlight changes or auto-wakes!
      // Suppress this false-positive if a backlight change or auto-wake happened recently and no explicit Aura key was pressed.
      const isRecentBacklight = Date.now() - this.lastBacklightAt < 2500;
      const isRecentAutoWake = Date.now() - this.lastAutoWakeAt < 4000;
      const isExplicitAuraKey = Date.now() - this.lastAuraKeyAt < 1500;
      if ((isRecentBacklight || isRecentAutoWake) && !isExplicitAuraKey) {
        return;
      }

      const rawMode = auraMatch[1].trim();
      const auraNames = {
        // Enums & IDs exactly matching G-Helper dropdown options
        AuraStatic: 'Sabit',
        Static: 'Sabit',
        Sabit: 'Sabit',
        Statik: 'Sabit',

        AuraBreathe: 'Nefes',
        Breathe: 'Nefes',
        Nefes: 'Nefes',
        'Nefes Alma': 'Nefes',

        AuraColorCycle: 'Renk Döngüsü',
        ColorCycle: 'Renk Döngüsü',
        'Renk Döngüsü': 'Renk Döngüsü',

        AuraRainbow: 'Gökkuşağı',
        Rainbow: 'Gökkuşağı',
        Gökkuşağı: 'Gökkuşağı',

        Flash: 'Flaş',
        AuraStrobe: 'Flaş',
        Strobe: 'Flaş',
        Flaş: 'Flaş',

        HEATMAP: 'Heatmap',
        Heatmap: 'Heatmap',

        GPUMODE: 'GPU Mode',
        'GPU Mode': 'GPU Mode',

        AMBIENT: 'Ambient',
        Ambient: 'Ambient',

        BATTERY: 'Battery',
        Battery: 'Battery',

        AUDIO: 'Audio Spectrum',
        AUDIOSPECTRUM: 'Audio Spectrum',
        'Audio Spectrum': 'Audio Spectrum',

        AUDIOPULSE: 'Audio Pulse',
        'Audio Pulse': 'Audio Pulse',

        GRADIENT: 'Gradient',
        Gradient: 'Gradient',
        Gradyan: 'Gradient',

        ZONETEST: 'Zone Test',
        'Zone Test': 'Zone Test',

        CUSTOM: 'Custom',
        Custom: 'Custom',

        Star: 'Yıldız',
        Rain: 'Yağmur',
        Highlight: 'Vurgu',
        Laser: 'Lazer',
        Ripple: 'Dalgalanma',
        Comet: 'Kuyruklu Yıldız',
      };
      const modeDisplay = auraNames[rawMode] || rawMode;
      const auraDetails = this.getAuraDetails(rawMode);

      this.lastDispatchedToastAt = Date.now();
      this.onToast({
        raw: modeDisplay,
        label: 'Laptop Klavyesi',
        icon: 'keyboard',
        valueText: modeDisplay,
        category: 'aura',
        auraMode: rawMode,
        color: auraDetails.color,
        color2: auraDetails.color2,
        effectType: auraDetails.effectType,
        gradient: auraDetails.gradient,
      });
      return;
    }

    // 2. Confirmed Microphone toggle: e.g. "Mikrofon Dizisi (Realtek(R) Audio):False"
    const micMatch = line.match(/(?:Mikrofon|Microphone|Mic)[^:]*:\s*(True|False)/i);
    if (micMatch) {
      const isMuted = micMatch[1].toLowerCase() === 'true';
      this.currentMicMuted = isMuted;
      const val = isMuted ? 'Susturuldu' : 'Ses Açık';
      this.lastDispatchedToastAt = Date.now();
      this.onToast({
        raw: val,
        label: 'Mikrofon',
        icon: isMuted ? 'mic-mute' : 'mic',
        valueText: val,
        category: 'mic',
        isMuted: isMuted,
      });
      return;
    }

    // 3. Confirmed Performance Mode by index: e.g. "Hotkey mode: 0", "Mode = 0 : OK"
    const hotkeyModeMatch = line.match(/(?:Hotkey mode|Mode\s*=)\s*:?\s*(\d+)/i);
    if (hotkeyModeMatch) {
      const modeId = parseInt(hotkeyModeMatch[1], 10);
      this.currentMode = modeId;
      const modeNames = { 0: 'Dengeli', 1: 'Turbo', 2: 'Sessiz' };
      const modeColors = { 0: '#38a6ff', 1: '#ff453a', 2: '#64d2ff' };
      const modeIcons = { 0: 'car', 1: 'rocket', 2: 'bike' };
      const val = modeNames[modeId] || `Mod ${modeId}`;
      this.lastDispatchedToastAt = Date.now();
      this.onToast({
        raw: val,
        label: 'Performans',
        icon: 'mode',
        valueText: val,
        category: 'mode',
        modeIndex: modeId,
        color: modeColors[modeId] || '#38a6ff',
        iconName: modeIcons[modeId] || 'car',
      });
      this.checkConfigStatus();
      return;
    }

    // 4. Confirmed Performance Mode by name: e.g. "Performance Mode: Balanced"
    const modeMatch = line.match(/Performance Mode:\s*([^\r\n]+)/i);
    if (modeMatch) {
      const rawMode = modeMatch[1].trim();
      const modeMap = {
        Balanced: { name: 'Dengeli', id: 0, color: '#38a6ff', icon: 'car' },
        Silent: { name: 'Sessiz', id: 2, color: '#64d2ff', icon: 'bike' },
        Turbo: { name: 'Turbo', id: 1, color: '#ff453a', icon: 'rocket' },
      };
      const found = modeMap[rawMode] || { name: rawMode, id: 0, color: '#38a6ff', icon: 'car' };
      this.currentMode = found.id;
      this.lastDispatchedToastAt = Date.now();
      this.onToast({
        raw: found.name,
        label: 'Performans',
        icon: 'mode',
        valueText: found.name,
        category: 'mode',
        modeIndex: found.id,
        color: found.color,
        iconName: found.icon,
      });
      this.checkConfigStatus();
      return;
    }

    // 5. Touchpad: e.g. "Touchpad status: 1" or "Touchpad: True"
    const tpMatch = line.match(/Touchpad(?: status)?:\s*(True|False|\d+)/i);
    if (tpMatch) {
      const raw = tpMatch[1].toLowerCase();
      const enabled = raw === '1' || raw === 'true';
      const val = enabled ? 'Açık' : 'Kapalı';
      this.lastDispatchedToastAt = Date.now();
      this.onToast({
        raw: val,
        label: 'Dokunmatik',
        icon: 'touchpad',
        valueText: val,
        category: 'touchpad',
      });
      return;
    }

    // 6. Fn Lock: e.g. "FnLock: 1"
    const fnMatch = line.match(/FnLock[^:]*:\s*(True|False|\d+)/i);
    if (fnMatch) {
      const raw = fnMatch[1].toLowerCase();
      const enabled = raw === '1' || raw === 'true';
      const val = enabled ? 'Açık' : 'Kapalı';
      this.lastDispatchedToastAt = Date.now();
      this.onToast({
        raw: val,
        label: 'Fn Kilidi',
        icon: 'lock',
        valueText: val,
        category: 'fnlock',
      });
      return;
    }
  }

  startLogWatcher() {
    const logPath = path.join(process.env.APPDATA || '', 'GHelper', 'log.txt');
    try {
      if (fs.existsSync(logPath)) {
        this.lastLogSize = fs.statSync(logPath).size;
      }
    } catch {
      this.lastLogSize = 0;
    }

    this.checkConfigStatus();

    const checkLog = () => {
      try {
        if (!fs.existsSync(logPath)) return;
        const stat = fs.statSync(logPath);
        if (stat.size <= this.lastLogSize) {
          if (stat.size < this.lastLogSize) this.lastLogSize = stat.size;
          return;
        }

        const fd = fs.openSync(logPath, 'r');
        const diff = stat.size - this.lastLogSize;
        const buf = Buffer.allocUnsafe(diff);
        fs.readSync(fd, buf, 0, diff, this.lastLogSize);
        fs.closeSync(fd);
        this.lastLogSize = stat.size;

        const content = buf.toString('utf8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          if (line) this.handleLogLine(line);
        }
      } catch {}
    };

    this.pollLogNow = () => {
      checkLog();
      this.checkConfigStatus();
    };

    // 1. High-speed kernel directory watcher for INSTANT 1ms reaction
    try {
      const ghelperDir = path.dirname(logPath);
      if (fs.existsSync(ghelperDir)) {
        this.dirWatcher = fs.watch(ghelperDir, (eventType, filename) => {
          if (!filename || filename.toLowerCase().includes('log.txt')) {
            checkLog();
          }
          if (!filename || filename.toLowerCase().includes('config.json')) {
            this.checkConfigStatus();
          }
        });
      }
    } catch {}

    // 2. Resource-friendly polling fallback (800ms) + periodic config check
    // Directory watcher above provides instant 1ms reaction; polling is just a safety fallback
    let pollCount = 0;
    this.logInterval = setInterval(() => {
      checkLog();
      pollCount++;
      if (pollCount % 2 === 0) {
        this.checkConfigStatus();
      }
    }, 800);
  }

  start() {
    if (this.isListening) return;

    this.startLogWatcher();

    this.server = net.createServer((socket) => {
      this.activeSocket = socket;
      let buffer = '';
      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('{')) continue;
          try {
            const data = JSON.parse(trimmed);
            if (data.type === 'osd-trigger') {
              if (data.micToggled) {
                const val = data.micMuted ? 'Susturuldu' : 'Ses Açık';
                this.lastDispatchedToastAt = Date.now();
                this.onToast({
                  raw: val,
                  label: 'Mikrofon',
                  icon: data.micMuted ? 'mic-mute' : 'mic',
                  valueText: val,
                  category: 'mic',
                  isMuted: data.micMuted,
                });
              } else {
                if (typeof this.pollLogNow === 'function') {
                  this.pollLogNow();
                }
              }
            } else if (data.type === 'toast' && data.text) {
              const parsed = resolveGHelperToast(data.text);
              if (parsed) {
                this.lastDispatchedToastAt = Date.now();
                this.onToast(parsed);
              }
            }
          } catch {}
        }
      });
      socket.on('close', () => {
        if (this.activeSocket === socket) this.activeSocket = null;
      });
      socket.on('error', () => {});
    });

    this.server.on('error', (err) => {
      console.warn('[GHelperBridge] Pipe server error:', err.message);
    });

    try {
      this.server.listen(this.pipePath, () => {
        this.isListening = true;
      });
    } catch (err) {
      console.warn('[GHelperBridge] Could not start pipe server:', err.message);
    }
  }

  stop() {
    if (this.dirWatcher) {
      try { this.dirWatcher.close(); } catch {}
      this.dirWatcher = null;
    }
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = null;
    }
    if (this.activeSocket) {
      try { this.activeSocket.destroy(); } catch {}
      this.activeSocket = null;
    }
    if (this.server) {
      try { this.server.close(); } catch {}
      this.server = null;
    }
    this.isListening = false;
  }
}

const TASK_NAME = 'TwoCode_GHelperBridge';

function checkScheduledTaskStatus() {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-Command', `Get-ScheduledTask -TaskName "${TASK_NAME}" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty State`],
      (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve({ installed: false, running: false, state: 'NotInstalled' });
        } else {
          const state = stdout.trim();
          resolve({ installed: true, running: state === 'Running', state });
        }
      }
    );
  });
}

function installScheduledTask() {
  const installScriptPath = path.join(__dirname, 'install-bridge-task.ps1');

  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-File',"\`"${installScriptPath}\`""`,
      ],
      (err) => {
        if (err) {
          resolve({ ok: false, error: err.message });
        } else {
          // Double check status after installation
          setTimeout(() => {
            checkScheduledTaskStatus().then((status) => {
              resolve({ ok: status.installed, status });
            });
          }, 1500);
        }
      }
    );
  });
}

function startScheduledTask() {
  return new Promise((resolve) => {
    execFile('schtasks.exe', ['/Run', '/TN', TASK_NAME], (err) => {
      resolve({ ok: !err });
    });
  });
}

module.exports = {
  GHelperBridgeClient,
  resolveGHelperToast,
  readGHelperStatus,
  checkScheduledTaskStatus,
  installScheduledTask,
  startScheduledTask,
};

