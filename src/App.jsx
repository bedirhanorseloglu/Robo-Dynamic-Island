import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import RealAppIcon from './RealAppIcon';
import { shouldPersistNotification } from './notification-history-policy.mjs';
import {
  Home,
  Terminal,
  Music,
  Timer,
  Moon,
  Inbox,
  Copy,
  FileText,
  Calendar,
  Mail,
  Volume2,
  VolumeX,
  Wifi,
  Bluetooth,
  MoreHorizontal,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Laptop,
  Fan,
  Flame,
  Leaf,
  Zap,
  Bike,
  Car,
  Rocket,
  Flower2,
  Plus,
  Check,
  X,
  Mic,
  ArrowUp,
  Briefcase,
  BookOpen,
  Gamepad2,
  Shield,
  Bell,
  LayoutGrid,
  Pencil,
  Settings,
  RotateCw,
  ChevronUp,
  ChevronRight,
  Power,
  Video,
  Sun,
  Trash2,
  Search,
  ExternalLink,
  Radio,
  Tag,
  Bot,
  Sunrise,
  MicOff,
  Gauge,
  Layers,
  Lock,
  Cpu,
  Palette,
  Keyboard,
  Sparkles,
  Touchpad as TouchpadIcon,
} from 'lucide-react';
import RoboEyes from './RoboEyes';
import HeroClock, { CLOCK_FONT_FAMILIES } from './HeroClock';
import { applyTypographyTokens, readTypographyPreferences, TYPOGRAPHY_STORAGE_KEY } from './typography';
import NotificationText from './NotificationText';
import AgendaCalendar from './AgendaCalendar';
import RoboMarkdown from './RoboMarkdown';
import { playRoboSound, playNotifSound } from './sounds';

// Extract vibrant dominant RGB color from live album/video thumbnail
// When nothing is playing (no thumbnail), defaults to the crimson/burgundy placeholder glow
// matching the original TwoCode app (media_1794022256939_a2c228a1.jpg)
function useDominantColor(imageSrc) {
  const [accent, setAccent] = useState({
    rgb: '190, 32, 68',
    hex: '#be2044',
    hasColor: true,
    isLiveCover: false,
  });

  useEffect(() => {
    if (!imageSrc) {
      setAccent({
        rgb: '190, 32, 68',
        hex: '#be2044',
        hasColor: true,
        isLiveCover: false,
      });
      return;
    }
    let cancelled = false;
    const img = new Image();
    if (/^https?:\/\//i.test(imageSrc)) img.crossOrigin = 'Anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        const size = 28;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let weightSum = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const lum = (max + min) / 2;
          const sat = max === 0 ? 0 : (max - min) / max;

          // Weight colorful, mid-bright pixels heavily over black/grey/white bars
          if (lum < 18 || lum > 246) continue;
          const weight = (0.25 + sat * 2.6) * (lum > 35 && lum < 225 ? 1.4 : 0.4);
          rSum += r * weight;
          gSum += g * weight;
          bSum += b * weight;
          weightSum += weight;
        }

        if (weightSum > 0) {
          let r = Math.round(rSum / weightSum);
          let g = Math.round(gSum / weightSum);
          let b = Math.round(bSum / weightSum);

          // Boost saturation slightly so ambient glow looks vivid
          const avg = (r + g + b) / 3;
          r = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * 1.28)));
          g = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * 1.28)));
          b = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * 1.28)));

          // Ensure enough brightness for dark notch background
          const minBri = 145;
          const peak = Math.max(r, g, b, 1);
          if (peak < minBri) {
            const scale = minBri / peak;
            r = Math.min(255, Math.round(r * scale));
            g = Math.min(255, Math.round(g * scale));
            b = Math.min(255, Math.round(b * scale));
          }

          const toHex = (n) => n.toString(16).padStart(2, '0');
          setAccent({
            rgb: `${r}, ${g}, ${b}`,
            hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
            hasColor: true,
            isLiveCover: true,
          });
        }
      } catch {}
    };
    img.src = imageSrc;
    return () => {
      cancelled = true;
    };
  }, [imageSrc]);

  return accent;
}

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function generateAppGradient(name) {
  let hash = 0;
  const str = String(name || 'App').trim();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 42) % 360;
  const rgb1 = hslToRgb(hue1, 92, 54);
  const rgb2 = hslToRgb(hue2, 92, 42);
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return {
    rgb: `${rgb1[0]}, ${rgb1[1]}, ${rgb1[2]}`,
    hex: `#${toHex(rgb1[0])}${toHex(rgb1[1])}${toHex(rgb1[2])}`,
    secondaryRgb: `${rgb2[0]}, ${rgb2[1]}, ${rgb2[2]}`,
    secondaryHex: `#${toHex(rgb2[0])}${toHex(rgb2[1])}${toHex(rgb2[2])}`,
  };
}

// Brand color definitions with rich primary + secondary gradients
const NOTIFICATION_BRANDS = [
  { match: /gmail|google.?mail|com\.google\.android\.gm/, rgb: '234, 67, 53', hex: '#EA4335', secondaryRgb: '66, 133, 244', secondaryHex: '#4285F4', brand: 'gmail' },
  { match: /google.?calendar|calendar|takvim|ajanda/, rgb: '66, 133, 244', hex: '#4285F4', secondaryRgb: '52, 168, 83', secondaryHex: '#34A853', brand: 'calendar' },
  { match: /outlook|microsoft\.office\.outlook/, rgb: '0, 120, 212', hex: '#0078D4', secondaryRgb: '0, 90, 158', secondaryHex: '#005A9E', brand: 'outlook' },
  { match: /teams|msteams/, rgb: '98, 100, 167', hex: '#6264A7', secondaryRgb: '70, 71, 117', secondaryHex: '#464775', brand: 'teams' },
  { match: /whatsapp/, rgb: '37, 211, 102', hex: '#25D366', secondaryRgb: '18, 140, 126', secondaryHex: '#128C7E', brand: 'whatsapp' },
  { match: /discord/, rgb: '88, 101, 242', hex: '#5865F2', secondaryRgb: '71, 82, 196', secondaryHex: '#4752C4', brand: 'discord' },
  { match: /telegram/, rgb: '42, 171, 238', hex: '#2AABEE', secondaryRgb: '34, 158, 217', secondaryHex: '#229ED9', brand: 'telegram' },
  { match: /spotify/, rgb: '30, 215, 96', hex: '#1ED760', secondaryRgb: '29, 185, 84', secondaryHex: '#1DB954', brand: 'spotify' },
  { match: /youtube|ytmusic/, rgb: '255, 0, 51', hex: '#FF0033', secondaryRgb: '196, 48, 43', secondaryHex: '#C4302B', brand: 'youtube' },
  { match: /instagram/, rgb: '225, 48, 108', hex: '#E1306C', secondaryRgb: '253, 29, 29', secondaryHex: '#FD1D1D', brand: 'instagram' },
  { match: /slack/, rgb: '97, 31, 105', hex: '#611F69', secondaryRgb: '236, 178, 46', secondaryHex: '#ECB22E', brand: 'slack' },
  { match: /twitter|(^|[\s._-])x($|[\s._-])/, rgb: '29, 155, 240', hex: '#1D9BF0', secondaryRgb: '15, 20, 25', secondaryHex: '#0F1419', brand: 'x' },
  { match: /linkedin/, rgb: '10, 102, 194', hex: '#0A66C2', secondaryRgb: '0, 65, 130', secondaryHex: '#004182', brand: 'linkedin' },
  { match: /facebook|messenger|meta/, rgb: '8, 102, 255', hex: '#0866FF', secondaryRgb: '0, 198, 255', secondaryHex: '#00C6FF', brand: 'facebook' },
  { match: /tiktok/, rgb: '254, 44, 85', hex: '#FE2C55', secondaryRgb: '37, 244, 238', secondaryHex: '#25F4EE', brand: 'tiktok' },
  { match: /snapchat/, rgb: '255, 252, 0', hex: '#FFFC00', secondaryRgb: '230, 220, 0', secondaryHex: '#E6DC00', brand: 'snapchat' },
  { match: /steam/, rgb: '102, 192, 244', hex: '#66C0F4', secondaryRgb: '27, 40, 56', secondaryHex: '#1B2838', brand: 'steam' },
  { match: /epic\s*games|epicgames/, rgb: '0, 120, 242', hex: '#0078F2', secondaryRgb: '49, 49, 49', secondaryHex: '#313131', brand: 'epic' },
  { match: /github/, rgb: '110, 64, 201', hex: '#6E40C9', secondaryRgb: '36, 41, 47', secondaryHex: '#24292F', brand: 'github' },
  { match: /claude|anthropic/, rgb: '217, 119, 87', hex: '#D97757', secondaryRgb: '193, 95, 60', secondaryHex: '#C15F3C', brand: 'claude' },
  { match: /chatgpt|openai/, rgb: '16, 163, 127', hex: '#10A37F', secondaryRgb: '26, 127, 100', secondaryHex: '#1A7F64', brand: 'openai' },
  { match: /codex/, rgb: '97, 152, 255', hex: '#6198FF', secondaryRgb: '138, 92, 246', secondaryHex: '#8A5CF6', brand: 'codex' },
  { match: /antigravity/, rgb: '73, 218, 202', hex: '#49DACA', secondaryRgb: '42, 157, 143', secondaryHex: '#2A9D8F', brand: 'antigravity' },
  { match: /ghelper|g-helper/, rgb: '56, 166, 255', hex: '#38A6FF', secondaryRgb: '0, 184, 116', secondaryHex: '#00B874', brand: 'ghelper' },
  { match: /twocode|two.?code/, rgb: '97, 152, 255', hex: '#6198FF', secondaryRgb: '138, 92, 246', secondaryHex: '#8A5CF6', brand: 'twocode' },
  { match: /chrome|google chrome/, rgb: '66, 133, 244', hex: '#4285F4', secondaryRgb: '234, 67, 53', secondaryHex: '#EA4335', brand: 'chrome' },
  { match: /microsoft edge|\bedge\b/, rgb: '10, 155, 140', hex: '#0A9B8C', secondaryRgb: '0, 120, 212', secondaryHex: '#0078D4', brand: 'edge' },
  { match: /firefox|mozilla/, rgb: '255, 113, 57', hex: '#FF7139', secondaryRgb: '255, 59, 48', secondaryHex: '#FF3B30', brand: 'firefox' },
  { match: /visual studio code|vscode/, rgb: '0, 122, 204', hex: '#007ACC', secondaryRgb: '0, 152, 255', secondaryHex: '#0098FF', brand: 'vscode' },
  { match: /onedrive/, rgb: '0, 120, 212', hex: '#0078D4', secondaryRgb: '35, 144, 235', secondaryHex: '#2390EB', brand: 'onedrive' },
  { match: /windows security|defender/, rgb: '0, 164, 239', hex: '#00A4EF', secondaryRgb: '0, 102, 204', secondaryHex: '#0066CC', brand: 'security' },
  { match: /windows|system|ayarlar|settings|explorer|dosya yöneticisi|terminal|cmd|powershell/, rgb: '0, 120, 212', hex: '#0078D4', secondaryRgb: '0, 199, 253', secondaryHex: '#00C7FD', brand: 'windows' },
  { match: /brave/, rgb: '251, 84, 43', hex: '#FB542B', secondaryRgb: '255, 26, 85', secondaryHex: '#FF1A55', brand: 'brave' },
  { match: /notion/, rgb: '35, 35, 35', hex: '#232323', secondaryRgb: '0, 0, 0', secondaryHex: '#000000', brand: 'notion' },
  { match: /riot|valorant|league of legends/, rgb: '235, 0, 41', hex: '#EB0029', secondaryRgb: '20, 20, 20', secondaryHex: '#141414', brand: 'riot' },
];

function resolveNotifBrand(banner, logoAccent) {
  const appIdentity = `${banner?.app || ''} ${banner?.appId || ''}`.toLowerCase();
  const genericApp = /^(windows|notification|unknown|app)?\s*$/i.test(banner?.app || '');
  const fallbackText = genericApp ? `${banner?.title || ''} ${banner?.body || ''}` : '';
  const identity = `${appIdentity} ${fallbackText}`;

  const knownBrand = NOTIFICATION_BRANDS.find(({ match }) => match.test(identity));
  const customAccentRgb = String(banner?.accentRgb || '');
  const customAccentHex = String(banner?.accentHex || '');
  const customAccentSecondaryRgb = String(banner?.accentSecondaryRgb || '');
  const customAccentSecondaryHex = String(banner?.accentSecondaryHex || '');
  const validAccentRgb = (rgb) => /^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/.test(rgb) && rgb.split(',').every((part) => Number(part.trim()) <= 255);
  if (
    /ghelper|g-helper/i.test(appIdentity) &&
    validAccentRgb(customAccentRgb) &&
    /^#[\da-f]{6}$/i.test(customAccentHex) &&
    validAccentRgb(customAccentSecondaryRgb) &&
    /^#[\da-f]{6}$/i.test(customAccentSecondaryHex)
  ) {
    return { rgb: customAccentRgb, hex: customAccentHex, secondaryRgb: customAccentSecondaryRgb, secondaryHex: customAccentSecondaryHex, brand: 'ghelper' };
  }
  if (logoAccent?.isLiveCover) {
    return {
      rgb: logoAccent.rgb,
      hex: logoAccent.hex,
      secondaryRgb: knownBrand?.secondaryRgb || logoAccent.rgb,
      secondaryHex: knownBrand?.secondaryHex || logoAccent.hex,
      brand: knownBrand?.brand || 'native-logo',
    };
  }
  if (knownBrand) {
    return {
      ...knownBrand,
      secondaryRgb: knownBrand.secondaryRgb || knownBrand.rgb,
      secondaryHex: knownBrand.secondaryHex || knownBrand.hex,
    };
  }

  // Dynamic consistent gradient generation for any app
  const appName = banner?.app || banner?.appId || 'Notification';
  const dynamic = generateAppGradient(appName);
  return {
    ...dynamic,
    brand: 'generated-app',
  };
}

function resolveNotificationPresentation(banner) {
  const app = String(banner?.app || 'Windows');
  const title = String(banner?.title || app);
  const body = String(banner?.body || '');
  const identity = `${app} ${banner?.appId || ''}`.toLowerCase();
  const text = `${title} ${body}`.toLowerCase();
  const videoCall = /video call|video calling|görüntülü arama|görüntülü arıyor|görüntülü çağrı|görüntülü görüşme/.test(text);
  const audioCall = /voice call|audio call|calling you|incoming call|sesli arama|sesli arıyor|sesli çağrı|seni arıyor|aranıyor/.test(text);
  const call = banner?.notificationKind === 'call' || videoCall || audioCall;
  const chatApp = /whatsapp|telegram|messenger|facebook|instagram|discord|slack|teams|signal|messages|gmail|google.?mail|com\.google\.android\.gm/.test(identity);
  const titleLooksLikeApp = title.toLowerCase() === app.toLowerCase() || /^(incoming|missed|video|voice|audio) (call|arama)|^(new message|message from|\d+ new messages?)\b|^(google mail|gmail|google calendar|whatsapp|telegram|messenger|microsoft teams)(\s|\(|:|$)/i.test(title);
  const bodySender = body.match(/^(.*?)\s+(?:is calling|seni arıyor|arıyor)(?=$|\s|[.,!?])/i)?.[1]?.trim()
    || body.match(/(?:from|arayan|şu kişiden)\s*:?\s*([^\n]+)/i)?.[1]?.trim()
    || body.match(/^([^:–—\n]{1,70})\s*[:–—]\s*\S/)?.[1]?.trim()
    || body.split(/[\n:]/)[0];
  const sender = String(banner?.sender || ((call || chatApp) && titleLooksLikeApp ? bodySender : title))
    .replace(/\s*\((?:gmail|whatsapp|telegram|messenger)\)\s*$/i, '')
    .trim();
  const hasPerson = Boolean(banner?.profileImage || (sender && sender.toLowerCase() !== app.toLowerCase() && (chatApp || call)));
  const kind = call ? (videoCall || banner?.callKind === 'video' ? 'video' : 'audio') : chatApp ? 'message' : 'notification';
  const titleText = hasPerson ? sender : title;
  const subtitle = call
    ? `${kind === 'video' ? 'Görüntülü arama' : 'Sesli arama'} · ${app}`
    : body;

  return { app, title: titleText, subtitle, sender, hasPerson, kind };
}

function isSafeNotificationImage(src) {
  if (typeof src !== 'string' || !src.trim()) return false;
  return (
    /^data:image\//i.test(src) ||
    /^https?:\/\//i.test(src) ||
    /^file:\/\//i.test(src) ||
    /^[a-zA-Z]:[/\\]/i.test(src)
  );
}

function formatNotifTime(timestamp) {
  if (!timestamp) return 'şimdi';
  const now = Date.now();
  const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (isNaN(time)) return 'şimdi';
  const diffSec = Math.max(0, Math.floor((now - time) / 1000));
  if (diffSec < 45) return 'şimdi';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} sa`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'dün';
  if (diffDays < 7) return `${diffDays} gün`;
  const d = new Date(time);
  return `${d.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()]}`;
}

function NotificationAvatar({ banner, brand, presentation }) {
  const profileImage = isSafeNotificationImage(banner?.profileImage) ? banner.profileImage : '';
  const initials = presentation.sender
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toLocaleUpperCase('tr-TR') || '')
    .join('');
  const personAvatar = Boolean(profileImage);

  return (
    <div className={`notif-toast-avatar ${personAvatar ? 'is-person-avatar' : 'is-app-avatar'} ${presentation.kind === 'audio' || presentation.kind === 'video' ? 'is-call-avatar' : ''}`}>
      {profileImage ? (
        <>
          <span className="notif-toast-initials is-image-fallback">{initials || '?'}</span>
          <img className="notif-toast-profile-image" src={profileImage} alt={`${presentation.sender} profil fotoğrafı`} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
          <span className="notif-toast-app-chip" aria-label={`${presentation.app} logosu`}>
            <NotifBrandIcon brand={brand} logo={banner?.logo} appName={presentation.app || banner?.app} banner={banner} />
          </span>
        </>
      ) : (
        <NotifBrandIcon key={`${brand}-${banner?.logo || 'brand'}`} brand={brand} logo={banner?.logo} appName={presentation.app || banner?.app} banner={banner} />
      )}
    </div>
  );
}

function NotifBrandIcon({ brand, logo, appName, banner }) {
  const [logoFailed, setLogoFailed] = useState(false);
  if (logo && isSafeNotificationImage(logo) && !logoFailed) {
    return <img src={logo} alt="" className="notif-toast-app-logo" onError={() => setLogoFailed(true)} />;
  }
  const b = String(brand || '').toLowerCase();
  const name = String(appName || banner?.app || banner?.title || '').toLowerCase();

  if (b === 'gmail' || /gmail|google.?mail/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="3" width="20" height="18" rx="4" fill="#ffffff" />
        <path d="M4.5 17.5V7.2l7.5 5.5 7.5-5.5v10.3" fill="none" stroke="#EA4335" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.5 7.2v10.3" stroke="#4285F4" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M19.5 7.2v10.3" stroke="#34A853" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M12 12.7 19.5 7.2" stroke="#FBBC04" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (b === 'calendar' || /calendar|takvim|ajanda/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="17" rx="4" fill="#ffffff" />
        <path d="M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3V10H3z" fill="#4285F4" />
        <path d="M7 2.5v3.5M17 2.5v3.5" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" />
        <text x="12" y="18" textAnchor="middle" fontFamily="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" fontSize="8.5" fontWeight="800" fill="#4285F4">31</text>
      </svg>
    );
  }
  if (b === 'whatsapp' || /whatsapp/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="url(#gh-wa-grad)" />
        <defs>
          <linearGradient id="gh-wa-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#25D366" />
            <stop offset="1" stopColor="#128C7E" />
          </linearGradient>
        </defs>
        <path
          d="M12 4.2C7.7 4.2 4.2 7.7 4.2 12c0 1.4.4 2.8 1.1 4L4 20l4.2-1.1c1.2.6 2.5 1 3.8 1 4.3 0 7.8-3.5 7.8-7.8S16.3 4.2 12 4.2zm4.6 11.1c-.2.6-1.1 1-1.5 1.1-.4.1-.9.1-1.5-.1-.4-.1-.8-.3-1.4-.5-2.4-1-3.9-3.4-4-3.6-.1-.2-.9-1.3-.9-2.5 0-1.2.6-1.7.8-2 .2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.7.8 1.8.1.1.1.3 0 .4s-.2.3-.3.4l-.3.3c-.1.1-.2.2 0 .5.2.3.7 1.1 1.4 1.8 1 .9 1.8 1.1 2 .1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.2.1 1.4.7 1.6.8.2.1.4.2.5.3 0 .2 0 .7-.4 1.3z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (b === 'discord' || /discord/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#5865F2" />
        <path
          d="M17.4 6.8c-.9-.4-1.9-.7-2.9-.9-.1.3-.3.6-.4.9-1.1-.2-2.2-.2-3.3 0-.1-.3-.3-.6-.4-.9-1 .2-2 .5-2.9.9-1.8 2.7-2.3 5.4-2.1 8.1 1.2.9 2.4 1.5 3.6 1.8.3-.4.6-.8.8-1.3-.4-.2-.8-.4-1.2-.6.1-.1.2-.2.3-.2 2.3 1.1 4.8 1.1 7.1 0 .1.1.2.2.3.2-.4.2-.8.4-1.2.6.2.4.5.9.8 1.3 1.2-.4 2.4-.9 3.6-1.8.3-3.1-.5-5.7-2.2-8.1zm-7.2 6.4c-.7 0-1.3-.6-1.3-1.4 0-.8.6-1.4 1.3-1.4.7 0 1.3.6 1.3 1.4 0 .8-.6 1.4-1.3 1.4zm3.6 0c-.7 0-1.3-.6-1.3-1.4 0-.8.6-1.4 1.3-1.4.7 0 1.3.6 1.3 1.4 0 .8-.6 1.4-1.3 1.4z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (b === 'telegram' || /telegram/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="url(#gh-tg-grad)" />
        <defs>
          <linearGradient id="gh-tg-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2AABEE" />
            <stop offset="1" stopColor="#229ED9" />
          </linearGradient>
        </defs>
        <path
          d="M18.8 5.6L4.5 11.1c-1 .4-1 1-.2 1.2l3.7 1.1 8.5-5.4c.4-.2.8-.1.5.2l-6.9 6.2h-.1l-.2 3.8c.4 0 .5-.2.7-.4l1.8-1.7 3.7 2.7c.7.4 1.2.2 1.4-.6l2.4-11.5c.3-1-.4-1.5-1-.9z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (b === 'spotify' || /spotify/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#1ED760" />
        <path
          d="M16.5 9.7c-2.9-1.7-7.6-1.9-10.3-1.1-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.1-.9 8.3-.7 11.5 1.2.4.2.5.7.3 1.1-.2.4-.6.5-1 .3zm-.9 3.6c-.2.3-.6.4-1 .2-2-.9-5.1-1.3-7.5-.6-.3.1-.7-.1-.8-.4-.1-.3.1-.7.4-.8 2.7-.8 6.1-.4 8.4.6.4.2.5.7.3 1zm-1.1 2.3c-.2.2-.5.3-.7.1-1.8-1.1-4-1.3-6.5-.7-.3.1-.5-.1-.6-.4-.1-.3.1-.5.4-.6 2.8-.6 5.3-.4 7.3.9.2.2.3.5.1.7z"
          fill="#000000"
        />
      </svg>
    );
  }
  if (b === 'youtube' || /youtube|ytmusic/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#FF0000" />
        <polygon points="9.5,7.5 16.5,12 9.5,16.5" fill="#FFFFFF" />
      </svg>
    );
  }
  if (b === 'instagram' || /instagram/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="url(#gh-ig-grad)" />
        <defs>
          <linearGradient id="gh-ig-grad" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FCB045" />
            <stop offset="0.5" stopColor="#FD1D1D" />
            <stop offset="1" stopColor="#833AB4" />
          </linearGradient>
        </defs>
        <rect x="5.5" y="5.5" width="13" height="13" rx="3.5" stroke="#FFFFFF" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3" stroke="#FFFFFF" strokeWidth="1.8" />
        <circle cx="15.5" cy="8.5" r="0.9" fill="#FFFFFF" />
      </svg>
    );
  }
  if (b === 'x' || /twitter|\bx\b/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#000000" />
        <path
          d="M16.5 5.5h2.1l-4.6 5.3 5.4 7.2h-4.3l-3.3-4.4-3.8 4.4H5.9l4.9-5.6L5.5 5.5h4.4l3 4 3.6-4zm-.7 11.2h1.2L8.3 6.7H7L15.8 16.7z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (b === 'steam' || /steam/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="url(#gh-steam-grad)" />
        <defs>
          <linearGradient id="gh-steam-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1B2838" />
            <stop offset="1" stopColor="#2A475E" />
          </linearGradient>
        </defs>
        <circle cx="14.5" cy="8.5" r="3.2" stroke="#66C0F4" strokeWidth="1.8" fill="none" />
        <circle cx="9" cy="15.5" r="2.2" stroke="#66C0F4" strokeWidth="1.6" fill="none" />
        <path d="M12.5 10.5L8.5 14" stroke="#66C0F4" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (b === 'vscode' || /visual studio code|vscode/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#1E1E1E" />
        <path d="M17.5 4.5l-6 5.5-4-3-3 1.5 3 3.5-3 3.5 3 1.5 4-3 6 5.5 2.5-1V5.5l-2.5-1zM15 15.5l-4-3.5 4-3.5v7z" fill="#007ACC" />
      </svg>
    );
  }
  if (b === 'chrome' || /chrome/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#FFFFFF" />
        <circle cx="12" cy="12" r="4" fill="#4285F4" />
        <path d="M12 4a8 8 0 0 1 6.9 4H12z" fill="#EA4335" />
        <path d="M18.9 8A8 8 0 0 1 15.5 18.5L12 12z" fill="#FBBC04" />
        <path d="M15.5 18.5A8 8 0 0 1 5.1 8H12z" fill="#34A853" />
      </svg>
    );
  }
  if (b === 'edge' || /microsoft edge|\bedge\b/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="url(#gh-edge-grad)" />
        <defs>
          <linearGradient id="gh-edge-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0A9B8C" />
            <stop offset="1" stopColor="#0078D4" />
          </linearGradient>
        </defs>
        <path d="M12 5a7 7 0 0 1 7 7c0 4-3 7-7 7s-7-3-7-7c0-2 1-4 3-5 .5 1.5 1.5 2.5 3 2.5 2 0 3-1.5 3-3.5 0-1-.3-1.8-.8-2.4C10.7 5.2 11.3 5 12 5z" fill="#FFFFFF" />
      </svg>
    );
  }
  if (b === 'firefox' || /firefox|mozilla/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="url(#gh-ff-grad)" />
        <defs>
          <linearGradient id="gh-ff-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF7139" />
            <stop offset="1" stopColor="#FF3B30" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="5" fill="#FFCC00" />
        <circle cx="12" cy="12" r="3.5" fill="#007ACC" />
      </svg>
    );
  }
  if (b === 'github' || /github/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#24292F" />
        <path
          d="M12 4.5a7.5 7.5 0 0 0-2.4 14.6c.4.1.5-.2.5-.4v-1.4c-2.1.5-2.5-.9-2.5-.9-.3-.8-.8-1-.8-1-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.8.8 2.2.6.1-.5.3-.8.5-1-1.7-.2-3.4-.8-3.4-3.7 0-.8.3-1.5.8-2-.1-.2-.4-1 .1-2 0 0 .6-.2 2.1.8a7.2 7.2 0 0 1 3.8 0c1.5-1 2.1-.8 2.1-.8.5 1 .2 1.8.1 2 .5.5.8 1.2.8 2 0 2.9-1.8 3.5-3.5 3.7.3.3.6.8.6 1.6v2.4c0 .2.1.5.5.4A7.5 7.5 0 0 0 12 4.5z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (b === 'slack' || /slack/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#FFFFFF" />
        <path d="M6 10.5a1.5 1.5 0 1 1 1.5-1.5v1.5H6zm2.5 0a1.5 1.5 0 1 1 3 0v4a1.5 1.5 0 1 1-3 0v-4z" fill="#36C5F0" />
        <path d="M13.5 6a1.5 1.5 0 1 1 1.5 1.5H13.5V6zm0 2.5a1.5 1.5 0 1 1 0 3h-4a1.5 1.5 0 1 1 0-3h4z" fill="#2EB67D" />
        <path d="M18 13.5a1.5 1.5 0 1 1-1.5 1.5v-1.5H18zm-2.5 0a1.5 1.5 0 1 1-3 0v-4a1.5 1.5 0 1 1 3 0v4z" fill="#ECB22E" />
        <path d="M10.5 18a1.5 1.5 0 1 1-1.5-1.5h1.5V18zm0-2.5a1.5 1.5 0 1 1 0-3h4a1.5 1.5 0 1 1 0 3h-4z" fill="#E01E5A" />
      </svg>
    );
  }
  if (b === 'teams' || /teams|msteams/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#6264A7" />
        <circle cx="15.5" cy="8.5" r="2" fill="#FFFFFF" opacity="0.85" />
        <path d="M13.5 12h4c1 0 2 .8 2 1.8V15h-8v-1.2c0-1 1-1.8 2-1.8z" fill="#FFFFFF" opacity="0.85" />
        <circle cx="9.5" cy="9.5" r="2.5" fill="#FFFFFF" />
        <path d="M7 14h5c1.1 0 2 .9 2 2v1.5H5V16c0-1.1.9-2 2-2z" fill="#FFFFFF" />
      </svg>
    );
  }
  if (b === 'outlook' || /outlook/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#0078D4" />
        <path d="M5 8l7 4.5L19 8v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z" fill="#FFFFFF" opacity="0.4" />
        <rect x="4.5" y="6" width="9" height="12" rx="2" fill="#FFFFFF" />
        <text x="9" y="14.5" textAnchor="middle" fontFamily="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" fontSize="8" fontWeight="850" fill="#0078D4">O</text>
      </svg>
    );
  }
  if (b === 'linkedin' || /linkedin/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#0A66C2" />
        <text x="12" y="16.5" textAnchor="middle" fontFamily="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" fontSize="13" fontWeight="850" fill="#FFFFFF">in</text>
      </svg>
    );
  }
  if (b === 'facebook' || /facebook|meta|messenger/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#0866FF" />
        <path d="M13 18v-5.5h2l.3-2.3H13V8.8c0-.7.2-1.1 1.2-1.1h1.1V5.7c-.2 0-.9-.1-1.8-.1-1.8 0-3 1.1-3 3.1v1.5H8.5v2.3H10.5V18H13z" fill="#FFFFFF" />
      </svg>
    );
  }
  if (b === 'tiktok' || /tiktok/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#000000" />
        <path d="M16.5 8.5c-1-.2-1.9-.9-2.2-1.8h-2.1v9c0 1.2-1 2.2-2.2 2.2s-2.2-1-2.2-2.2 1-2.2 2.2-2.2c.3 0 .5 0 .8.1v-2.2c-.3 0-.5-.1-.8-.1-2.4 0-4.3 1.9-4.3 4.4s1.9 4.4 4.3 4.4 4.3-1.9 4.3-4.4v-4.8c1.1.8 2.4 1.2 3.8 1.2V10.2c-1.3 0-2.4-.7-2.9-1.7h1.6V8.5z" fill="#25F4EE" />
        <path d="M15.5 7.5c-1-.2-1.9-.9-2.2-1.8h-2.1v9c0 1.2-1 2.2-2.2 2.2s-2.2-1-2.2-2.2 1-2.2 2.2-2.2c.3 0 .5 0 .8.1v-2.2c-.3 0-.5-.1-.8-.1-2.4 0-4.3 1.9-4.3 4.4s1.9 4.4 4.3 4.4 4.3-1.9 4.3-4.4v-4.8c1.1.8 2.4 1.2 3.8 1.2V9.2c-1.3 0-2.4-.7-2.9-1.7h1.6V7.5z" fill="#FE2C55" opacity="0.8" />
      </svg>
    );
  }
  if (b === 'windows' || b === 'security' || /windows|system|ayarlar|settings|defender|explorer/.test(name)) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="url(#gh-win-grad)" />
        <defs>
          <linearGradient id="gh-win-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0078D4" />
            <stop offset="1" stopColor="#00C7FD" />
          </linearGradient>
        </defs>
        <rect x="5.5" y="5.5" width="5.8" height="5.8" rx="1" fill="#FFFFFF" />
        <rect x="12.7" y="5.5" width="5.8" height="5.8" rx="1" fill="#FFFFFF" />
        <rect x="5.5" y="12.7" width="5.8" height="5.8" rx="1" fill="#FFFFFF" />
        <rect x="12.7" y="12.7" width="5.8" height="5.8" rx="1" fill="#FFFFFF" />
      </svg>
    );
  }
  if (b === 'claude' || /claude|anthropic/.test(name)) {
    return <AiProviderLogo provider="claude" size={26} />;
  }
  if (b === 'openai' || /chatgpt|openai/.test(name)) {
    return <AiProviderLogo provider="ChatGPT" size={26} />;
  }
  if (b === 'codex' || b === 'twocode' || /twocode|codex/.test(name)) {
    return (
      <div className="notif-custom-app-badge" style={{ background: 'linear-gradient(135deg, #6198FF, #8A5CF6)' }}>
        <span className="notif-badge-letter">2</span>
      </div>
    );
  }
  if (b === 'antigravity' || /antigravity/.test(name)) {
    return <RealAppIcon sc={{ id: 'antigravity-agent-mark', type: 'antigravity' }} size={26} />;
  }
  if (b === 'ghelper' || /ghelper|g-helper/.test(name)) {
    return (
      <div className="notif-custom-app-badge" style={{ background: 'linear-gradient(135deg, #38A6FF, #00B874)' }}>
        <span className="notif-badge-letter">G</span>
      </div>
    );
  }
  if (b === 'mail' || /mail|posta/.test(name)) {
    return (
      <div className="notif-custom-app-badge" style={{ background: 'linear-gradient(135deg, #0078D4, #4285F4)' }}>
        <Mail size={17} strokeWidth={2.4} color="#ffffff" />
      </div>
    );
  }

  // Universal dynamic monogram tile for all other applications
  const effectiveName = appName || banner?.app || banner?.title || 'App';
  const initial = String(effectiveName).trim().charAt(0).toLocaleUpperCase('tr-TR') || 'A';
  const grad = generateAppGradient(effectiveName);

  return (
    <div
      className="notif-custom-app-badge"
      style={{
        background: `linear-gradient(135deg, ${grad.hex}, ${grad.secondaryHex})`,
      }}
    >
      <span className="notif-badge-letter">{initial}</span>
    </div>
  );
}
function RoboDockIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <rect x="1.5" y="3.5" width="15" height="11" rx="5.5" stroke="currentColor" strokeWidth="1.6" />
      <line x1="7" y1="7" x2="7" y2="11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <line x1="11" y1="7" x2="11" y2="11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

const CLOCK_COLORS = [
  '#ffffff',
  '#f4bfd4',
  '#f0687e',
  '#f2a359',
  '#f7dc6f',
  '#76e094',
  '#6dd5fa',
  '#8ab4f8',
  '#c2a5f9',
];

const MODE_PRESETS = {
  Work: { blockSocial: true, onlyClaude: true, keepMusic: true },
  Study: { blockSocial: true, onlyClaude: false, keepMusic: true },
  Sleep: { blockSocial: true, onlyClaude: false, keepMusic: false },
  Game: { blockSocial: false, onlyClaude: false, keepMusic: true },
  Serbest: { blockSocial: false, onlyClaude: false, keepMusic: true },
};
const MODE_OPTIONS = [
  { id: 'Work', label: 'Work', icon: Briefcase, color: '#74a9ff' },
  { id: 'Study', label: 'Study', icon: BookOpen, color: '#bd9bff' },
  { id: 'Sleep', label: 'Sleep', icon: Moon, color: '#8d91ff' },
  { id: 'Game', label: 'Game', icon: Gamepad2, color: '#ffad66' },
  { id: 'Serbest', label: 'Serbest', icon: Radio, color: '#75e6ad' },
];

const GHELPER_PERF_MODES = {
  0: { name: 'Dengeli', color: '#38a6ff', icon: Car },
  1: { name: 'Turbo', color: '#ff453a', icon: Rocket },
  2: { name: 'Sessiz', color: '#64d2ff', icon: Bike },
};

const GHELPER_GPU_MODES = {
  0: { name: 'Eko', color: '#00b874', icon: Leaf },
  1: { name: 'Standart', color: '#0a84ff', icon: Flower2 },
  2: { name: 'Ultimate', color: '#ff453a', icon: Gamepad2 },
  3: { name: 'Optimize', color: '#ffd60a', icon: RotateCw },
};

const MAIL_FOLDERS = [
  { id: 'primary', label: 'Öncelikli', countKey: 'primary', icon: Inbox, url: 'https://mail.google.com/mail/u/0/#inbox' },
  { id: 'updates', label: 'Güncellemeler', countKey: 'updates', icon: RotateCw, url: 'https://mail.google.com/mail/u/0/#category/updates' },
  { id: 'promotions', label: 'Tanıtımlar', countKey: 'promotions', icon: Tag, url: 'https://mail.google.com/mail/u/0/#category/promotions' },
];

function AiProviderLogo({ provider, size = 18 }) {
  const normalized = String(provider || '').toLowerCase();
  if (normalized === 'gemini') {
    return <RealAppIcon sc={{ id: 'gemini-provider-mark', type: 'gemini' }} size={size} />;
  }
  if (normalized === 'claude') {
    return (
      <svg className="ai-provider-logo claude-logo" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M17.304 3.541h-3.672l6.696 16.918H24Zm-10.608 0L0 20.459h3.744l1.37-3.553h7.005l1.369 3.553h3.744L10.536 3.541Zm-.371 10.223L8.616 7.82l2.291 5.945Z" />
      </svg>
    );
  }
  return (
    <svg className="ai-provider-logo openai-logo" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M22.282 9.821a6 6 0 0 0-.516-4.91a6.05 6.05 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a6 6 0 0 0-3.998 2.9a6.05 6.05 0 0 0 .743 7.097a5.98 5.98 0 0 0 .51 4.911a6.05 6.05 0 0 0 6.515 2.9A6 6 0 0 0 13.26 24a6.06 6.06 0 0 0 5.772-4.206a6 6 0 0 0 3.997-2.9a6.06 6.06 0 0 0-.747-7.073M13.26 22.43a4.48 4.48 0 0 1-2.876-1.04l.141-.081l4.779-2.758a.8.8 0 0 0 .392-.681v-6.737l2.02 1.168a.07.07 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494M3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085l4.783 2.759a.77.77 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646M2.34 7.896a4.5 4.5 0 0 1 2.366-1.973V11.6a.77.77 0 0 0 .388.677l5.815 3.354l-2.02 1.168a.08.08 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.08.08 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667m2.01-3.023l-.141-.085l-4.774-2.782a.78.78 0 0 0-.785 0L9.409 9.23V6.897a.07.07 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zM8.306 12.863l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.376-3.454l-.142.081L8.704 5.46a.8.8 0 0 0-.393.681zm1.098-2.365l2.602-1.5l2.607 1.5v2.999l-2.597 1.5l-2.607-1.5z" />
    </svg>
  );
}

function readModePreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('twocode-mode-preferences') || '{}');
    const name = MODE_PRESETS[saved.selectedModeName] ? saved.selectedModeName : 'Work';
    return { selectedModeName: name, modeToggles: { ...MODE_PRESETS[name], ...(saved.modeToggles || {}) } };
  } catch {
    return { selectedModeName: 'Work', modeToggles: { ...MODE_PRESETS.Work } };
  }
}

function readClockPreferences() {
  try {
    return JSON.parse(localStorage.getItem('twocode-clock-preferences') || '{}');
  } catch {
    return {};
  }
}

const HOME_LAYOUTS = [
  { id: 'clock', name: 'Clock' },
  { id: 'grid', name: 'Grid' },
  { id: 'dial', name: 'Dial' },
  { id: 'minimal', name: 'Minimal' },
];

function renderTooltipContent(text) {
  if (!text) return null;

  // Format "Title (Hint)" - e.g. "Ses Kontrolü (Tıkla: Sessize Al, Tekerlek: Ses Aç/Kıs)"
  const parenMatch = text.match(/^(.*?)\s*\((.*?)\)$/);
  if (parenMatch) {
    const mainTitle = parenMatch[1].trim();
    const hint = parenMatch[2].trim();
    return (
      <div className="modern-tooltip-inner">
        <span className="modern-tooltip-main">{mainTitle}</span>
        <span className="modern-tooltip-kbd">{hint}</span>
      </div>
    );
  }

  // Format "Category: Value" - e.g. "G-Helper Performans: Turbo" or "G-Helper GPU: Eko"
  if (text.includes(': ') && !text.startsWith('http')) {
    const idx = text.indexOf(': ');
    const label = text.slice(0, idx).trim();
    const value = text.slice(idx + 2).trim();
    return (
      <div className="modern-tooltip-inner">
        <span className="modern-tooltip-label">{label}</span>
        <span className="modern-tooltip-pill">{value}</span>
      </div>
    );
  }

  // Format "Primary · Secondary"
  if (text.includes(' · ')) {
    const parts = text.split(' · ');
    return (
      <div className="modern-tooltip-inner">
        <span className="modern-tooltip-main">{parts[0]}</span>
        <span className="modern-tooltip-sep">•</span>
        <span className="modern-tooltip-sub">{parts.slice(1).join(' · ')}</span>
      </div>
    );
  }

  return <span className="modern-tooltip-main">{text}</span>;
}

export default function App() {
  // Island mode: 'idle' | 'mini-progress' | 'battery' | 'music-bar' | 'expanded'
  const [islandMode, setIslandMode] = useState('idle');
  const [gameModeActive, setGameModeActive] = useState(false);
  // Right-click thin progress bar toggle
  const [isMiniProgressBar, setIsMiniProgressBar] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  // Overlay inside expanded island: null | 'all-apps' | 'customize-carousel' | 'mirror'
  const [islandOverlay, setIslandOverlay] = useState(null);
  const [homeLayoutIndex, setHomeLayoutIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [notificationHistoryOpen, setNotificationHistoryOpen] = useState(false);
  const notificationHistoryPanelRef = useRef(null);
  const notificationHistoryTriggerRef = useRef(null);
  const [notificationHistory, setNotificationHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('twocode-notification-history') || '[]')
        .filter(shouldPersistNotification)
        .slice(0, 100)
        .map((item) => ({ ...item, isRead: item.isRead !== false }));
    }
    catch { return []; }
  });
  const [quitConfirming, setQuitConfirming] = useState(false);
  const [showControlCenter, setShowControlCenter] = useState(false);
  const [networkInfo, setNetworkInfo] = useState({ wifi: 'Ağ aranıyor…', bluetooth: 'On', wifiConnected: false, wifiState: null, bluetoothState: null });
  const [radioBusy, setRadioBusy] = useState('');
  const [radioError, setRadioError] = useState('');
  const [radioPanel, setRadioPanel] = useState('');
  const [radioScanBusy, setRadioScanBusy] = useState(false);
  const [wifiNetworks, setWifiNetworks] = useState([]);
  const [bluetoothDevices, setBluetoothDevices] = useState([]);

  // Clock & Customization state
  const [now, setNow] = useState(new Date());
  const [batteryDelta] = useState(-10);
  const [batteryPercent, setBatteryPercent] = useState(80);
  const [batteryCharging, setBatteryCharging] = useState(false);
  const [batteryAlertKind, setBatteryAlertKind] = useState('charging');
  const [isCustomizingClock, setIsCustomizingClock] = useState(false);
  const [clockFontIndex, setClockFontIndex] = useState(() => {
    const value = Number(readClockPreferences().fontIndex);
    return Number.isInteger(value) && value >= 0 && value <= 4 ? value : 3;
  });
  const [clockColor, setClockColor] = useState(() => readClockPreferences().color || '#ffffff');
  const [userPickedClockColor, setUserPickedClockColor] = useState(() => readClockPreferences().customColor === true);
  const [clockScale, setClockScale] = useState(() => {
    const value = Number(readClockPreferences().scale);
    return Number.isFinite(value) ? Math.min(1.12, Math.max(0.78, value)) : 1;
  });
  const [clock24Hour, setClock24Hour] = useState(() => readClockPreferences().clock24Hour !== false);
  const [clockShowSeconds, setClockShowSeconds] = useState(() => readClockPreferences().showSeconds === true);
  const [textFontIndex, setTextFontIndex] = useState(() => readTypographyPreferences().textFontIndex);
  const [showClockAdvanced, setShowClockAdvanced] = useState(false);

  // Modern Sleek Global Tooltip State
  const [tooltipState, setTooltipState] = useState({
    visible: false,
    text: '',
    x: 0,
    y: 0,
    placement: 'bottom',
  });
  const tooltipTimerRef = useRef(null);
  const activeTooltipElRef = useRef(null);
  const tooltipWarmRef = useRef(false);
  const tooltipWarmTimerRef = useRef(null);

  useEffect(() => {
    const handlePointerOver = (e) => {
      const target = e.target?.closest?.('[title], [data-tooltip], [data-modern-tooltip]');
      if (!target || target.closest('[data-no-tooltip]')) return;

      let text = target.getAttribute('data-modern-tooltip') || target.getAttribute('data-tooltip');
      if (!text && target.hasAttribute('title')) {
        text = target.getAttribute('title');
        target.setAttribute('data-modern-tooltip', text);
        target.removeAttribute('title');
      }

      if (!text || !text.trim()) return;

      if (activeTooltipElRef.current === target && tooltipState.visible) {
        return;
      }

      activeTooltipElRef.current = target;
      clearTimeout(tooltipTimerRef.current);

      const show = () => {
        if (activeTooltipElRef.current !== target) return;
        const rect = target.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const placement = rect.top < 100 ? 'bottom' : 'top';
        const y = placement === 'bottom' ? rect.bottom + 7 : rect.top - 7;

        setTooltipState({
          visible: true,
          text,
          x,
          y,
          placement,
        });

        tooltipWarmRef.current = true;
        clearTimeout(tooltipWarmTimerRef.current);
      };

      const delay = tooltipWarmRef.current ? 40 : 200;
      tooltipTimerRef.current = setTimeout(show, delay);
    };

    const hideTooltip = () => {
      clearTimeout(tooltipTimerRef.current);
      activeTooltipElRef.current = null;
      setTooltipState((prev) => (prev.visible ? { ...prev, visible: false } : prev));

      clearTimeout(tooltipWarmTimerRef.current);
      tooltipWarmTimerRef.current = setTimeout(() => {
        tooltipWarmRef.current = false;
      }, 350);
    };

    const handlePointerOut = (e) => {
      if (activeTooltipElRef.current && !e.relatedTarget?.closest?.('[data-modern-tooltip], [data-tooltip], [title]')) {
        hideTooltip();
      }
    };

    const handlePointerDown = () => {
      hideTooltip();
    };

    document.addEventListener('pointerover', handlePointerOver, true);
    document.addEventListener('pointerout', handlePointerOut, true);
    document.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('scroll', hideTooltip, true);

    return () => {
      document.removeEventListener('pointerover', handlePointerOver, true);
      document.removeEventListener('pointerout', handlePointerOut, true);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('scroll', hideTooltip, true);
      clearTimeout(tooltipTimerRef.current);
      clearTimeout(tooltipWarmTimerRef.current);
    };
  }, [tooltipState.visible]);

  useEffect(() => {
    localStorage.setItem('twocode-clock-preferences', JSON.stringify({
      fontIndex: clockFontIndex,
      color: clockColor,
      customColor: userPickedClockColor,
      scale: clockScale,
      clock24Hour,
      showSeconds: clockShowSeconds,
    }));
  }, [clockFontIndex, clockColor, userPickedClockColor, clockScale, clock24Hour, clockShowSeconds]);

  useEffect(() => {
    applyTypographyTokens({ textFontIndex, numberFontIndex: clockFontIndex });
  }, [textFontIndex, clockFontIndex]);

  useEffect(() => {
    const syncTypography = (event) => {
      if (event.key === TYPOGRAPHY_STORAGE_KEY) {
        setTextFontIndex(readTypographyPreferences().textFontIndex);
      }
      if (event.key === 'twocode-clock-preferences' && event.newValue) {
        try {
          const value = Number(JSON.parse(event.newValue).fontIndex);
          if (Number.isInteger(value) && value >= 0 && value < CLOCK_FONT_FAMILIES.length) setClockFontIndex(value);
        } catch { /* Ignore malformed storage updates. */ }
      }
    };
    window.addEventListener('storage', syncTypography);
    return () => window.removeEventListener('storage', syncTypography);
  }, []);

  // Live Windows Media (SMTC) state — NO mock track
  const [liveMedia, setLiveMedia] = useState({
    hasSession: false,
    title: '',
    artist: '',
    album: '',
    isPlaying: false,
    position: 0,
    duration: 0,
    thumbnail: '',
    lyrics: [],
  });

  // Focus / Timer state
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const rulerRef = useRef(null);
  const [isDraggingRuler, setIsDraggingRuler] = useState(false);
  const [showPlayOnPopover, setShowPlayOnPopover] = useState(false);
  const [showMusicServicePicker, setShowMusicServicePicker] = useState(false);
  const [hoverAddApp, setHoverAddApp] = useState(false);

  // AI Agent (Claude / Codex / Gemini / Antigravity) state — NO mock prompts
  const [selectedAiProvider, setSelectedAiProvider] = useState('Gemini');
  const [jobsToday, setJobsToday] = useState(0);
  const [roboMood, setRoboMood] = useState('normal');
  const [roboReaction, setRoboReaction] = useState(null);
  const [documentVisible, setDocumentVisible] = useState(() => document.visibilityState !== 'hidden');
  const appMountedAtRef = useRef(Date.now());
  const roboReactionRef = useRef(null);
  const roboReactionTimerRef = useRef(null);
  const roboReactionKeyRef = useRef(0);
  const previousMediaRef = useRef(null);
  const previousTabRef = useRef(activeTab);
  const previousTimerRunningRef = useRef(timerRunning);
  const previousTimerSecondsRef = useRef(timerSeconds);
  const previousBatteryChargingRef = useRef(batteryCharging);
  const previousBatteryLowRef = useRef(batteryPercent <= 20);
  const previousClipboardIdRef = useRef(null);
  const [codexHistory, setCodexHistory] = useState([]);
  const [claudeHistory, setClaudeHistory] = useState([]);
  const [geminiHistory, setGeminiHistory] = useState([]);
  const [antigravityHistory, setAntigravityHistory] = useState([]);
  const [agentActivity, setAgentActivity] = useState([]);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [activeHookTask, setActiveHookTask] = useState(null);

  // Robo Ask state
  const [roboQuestion, setRoboQuestion] = useState('');
  const [roboReply, setRoboReply] = useState(null);
  const [roboReplyProvider, setRoboReplyProvider] = useState(null);
  const [roboLoading, setRoboLoading] = useState(false);

  // G-Helper live status (performance_mode & gpu_mode)
  const [ghelperStatus, setGhelperStatus] = useState({
    performanceMode: 0,
    performanceName: 'Dengeli',
    gpuMode: 0,
    gpuName: 'Standart',
    gpuAuto: false,
  });

  useEffect(() => {
    let mounted = true;
    if (window.twocode?.getGHelperStatus) {
      window.twocode.getGHelperStatus().then((status) => {
        if (mounted && status) {
          setGhelperStatus((prev) => ({ ...prev, ...status }));
        }
      });
    }

    const unsub = window.twocode?.onGHelperStatusUpdate?.((status) => {
      if (mounted && status) {
        setGhelperStatus((prev) => ({ ...prev, ...status }));
      }
    });

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, []);

  const triggerRoboReaction = useCallback((name, priority = 2, duration = 1250) => {
    if (!name || document.visibilityState === 'hidden') return;
    const current = roboReactionRef.current;
    if (current && current.priority > priority && current.expiresAt > Date.now()) return;
    if (roboReactionTimerRef.current) clearTimeout(roboReactionTimerRef.current);
    const next = { name, priority, key: ++roboReactionKeyRef.current, expiresAt: Date.now() + duration };
    roboReactionRef.current = next;
    setRoboReaction(next);
    roboReactionTimerRef.current = setTimeout(() => {
      if (roboReactionRef.current?.key !== next.key) return;
      roboReactionRef.current = null;
      setRoboReaction(null);
      roboReactionTimerRef.current = null;
    }, duration);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState !== 'hidden';
      setDocumentVisible(visible);
      if (!visible) {
        if (roboReactionTimerRef.current) clearTimeout(roboReactionTimerRef.current);
        roboReactionTimerRef.current = null;
        roboReactionRef.current = null;
        setRoboReaction(null);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (roboReactionTimerRef.current) clearTimeout(roboReactionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (previousTabRef.current !== activeTab) {
      previousTabRef.current = activeTab;
      triggerRoboReaction('tab-change', 1, 850);
    }
  }, [activeTab, triggerRoboReaction]);

  useEffect(() => {
    if (timerRunning && !previousTimerRunningRef.current) {
      triggerRoboReaction('focus-start', 2, 1100);
    }
    if (
      !timerRunning && previousTimerRunningRef.current &&
      previousTimerSecondsRef.current <= 1 && timerSeconds === focusMinutes * 60
    ) {
      triggerRoboReaction('focus-complete', 3, 1650);
    }
    previousTimerRunningRef.current = timerRunning;
    previousTimerSecondsRef.current = timerSeconds;
  }, [timerRunning, timerSeconds, focusMinutes, triggerRoboReaction]);

  useEffect(() => {
    const isStartup = Date.now() - appMountedAtRef.current < 5000;
    if (batteryCharging && !previousBatteryChargingRef.current && !isStartup) {
      triggerRoboReaction('charging', 4, 1450);
    }
    const isLow = batteryPercent <= 20 && !batteryCharging;
    if (isLow && !previousBatteryLowRef.current && !isStartup) {
      triggerRoboReaction('battery-low', 4, 1450);
    }
    previousBatteryChargingRef.current = batteryCharging;
    previousBatteryLowRef.current = isLow;
  }, [batteryCharging, batteryPercent, triggerRoboReaction]);

  // MODES tab state
  const [selectedModeName, setSelectedModeName] = useState(() => readModePreferences().selectedModeName);
  const [modeToggles, setModeToggles] = useState(() => readModePreferences().modeToggles);

  useEffect(() => {
    try { localStorage.setItem('twocode-mode-preferences', JSON.stringify({ selectedModeName, modeToggles })); } catch {}
  }, [selectedModeName, modeToggles]);

  // TRAY tab & Global Drag-Drop state
  const morphShellRef = useRef(null);

  const refreshRadioStates = async () => {
    const states = await window.twocode?.getRadioStates?.();
    if (states) {
      setNetworkInfo((current) => ({ ...current, ...states }));
      if (states.error) setRadioError(states.error);
    }
  };

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const [network, radios] = await Promise.all([
          window.twocode?.getNetworkInfo?.(),
          window.twocode?.getRadioStates?.(),
        ]);
        if (!mounted) return;
        setNetworkInfo((current) => ({ ...current, ...(network || {}), ...(radios || {}) }));
      } catch {}
    };
    refresh();
    const timer = setInterval(refresh, 12000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const toggleRadio = async (kind) => {
    if (radioBusy) return;
    setRadioBusy(kind);
    setRadioError('');
    playRoboSound('tap', islandSettings.soundEffects !== false);
    try {
      const result = await window.twocode?.toggleRadio?.(kind);
      if (!result?.success) {
        setRadioError(result?.error || 'Ayar değiştirilemedi.');
      } else {
        const key = kind === 'Wifi' ? 'wifiState' : 'bluetoothState';
        setNetworkInfo((current) => ({ ...current, [key]: result.state }));
      }
    } catch (err) {
      setRadioError(err?.message || 'Ayar değiştirilemedi.');
    } finally {
      setRadioBusy('');
    }
  };

  const scanWifiNetworks = async () => {
    setRadioPanel('wifi');
    setRadioScanBusy(true);
    setRadioError('');
    try {
      const result = await window.twocode?.scanWifiNetworks?.();
      if (result?.success) {
        setWifiNetworks(result.networks || []);
        if (result.connectedSsid) {
          setNetworkInfo((current) => ({ ...current, wifi: result.connectedSsid }));
        }
      } else {
        setWifiNetworks([]);
        setRadioError(result?.error || 'Wi-Fi ağları taranamadı.');
      }
    } catch (err) {
      setWifiNetworks([]);
      setRadioError(err?.message || 'Wi-Fi ağları taranamadı.');
    } finally {
      setRadioScanBusy(false);
    }
  };

  const scanBluetoothDevices = async () => {
    setRadioPanel('bluetooth');
    setRadioScanBusy(true);
    setRadioError('');
    try {
      const result = await window.twocode?.scanBluetoothDevices?.();
      if (result?.success) setBluetoothDevices(result.devices || []);
      else {
        setBluetoothDevices([]);
        setRadioError(result?.error || 'Bluetooth aygıtları bulunamadı.');
      }
    } catch (err) {
      setBluetoothDevices([]);
      setRadioError(err?.message || 'Bluetooth aygıtları bulunamadı.');
    } finally {
      setRadioScanBusy(false);
    }
  };

  const pairBluetoothDevice = async (device) => {
    if (radioBusy) return;
    setRadioBusy(device.id);
    setRadioError('');
    try {
      const result = await window.twocode?.pairBluetoothDevice?.(device.id);
      if (!result?.success) setRadioError(result?.error || `“${device.name}” eşleştirilemedi.`);
      else {
        setRadioError('');
        scanBluetoothDevices();
      }
    } catch (err) {
      setRadioError(err?.message || 'Bluetooth eşleştirme başarısız oldu.');
    } finally {
      setRadioBusy('');
    }
  };

  // CLIPS tab state
  const [clips, setClips] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  // NOTE tab state (persisted in localStorage)
  const [notesText, setNotesText] = useState(() => {
    try {
      return localStorage.getItem('twocode_note') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('twocode_note', notesText);
    } catch {}
  }, [notesText]);

  const toggleNoteTask = (lineIndex) => {
    setNotesText((current) => current.split('\n').map((line, index) => {
      if (index !== lineIndex) return line;
      return /^\[x\]/i.test(line.trim())
        ? line.replace(/\[x\]/i, '[ ]')
        : line.replace(/^\s*\[\s?\]/, '[x]');
    }).join('\n'));
  };

  const appendNoteTask = () => {
    setNotesText((current) => `${current}${current && !current.endsWith('\n') ? '\n' : ''}[ ] `);
  };

  // Agenda event data is owned here; its calendar UI is isolated in AgendaCalendar.
  const [agendaItems, setAgendaItems] = useState([]);

  // Real Google Data (Gmail & Calendar - Zero mock, Firebase Spark / Local-First optimized)
  const [googleData, setGoogleData] = useState(null);
  const [mailCategory, setMailCategory] = useState('primary');
  const [mailCounts, setMailCounts] = useState({
    primary: 0,
    updates: 0,
    promotions: 0,
  });

  // User's custom apps synced from TwoCode Settings — EMPTY by default (no mock GHelper/YouTube)
  const [shortcuts, setShortcuts] = useState([]);
  const [islandSettings, setIslandSettings] = useState({
    eyeColorHex: '#ffffff',
    islandOpenMode: 'On hover',
    leftOfRobo: 'Nothing',
    rightOfRobo: 'Nothing',
    roboEyesVisible: true,
    lyricsEnabled: true,
    soundEffects: true,
    notifSound: 'Ding',
    googleConnected: false,
    googleEmail: '',
  });

  // Volume state for the `•••` popup slider and bottom dock button
  const [volumePercent, setVolumePercent] = useState(68);
  const [isMuted, setIsMuted] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const volumeBarRef = useRef(null);

  // Mirror webcam ref
  const mirrorVideoRef = useRef(null);
  const mirrorStreamRef = useRef(null);

  const batteryTimerRef = useRef(null);
  const hudTimerRef = useRef(null);
  const hudVisibleTimerRef = useRef(null);
  const notifTimerRef = useRef(null);
  const notifRemainingMsRef = useRef(0);
  const notifTimerStartedAtRef = useRef(0);
  const notifPrevModeRef = useRef('idle');
  const isShowingNotifToastRef = useRef(false);
  const hoverExpandTimerRef = useRef(null);
  const suppressGHelperHudUntilRef = useRef(0);

  // Live Windows System HUD (Volume & Screen Brightness) and Windows Notification Toast state
  const [hudOverlay, setHudOverlay] = useState({
    type: 'volume',
    value: 68,
    muted: false,
    ghelper: null,
  });
  const [isSystemHudVisible, setIsSystemHudVisible] = useState(false);
  const [toastBanner, setToastBanner] = useState({
    app: 'Windows',
    appId: '',
    logo: '',
    title: '',
    body: '',
  });
  useEffect(() => {
    try { localStorage.setItem('twocode-notification-history', JSON.stringify(notificationHistory.slice(0, 100))); } catch {}
  }, [notificationHistory]);
  const openNotification = (item) => {
    setNotificationHistory((items) => items.map((entry) => entry.id === item?.id ? { ...entry, isRead: true } : entry));
    if (item?.targetUrl || item?.appId) {
      window.twocode?.openNotificationTarget?.({ url: item.targetUrl || '', appId: item.appId || '' });
    }
    setNotificationHistoryOpen(false);
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    isShowingNotifToastRef.current = false;
    setIslandMode((mode) => mode === 'notif-toast' ? resolvedCollapsedModeRef.current : mode);
  };
  const notifLogoAccent = useDominantColor(toastBanner.logo);
  useEffect(() => {
    if (!toastBanner.id || !notifLogoAccent.isLiveCover) return;
    const logoAccent = { rgb: notifLogoAccent.rgb, hex: notifLogoAccent.hex, isLiveCover: true };
    setNotificationHistory((items) => items.map((item) => (
      item.id === toastBanner.id && !item.logoAccent?.isLiveCover
        ? { ...item, logoAccent }
        : item
    )));
  }, [toastBanner.id, notifLogoAccent.rgb, notifLogoAccent.hex, notifLogoAccent.isLiveCover]);
  const notifBrand = useMemo(
    () => resolveNotifBrand(toastBanner, notifLogoAccent),
    [toastBanner, notifLogoAccent]
  );
  const notifPresentation = useMemo(
    () => resolveNotificationPresentation(toastBanner),
    [toastBanner]
  );

  const liveMediaRef = useRef(liveMedia);
  liveMediaRef.current = liveMedia;
  const scrubberTrackRef = useRef(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(null);
  const [smoothPosition, setSmoothPosition] = useState(0);
  const lastMediaTickRef = useRef(Date.now());

  useEffect(() => {
    if (!isScrubbing && liveMedia && typeof liveMedia.position === 'number') {
      setSmoothPosition(liveMedia.position);
      lastMediaTickRef.current = Date.now();
    }
  }, [liveMedia?.position, liveMedia?.title, isScrubbing]);

  // Advance by real elapsed time so lyric timing stays locked to the media clock.
  useEffect(() => {
    const mediaTick = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min(1, Math.max(0, (now - lastMediaTickRef.current) / 1000));
      lastMediaTickRef.current = now;
      if (isScrubbing) return;
      const media = liveMediaRef.current;
      if (!media || !media.hasSession || !media.isPlaying) return;
      setSmoothPosition((prev) => {
        const next = prev + elapsed;
        return media.duration > 0 ? Math.min(media.duration, next) : next;
      });
    }, 250);
    return () => clearInterval(mediaTick);
  }, [isScrubbing]);

  // Active media comes strictly from live Windows SMTC with sub-second smooth position
  const currentMedia = useMemo(() => {
    if (liveMedia && liveMedia.hasSession && liveMedia.title) {
      return {
        ...liveMedia,
        isLive: true,
        position: smoothPosition,
        thumbnail: liveMedia.thumbnail || '',
        lyrics: liveMedia.lyrics || [],
      };
    }
    return {
      hasSession: false,
      isLive: false,
      title: 'Nothing playing',
      artist: 'Play music or a video',
      album: '',
      isPlaying: false,
      position: 0,
      duration: 0,
      thumbnail: '',
      lyrics: [],
    };
  }, [liveMedia, smoothPosition]);

  const musicAccent = useDominantColor(currentMedia.thumbnail);

  // When nothing is playing, clock is crisp white (#ffffff) as in media_1794022256939_a2c228a1.jpg;
  // when a live cover is active, clock adapts to cover color unless user picked a fixed color
  const effectiveClockColor =
    userPickedClockColor
      ? clockColor
      : musicAccent.isLiveCover && islandSettings.islandMusicColour !== false
      ? musicAccent.hex
      : '#ffffff';

  // Synced lyrics & karaoke line progress calculation with accurate intro & break handling
  const { hasSyncedLyrics, primaryLine, secondaryLine } = useMemo(() => {
    const list = currentMedia.lyrics || [];
    if (islandSettings.lyricsEnabled !== false && list.length > 0) {
      const pos = currentMedia.position || 0;

      // Handle instrumental intro before first sung line
      if (list[0]?.time && pos < (list[0].time - 0.5)) {
        return {
          hasSyncedLyrics: true,
          primaryLine: currentMedia.title,
          secondaryLine: list[0]?.text || '',
        };
      }

      let idx = 0;
      for (let i = 0; i < list.length; i++) {
        if (pos >= list[i].time) {
          idx = i;
        } else {
          break;
        }
      }
      const currItem = list[idx];
      const rawText = (currItem?.text || '').trim();
      const nextRawText = (list[idx + 1]?.text || '').trim();

      return {
        hasSyncedLyrics: true,
        primaryLine: rawText || '♪ ♪ ♪',
        secondaryLine: nextRawText || '',
      };
    }
    return {
      hasSyncedLyrics: false,
      primaryLine: currentMedia.title || 'Nothing playing',
      secondaryLine: currentMedia.artist || '',
    };
  }, [currentMedia, islandSettings.lyricsEnabled]);

  // Dynamic width for the compact music/karaoke notch taking into account cover art + lyric + soundwave
  const dynamicMusicBarWidth = useMemo(() => {
    const text = primaryLine || currentMedia.title || '';
    const charLen = Math.min(38, Math.max(8, text.length));
    // A compact cap keeps the media notch from covering neighboring dock tabs.
    return Math.round(Math.min(322, Math.max(222, charLen * 5.2 + 170)));
  }, [primaryLine, currentMedia.title]);

  // Determine which collapsed state to use when mouse leaves
  // IMPORTANT: Only show music-bar when media is actively playing (`currentMedia.isPlaying`).
  // When paused or stopped, return to Robo's glowing eyes (`idle`).
  const resolvedCollapsedMode = useMemo(() => {
    // Fullscreen Game Mode keeps Robo visible even when a browser video has an SMTC session.
    if (gameModeActive) return 'idle';
    const isActivelyPlaying = Boolean(currentMedia.hasSession && currentMedia.isPlaying);
    if (isMiniProgressBar && isActivelyPlaying) {
      return 'mini-progress';
    }
    if (timerRunning) {
      return isActivelyPlaying ? 'focus-bar-media' : 'focus-bar';
    }
    if (isActivelyPlaying) {
      return 'music-bar';
    }
    return 'idle';
  }, [
    isMiniProgressBar,
    gameModeActive,
    timerRunning,
    currentMedia.hasSession,
    currentMedia.isPlaying,
  ]);

  // Sync window shape & 60fps animation with Electron main process whenever islandMode or dynamicMusicBarWidth changes
  useEffect(() => {
    if (islandMode === 'music-bar') {
      window.twocode?.setIslandMode('music-bar', dynamicMusicBarWidth);
    } else {
      window.twocode?.setIslandMode(islandMode);
    }
  }, [islandMode, dynamicMusicBarWidth]);

  // Keep collapsed notch updated if media starts/pauses/stops while collapsed
  useEffect(() => {
    if (
      islandMode !== 'expanded' &&
      islandMode !== 'battery' &&
      islandMode !== 'hud' &&
      islandMode !== 'notif-toast'
    ) {
      setIslandMode(resolvedCollapsedMode);
    }
  }, [resolvedCollapsedMode]);

  // Startup wave sound
  useEffect(() => {
    const t = setTimeout(() => {
      playRoboSound('wave', true);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  // Manage webcam stream when Mirror app is opened/closed
  useEffect(() => {
    if (islandOverlay === 'mirror') {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 640, height: 360 }, audio: false })
        .then((stream) => {
          mirrorStreamRef.current = stream;
          if (mirrorVideoRef.current) {
            mirrorVideoRef.current.srcObject = stream;
          }
        })
        .catch(() => {});
    } else {
      if (mirrorStreamRef.current) {
        mirrorStreamRef.current.getTracks().forEach((tr) => tr.stop());
        mirrorStreamRef.current = null;
      }
    }
    return () => {
      if (mirrorStreamRef.current) {
        mirrorStreamRef.current.getTracks().forEach((tr) => tr.stop());
        mirrorStreamRef.current = null;
      }
    };
  }, [islandOverlay]);

  const resolvedCollapsedModeRef = useRef(resolvedCollapsedMode);
  useEffect(() => {
    resolvedCollapsedModeRef.current = resolvedCollapsedMode;
  }, [resolvedCollapsedMode]);

  const hasShown20AlertRef = useRef(false);

  // Keep the battery banner's lifetime tied to its visible state so every
  // entry path (battery API or the manual preview) dismisses consistently.
  useEffect(() => {
    if (islandMode !== 'battery') return undefined;
    batteryTimerRef.current = setTimeout(() => {
      setIslandMode((current) =>
        current === 'battery' ? resolvedCollapsedModeRef.current : current
      );
    }, 4800);
    return () => {
      clearTimeout(batteryTimerRef.current);
      batteryTimerRef.current = null;
    };
  }, [islandMode]);

  // Read real Windows battery percentage and alert only at exactly 20%.
  useEffect(() => {
    let batteryObj = null;
    let wasCharging = null;

    const triggerBatteryAlert = (pct) => {
      setBatteryPercent(pct);
      setBatteryCharging(false);
      setBatteryAlertKind('low');
      setIslandMode((current) => {
        if (current === 'expanded') return current;
        return 'battery';
      });
      playRoboSound('surprised', islandSettings.soundEffects !== false);
    };

    const triggerChargingAlert = () => {
      setBatteryCharging(true);
      setBatteryAlertKind('charging');
      setIslandMode((current) => (current === 'expanded' ? current : 'battery'));
      playRoboSound('happy', islandSettings.soundEffects !== false);
    };

    const handleBatteryChange = () => {
      if (!batteryObj) return;
      const isStartup = Date.now() - appMountedAtRef.current < 5000;
      const nextPct = Math.round(batteryObj.level * 100);
      setBatteryPercent(nextPct);

      if (batteryObj.charging) {
        setBatteryCharging(true);
        if (wasCharging === false && !isStartup) triggerChargingAlert();
        wasCharging = true;
        hasShown20AlertRef.current = false;
        return;
      }
      setBatteryCharging(false);
      wasCharging = false;

      if (nextPct > 20) {
        hasShown20AlertRef.current = false;
        return;
      }

      if (nextPct === 20 && !batteryObj.charging && !hasShown20AlertRef.current && !isStartup) {
        hasShown20AlertRef.current = true;
        triggerBatteryAlert(nextPct);
      }
    };

    if (navigator.getBattery) {
      navigator
        .getBattery()
        .then((bat) => {
          batteryObj = bat;
          wasCharging = Boolean(bat.charging);
          previousBatteryChargingRef.current = wasCharging;
          setBatteryCharging(wasCharging);
          const pct = Math.round(bat.level * 100);
          if (pct > 0 && pct <= 100) {
            setBatteryPercent(pct);
            previousBatteryLowRef.current = pct <= 20 && !wasCharging;
          }
          bat.addEventListener('levelchange', handleBatteryChange);
          bat.addEventListener('chargingchange', handleBatteryChange);
        })
        .catch(() => {});
    }
    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('levelchange', handleBatteryChange);
        batteryObj.removeEventListener('chargingchange', handleBatteryChange);
      }
      if (batteryTimerRef.current) clearTimeout(batteryTimerRef.current);
    };
  }, []);

  // Clock & Timers tick every 1s + smooth client-side media position interpolation
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      setTimerSeconds((prev) => {
        if (!timerRunning) return prev;
        if (prev <= 1) {
          setTimerRunning(false);
          playNotifSound(islandSettings.notifSound || 'Ding', islandSettings.soundEffects !== false);
          playRoboSound('happy', islandSettings.soundEffects !== false);
          setRoboMood('happy');
          return focusMinutes * 60;
        }
        return prev - 1;
      });

    }, 1000);
    return () => clearInterval(timer);
  }, [timerRunning, focusMinutes, islandSettings.notifSound, islandSettings.soundEffects, triggerRoboReaction]);

  // Connect to Electron IPC bridges
  useEffect(() => {
    if (!window.twocode) return;

    const showIslandNotification = (notif) => {
      if (!notif || (!notif.title && !notif.body)) return;
      if (islandSettings.doNotDisturb || islandSettings.windowsNotifications === false) return;
      const isGHelperFeedback = /^(ghelper|g-helper)$/i.test(`${notif.app || ''}`) || /(?:^|[\s_-])g-?helper(?:$|[\s_-])/i.test(`${notif.appId || ''}`);
      if (!notif.isAgentActivity && !isGHelperFeedback && modeToggles.onlyClaude && !/claude|anthropic/i.test(`${notif.app || ''} ${notif.appId || ''}`)) return;
      const notifId = notif.id || `notification_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const notification = {
        id: notifId,
        app: notif.app || 'Windows',
        appId: notif.appId || '',
        accentHex: notif.accentHex || '',
        accentRgb: notif.accentRgb || '',
        accentSecondaryHex: notif.accentSecondaryHex || '',
        accentSecondaryRgb: notif.accentSecondaryRgb || '',
        logo: notif.logo || '',
        profileImage: notif.profileImage || notif.avatar || '',
        sender: notif.sender || '',
        notificationKind: notif.notificationKind || '',
        callKind: notif.callKind || '',
        title: notif.title || notif.app || 'Notification',
        body: notif.body || '',
        targetUrl: notif.targetUrl || '',
        isAgentActivity: Boolean(notif.isAgentActivity),
      };

      setToastBanner(notification);
      if (shouldPersistNotification(notification)) {
        setNotificationHistory((items) => [{ ...notification, timestamp: Date.now(), isRead: false }, ...items.filter((item) => item.id !== notifId)].slice(0, 100));
      }
      playNotifSound(islandSettings.notifSound || 'Ding', islandSettings.soundEffects !== false);
      setRoboMood('surprised');
      triggerRoboReaction('notification', 4, 1450);
      setTimeout(() => setRoboMood('normal'), 2600);

      const stayMs = Math.max(3000, (Number(islandSettings.notifDurationSec) || 5) * 1000);
      isShowingNotifToastRef.current = true;
      setIslandMode((curr) => {
        const prevMode = curr === 'notif-toast' ? resolvedCollapsedModeRef.current : curr;
        if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
        notifPrevModeRef.current = prevMode;
        notifRemainingMsRef.current = stayMs;
        notifTimerStartedAtRef.current = Date.now();
        notifTimerRef.current = setTimeout(() => {
          isShowingNotifToastRef.current = false;
          notifRemainingMsRef.current = 0;
          notifTimerRef.current = null;
          setIslandMode(prevMode);
        }, stayMs);
        return 'notif-toast';
      });
    };

    window.twocode.getSettings?.().then((saved) => {
      if (saved && typeof saved === 'object') {
        setShortcuts(Array.isArray(saved.apps) ? saved.apps : []);
        setIslandSettings((prev) => ({ ...prev, ...saved }));
      }
    });

    const unsubSettings = window.twocode.onSettingsUpdated?.((updated) => {
      if (updated && typeof updated === 'object') {
        if (Array.isArray(updated.apps)) {
          setShortcuts(updated.apps);
        }
        setIslandSettings((prev) => ({ ...prev, ...updated }));
      }
    });

    const unsubEmotion = window.twocode.onIslandEmotion?.((emotion) => {
      if (emotion) {
        setRoboMood(emotion);
        playRoboSound(emotion, true);
        setTimeout(() => setRoboMood('normal'), 3200);
      }
    });

    window.twocode.getAiHistory?.().then((hist) => {
      if (hist) {
        setCodexHistory(Array.isArray(hist.codexJobs) ? hist.codexJobs : []);
        setClaudeHistory(Array.isArray(hist.claudeJobs) ? hist.claudeJobs : []);
        setGeminiHistory(Array.isArray(hist.geminiJobs) ? hist.geminiJobs : []);
        setAntigravityHistory(Array.isArray(hist.antigravityJobs) ? hist.antigravityJobs : []);
        if (typeof hist.jobsToday === 'number') {
          setJobsToday(hist.jobsToday);
        }
      }
    });

    const unsubAiHist = window.twocode.onAiHistoryUpdate?.((hist) => {
      if (!hist) return;
      setCodexHistory(Array.isArray(hist.codexJobs) ? hist.codexJobs : []);
      setClaudeHistory(Array.isArray(hist.claudeJobs) ? hist.claudeJobs : []);
      setGeminiHistory(Array.isArray(hist.geminiJobs) ? hist.geminiJobs : []);
      setAntigravityHistory(Array.isArray(hist.antigravityJobs) ? hist.antigravityJobs : []);
      if (typeof hist.jobsToday === 'number') {
        setJobsToday(hist.jobsToday);
      }
    });

    // Mail is paused; keep its Google data wiring here for a later reactivation.
    // window.twocode.getGoogleData?.().then((g) => {
    //   if (g) {
    //     setGoogleData(g);
    //     if (g.mailCounts) setMailCounts({ ...g.mailCounts });
    //   }
    // });
    // const unsubGoogle = window.twocode.onGoogleDataUpdate?.((g) => {
    //   if (!g) return;
    //   setGoogleData(g);
    //   if (g.mailCounts) setMailCounts({ ...g.mailCounts });
    // });

    window.twocode.getAgendaEvents?.().then((events) => {
      if (Array.isArray(events)) setAgendaItems(events);
    });
    const unsubAgenda = window.twocode.onAgendaEventsUpdate?.((events) => {
      if (Array.isArray(events)) setAgendaItems(events);
    });

    window.twocode.getMediaStatus?.().then((m) => {
      if (m) setLiveMedia(m);
    });

    const unsubHover = window.twocode.onNotchHoverChange?.((hovering) => {
      if (gameModeActive) return;
      if (isShowingNotifToastRef.current) return;
      if (hovering) {
        if (!isMiniProgressBar) {
          setIslandMode('expanded');
        }
      } else {
        setShowMenu(false);
        setShowMusicServicePicker(false);
        setIsDraggingRuler(false);
        setIsDraggingVolume(false);
        if (!pendingApproval) {
          setIslandMode(resolvedCollapsedMode);
        }
      }
    });

    const handleGameModeChange = (active) => {
      setGameModeActive(Boolean(active));
      if (active) {
        setIslandMode('idle');
        setShowMenu(false);
        setNotificationHistoryOpen(false);
        setShowMusicServicePicker(false);
      } else {
        setIslandMode(resolvedCollapsedModeRef.current);
      }
    };
    const unsubGameMode = window.twocode.onGameModeChange?.(handleGameModeChange);
    window.twocode.isGameModeActive?.().then(handleGameModeChange).catch(() => {});

    const unsubMedia = window.twocode.onMediaUpdate((data) => {
      const nextMedia = data || { hasSession: false, isPlaying: false };
      const previousMedia = previousMediaRef.current;
      if (previousMedia) {
        if (nextMedia.isPlaying && !previousMedia.isPlaying) {
          triggerRoboReaction('media-start', 2);
        } else if (!nextMedia.isPlaying && previousMedia.isPlaying) {
          triggerRoboReaction('media-pause', 2);
        } else if (
          nextMedia.isPlaying && previousMedia.isPlaying &&
          nextMedia.title && nextMedia.title !== previousMedia.title
        ) {
          triggerRoboReaction('media-change', 2);
        }
      }
      previousMediaRef.current = nextMedia;
      if (data && data.hasSession) {
        setShowMusicServicePicker(false);
      }
      setLiveMedia(nextMedia);
    });

    const unsubClip = window.twocode.onClipboardUpdate((list) => {
      if (Array.isArray(list)) {
        const latestId = list[0]?.id ?? null;
        if (latestId !== null && (previousClipboardIdRef.current === null || latestId !== previousClipboardIdRef.current)) {
          triggerRoboReaction('clipboard', 1, 900);
        }
        previousClipboardIdRef.current = latestId;
        setClips(list);
      }
    });

    const unsubAgent = window.twocode.onAgentEvent((ev) => {
      const newEntry = {
        id: ev.id || `agent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        agent: ev.agent || selectedAiProvider,
        title: ev.detail || ev.title || ev.command || '',
        detail: ev.detail || '',
        time: new Date(ev.timestamp || Date.now()).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        type: ev.type || 'active',
      };
      setActiveHookTask(newEntry);
      setAgentActivity((items) => [newEntry, ...items.filter((item) => item.id !== newEntry.id)].slice(0, 12));

      const agentId = (ev.agent || '').toLowerCase();
      if (ev.type === 'done' && agentId.includes('claude')) setClaudeHistory((prev) => [newEntry, ...prev].slice(0, 15));
      else if (ev.type === 'done' && agentId.includes('antigravity')) setAntigravityHistory((prev) => [newEntry, ...prev].slice(0, 15));
      else if (ev.type === 'done' && agentId.includes('gemini')) setGeminiHistory((prev) => [newEntry, ...prev].slice(0, 15));
      else if (ev.type === 'done') setCodexHistory((prev) => [newEntry, ...prev].slice(0, 15));

      if (ev.type === 'approval') {
        setPendingApproval(ev);
        setRoboMood('curious');
        triggerRoboReaction('agent-approval', 3, 1500);
        setIslandMode('expanded');
        setActiveTab('code');
        playRoboSound('curious', true);
      } else {
        if (ev.type === 'done') setJobsToday((j) => j + 1);
      }
      if (ev.type === 'done') {
        setRoboMood('happy');
        triggerRoboReaction('success', 3, 1450);
      }
    });

    const unsubHud = window.twocode.onSystemHud?.((hud) => {
      if (!hud) return;
      if (hud.isInit || hud.type === 'init-audio') {
        if (typeof hud.value === 'number' && hud.value >= 0) setVolumePercent(hud.value);
        if (typeof hud.muted === 'boolean') setIsMuted(hud.muted);
        return;
      }
      if (hud.type === 'volume') {
        if (typeof hud.value === 'number') setVolumePercent(hud.value);
        if (typeof hud.muted === 'boolean') setIsMuted(hud.muted);
      }
      if (hud.type === 'ghelper') {
        if (hud.ghelper?.category === 'fnlock') {
          return;
        }
        if (hud.ghelper?.category === 'mode' && typeof hud.ghelper.modeIndex === 'number') {
          setGhelperStatus((prev) => ({
            ...prev,
            performanceMode: hud.ghelper.modeIndex,
            performanceName: hud.ghelper.valueText || prev.performanceName,
          }));
        }
        if (Date.now() < suppressGHelperHudUntilRef.current) {
          return;
        }
      }
      setHudOverlay({
        type: hud.type === 'brightness' ? 'brightness' : hud.type === 'ghelper' ? 'ghelper' : 'volume',
        value: typeof hud.value === 'number' ? hud.value : 0,
        muted: Boolean(hud.muted),
        ghelper: hud.ghelper || null,
      });
      setIsSystemHudVisible(true);
      if (hudVisibleTimerRef.current) clearTimeout(hudVisibleTimerRef.current);
      hudVisibleTimerRef.current = setTimeout(() => setIsSystemHudVisible(false), 2100);
      setIslandMode((curr) => {
        if (curr === 'expanded') return curr;
        if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
        hudTimerRef.current = setTimeout(() => {
          setIslandMode((c) => (c === 'hud' ? resolvedCollapsedModeRef.current : c));
        }, 2100);
        return 'hud';
      });
    });

    const unsubWinNotif = window.twocode.onWindowsNotification?.(showIslandNotification);

    return () => {
      if (unsubSettings) unsubSettings();
      if (unsubEmotion) unsubEmotion();
      if (unsubAiHist) unsubAiHist();
      if (unsubHover) unsubHover();
      if (unsubGameMode) unsubGameMode();
      if (unsubMedia) unsubMedia();
      if (unsubClip) unsubClip();
      if (unsubAgent) unsubAgent();
      if (unsubHud) unsubHud();
      if (unsubWinNotif) unsubWinNotif();
      // if (unsubGoogle) unsubGoogle(); // Mail is paused.
      if (unsubAgenda) unsubAgenda();
    };
  }, [
    selectedAiProvider,
    triggerRoboReaction,
    pendingApproval,
    resolvedCollapsedMode,
    gameModeActive,
    isMiniProgressBar,
    islandSettings.notifSound,
    islandSettings.soundEffects,
    islandSettings.doNotDisturb,
    islandSettings.windowsNotifications,
    islandSettings.notifDurationSec,
    selectedModeName,
    modeToggles.onlyClaude,
  ]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (notificationHistoryOpen) setNotificationHistoryOpen(false);
        if (showMenu) {
          setShowMenu(false);
          setQuitConfirming(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const handleOutsidePointer = (event) => {
      if (!notificationHistoryOpen) return;
      if (notificationHistoryPanelRef.current?.contains(event.target)) return;
      if (notificationHistoryTriggerRef.current?.contains(event.target)) return;
      setNotificationHistoryOpen(false);
    };
    document.addEventListener('pointerdown', handleOutsidePointer, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handleOutsidePointer, true);
    };
  }, [showMenu, notificationHistoryOpen]);

  // Format helpers
  const formatTimeHHMM = (d) => {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const formatClockDisplay = (d) => {
    const hour = d.getHours();
    const displayHour = clock24Hour ? hour : hour % 12 || 12;
    const time = `${String(displayHour).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}${clockShowSeconds ? `:${String(d.getSeconds()).padStart(2, '0')}` : ''}`;
    return { time, suffix: clock24Hour ? '' : hour < 12 ? 'AM' : 'PM' };
  };

  const renderDateTop = (d, compact = false) => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return (
      <span className={`topbar-date ${compact ? 'is-compact' : ''}`}>
        <span className="topbar-date-weekday">{days[d.getDay()]}</span>
        <span className="topbar-date-day clock-number-text">{d.getDate()}</span>
        <span className="topbar-date-month">{months[d.getMonth()]}</span>
      </span>
    );
  };

  const formatHMS = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatMMSS = (sec) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  const formatTimerBig = (sec) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  const doneAtTimeStr = useMemo(() => {
    const target = new Date(now.getTime() + timerSeconds * 1000);
    return formatTimeHHMM(target);
  }, [now, timerSeconds]);

  const showBatteryPopup = () => {
    setBatteryAlertKind('low');
    setIslandMode('battery');
    playRoboSound('surprised', islandSettings.soundEffects !== false);
  };

  // Right-click on the notch toggles the thin progress bar (`mini-progress`)
  const handleNotchContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    playRoboSound('tap', islandSettings.soundEffects !== false);
    if (islandMode === 'mini-progress' || isMiniProgressBar) {
      setIsMiniProgressBar(false);
      setIslandMode(currentMedia.hasSession && currentMedia.isPlaying ? 'music-bar' : 'idle');
    } else {
      setIsMiniProgressBar(true);
      setShowMenu(false);
      setIslandMode('mini-progress');
    }
  };

  // Media transport controls
  const handlePlayPause = (e) => {
    if (e) e.stopPropagation();
    playRoboSound('tap', islandSettings.soundEffects !== false);
    if (!currentMedia.hasSession) {
      setShowMusicServicePicker((prev) => !prev);
      return;
    }
    window.twocode?.mediaControl('playpause');
  };

  const handleLaunchMusicService = (e, service) => {
    if (e) e.stopPropagation();
    playRoboSound('tap', islandSettings.soundEffects !== false);
    setShowMusicServicePicker(false);
    window.twocode?.launchMusicService?.(service);
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    playRoboSound('tap', islandSettings.soundEffects !== false);
    window.twocode?.mediaControl('next');
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    playRoboSound('tap', islandSettings.soundEffects !== false);
    window.twocode?.mediaControl('prev');
  };

  const calculateScrubSeconds = (clientX) => {
    if (!scrubberTrackRef.current || !currentMedia.duration || currentMedia.duration <= 0) return null;
    const rect = scrubberTrackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * currentMedia.duration;
  };

  const handleScrubberMouseDown = (e) => {
    if (!currentMedia.hasSession || !currentMedia.duration || currentMedia.duration <= 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsScrubbing(true);
    const sec = calculateScrubSeconds(e.clientX);
    if (sec !== null) {
      setScrubPosition(sec);
      setSmoothPosition(sec);
    }

    const handleMouseMove = (moveEvent) => {
      const moveSec = calculateScrubSeconds(moveEvent.clientX);
      if (moveSec !== null) {
        setScrubPosition(moveSec);
        setSmoothPosition(moveSec);
      }
    };

    const handleMouseUp = (upEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsScrubbing(false);
      const finalSec = calculateScrubSeconds(upEvent.clientX);
      if (finalSec !== null) {
        setScrubPosition(null);
        setSmoothPosition(finalSec);
        window.twocode?.mediaControl?.('seek', finalSec);
      } else {
        setScrubPosition(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleScrubberClick = (e) => {
    if (!currentMedia.hasSession || !currentMedia.duration || currentMedia.duration <= 0) return;
    e.stopPropagation();
    const sec = calculateScrubSeconds(e.clientX);
    if (sec !== null) {
      setSmoothPosition(sec);
      window.twocode?.mediaControl?.('seek', sec);
    }
  };

  const updateRulerMinutes = (clientX) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const mins = Math.max(1, Math.min(60, Math.round(ratio * 60)));
    setFocusMinutes(mins);
    setTimerRunning(false);
    setTimerSeconds(mins * 60);
  };

  const updateVolumeFromMouse = (clientX) => {
    if (!volumeBarRef.current) return;
    const rect = volumeBarRef.current.getBoundingClientRect();
    const pct = Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
    if (pct > volumePercent) {
      window.twocode?.adjustVolume('up');
    } else if (pct < volumePercent) {
      window.twocode?.adjustVolume('down');
    }
    setVolumePercent(pct);
    setIsMuted(pct === 0);
  };

  const handleApprovalDecision = async (approved) => {
    if (!pendingApproval) return;
    const id = pendingApproval.id;
    await window.twocode?.resolveAgentApproval(id, approved);
    if (approved) {
      setJobsToday((j) => j + 1);
      setRoboMood('happy');
      playRoboSound('happy', islandSettings.soundEffects !== false);
    } else {
      setRoboMood('normal');
      playRoboSound('sad', islandSettings.soundEffects !== false);
    }
    setPendingApproval(null);
  };

  const submitRoboPrompt = async (promptText, explicitMode) => {
    if (roboLoading) return;
    let q = (promptText ?? roboQuestion).trim();
    if (!q) {
      if (explicitMode && lastClipboardText) {
        q = lastClipboardText;
      } else {
        return;
      }
    }
    setRoboLoading(true);
    setRoboMood('curious');
    triggerRoboReaction('thinking', 3, 1800);
    playRoboSound('curious', islandSettings.soundEffects !== false);
    const timeStr = formatTimeHHMM(new Date());
    const entry = {
      id: 'job_' + Date.now(),
      agent: selectedAiProvider,
      title: q.length > 55 ? q.slice(0, 52) + '...' : q,
      time: timeStr,
      status: 'working',
    };
    if (selectedAiProvider === 'Claude') {
      setClaudeHistory((prev) => [entry, ...prev]);
    } else if (selectedAiProvider === 'Antigravity') {
      setAntigravityHistory((prev) => [entry, ...prev]);
    } else {
      setCodexHistory((prev) => [entry, ...prev]);
    }
    try {
      const res = await window.twocode?.askRobo?.({
        question: q,
        provider: selectedAiProvider,
        mode: explicitMode,
      });
      if (!res) throw new Error('AI servisine ulaşılamadı. Uygulamayı yeniden başlatıp tekrar deneyin.');
      if (res.error) throw new Error(res.error);
      setRoboLoading(false);
      setRoboMood('happy');
      triggerRoboReaction('success', 3, 1450);
      playRoboSound('happy', islandSettings.soundEffects !== false);
      setJobsToday((j) => j + 1);
      setRoboReply(res?.text || 'Cevap hazırlandı.');
      setRoboReplyProvider(res?.provider || selectedAiProvider);
      setRoboQuestion('');
    } catch (err) {
      setRoboLoading(false);
      setRoboMood('sad');
      triggerRoboReaction('error', 3, 1450);
      playRoboSound('sad', islandSettings.soundEffects !== false);
      setRoboReply(err?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
      setRoboReplyProvider(selectedAiProvider);
    }
  };

  const handleSelectMode = (name) => {
    setSelectedModeName(name);
    playRoboSound('tap', islandSettings.soundEffects !== false);
    const preset = MODE_PRESETS[name] || MODE_PRESETS.Work;
    setModeToggles({
      blockSocial: preset.blockSocial,
      onlyClaude: preset.onlyClaude,
      keepMusic: preset.keepMusic,
    });
    if (name === 'Serbest') {
      const notificationSettings = { doNotDisturb: false, windowsNotifications: true };
      setIslandSettings((current) => ({ ...current, ...notificationSettings }));
      window.twocode?.saveSettings?.(notificationSettings);
    }
  };

  const handleVolumeClick = () => {
    setIsMuted((m) => !m);
    window.twocode?.adjustVolume('mute');
  };

  const handleVolumeWheel = (e) => {
    if (e.deltaY < 0) {
      setVolumePercent((v) => Math.min(100, v + 4));
      window.twocode?.adjustVolume('up');
    } else {
      setVolumePercent((v) => Math.max(0, v - 4));
      window.twocode?.adjustVolume('down');
    }
  };

  const handleAddShortcut = () => {
    window.twocode?.openSettingsWindow?.('apps');
  };

  // Mail and Robo chat are temporarily disabled; keep their entries for later.
  const navItems = [
    { id: 'home', label: 'HOME', icon: Home },
    { id: 'music', label: 'MUSIC', icon: Music },
    { id: 'code', label: 'AGENTS', icon: Terminal, badge: pendingApproval ? '!' : null },
    // { id: 'robo', label: 'ROBO', icon: RoboDockIcon },
    { id: 'timer', label: 'FOCUS', icon: Timer },
    { id: 'sleep', label: 'MODES', icon: Moon },
    { id: 'clips', label: 'CLIPS', icon: Copy },
    { id: 'notes', label: 'NOTE', icon: FileText },
    { id: 'cal', label: 'AGENDA', icon: Calendar },
    // { id: 'inbox', label: 'MAIL', icon: Mail },
  ];

  const activeRecentJobs = agentActivity;

  const progressPercent =
    currentMedia.duration > 0
      ? Math.min(100, Math.max(0, (currentMedia.position / currentMedia.duration) * 100))
      : currentMedia.hasSession
      ? 35
      : 0;
  const remainingSec = Math.max(0, (currentMedia.duration || 0) - (currentMedia.position || 0));

  // Robo's eyes reflect the most relevant live state; low battery color has priority.
  const topEyeMood = timerRunning || activeTab === 'timer'
    ? 'focus-arc'
    : currentMedia.hasSession && currentMedia.isPlaying
    ? 'music'
    : roboMood;

  const noteCheckItems = notesText
    .split('\n')
    .map((line, i) => ({ line, idx: i }))
    .filter((item) => item.line.trim().startsWith('[ ]') || item.line.trim().startsWith('[x]'));

  const currentLayoutId = HOME_LAYOUTS[homeLayoutIndex]?.id || 'clock';
  const clockDisplay = formatClockDisplay(now);
  const activeModeOption = MODE_OPTIONS.find((mode) => mode.id === selectedModeName) || MODE_OPTIONS[0];
  const ActiveModeIcon = activeModeOption.icon;
  const allNotificationsEnabled = islandSettings.windowsNotifications !== false && !islandSettings.doNotDisturb;
  const activeModeSummary = selectedModeName === 'Serbest'
    ? modeToggles.onlyClaude ? 'Yalnızca Claude bildirimleri' : allNotificationsEnabled ? 'Tüm bildirimler açık' : 'Bildirimler kapalı'
    : [modeToggles.onlyClaude ? 'Claude öncelikli' : '', modeToggles.blockSocial ? 'Sosyal sınırları açık' : ''].filter(Boolean).join(' · ') || 'Bildirimler serbest';
  const unreadNotificationCount = notificationHistory.filter((item) => !item.isRead).length;
  const currentMailFolder = MAIL_FOLDERS.find((folder) => folder.id === mailCategory) || MAIL_FOLDERS[0];
  const CurrentMailFolderIcon = currentMailFolder.icon;
  const mailIsConnected = Boolean(googleData?.connected || islandSettings.googleConnected);
  const latestMailItems = Array.isArray(googleData?.latestMails) ? googleData.latestMails : [];
  const visibleMailItems = latestMailItems.filter((item) => {
    const category = String(item.category || item.label || '').toLowerCase();
    const categoryMatches = mailCategory === 'primary'
      ? !category || /primary|inbox|birincil|öncelikli/.test(category)
      : mailCategory === 'updates'
      ? /updates|güncellemeler/.test(category)
      : /promotions|tanıtımlar|promosyon/.test(category);
    return categoryMatches;
  });
  const openNotificationHistory = () => {
    setShowMenu(false);
    setNotificationHistory((items) => items.map((item) => ({ ...item, isRead: true })));
    setNotificationHistoryOpen((open) => !open);
  };
  const handleAddAgendaEvent = (event) => {
    if (!event?.title || !event?.time) return;
    window.twocode?.addAgendaEvent?.(event);
  };
  const handleDeleteAgendaEvent = (eventId) => {
    setAgendaItems((items) => items.filter((event) => String(event.id) !== String(eventId)));
    window.twocode?.deleteAgendaEvent?.(eventId);
  };

  return (
    <div
      className="notch-stage"
      style={{ '--clock-number-font': CLOCK_FONT_FAMILIES[clockFontIndex] || CLOCK_FONT_FAMILIES[3] }}
      onContextMenu={handleNotchContextMenu}
      onMouseMove={(e) => {
        if (isDraggingRuler && activeTab === 'timer') {
          updateRulerMinutes(e.clientX);
        }
        if (isDraggingVolume && showMenu) {
          updateVolumeFromMouse(e.clientX);
        }
      }}
      onMouseUp={() => {
        setIsDraggingRuler(false);
        setIsDraggingVolume(false);
      }}
    >
      <div
        ref={morphShellRef}
        className={`notch-morph-shell state-${islandMode} mode-${activeTab} ${batteryAlertKind === 'charging' ? 'is-charging' : ''} ${
          activeTab === 'home' && isCustomizingClock ? 'customizing-clock' : ''
        } ${musicAccent.hasColor ? 'has-cover-color' : ''} ${
          islandMode === 'hud' && hudOverlay.ghelper?.category === 'aura'
            ? `has-aura-hud effect-${hudOverlay.ghelper.effectType || 'static'}`
            : ''
        }`}
        style={{
          '--music-accent-rgb': musicAccent.rgb,
          '--music-accent-hex': musicAccent.hex,
          '--notif-accent-rgb': notifBrand.rgb,
          '--notif-accent-hex': notifBrand.hex,
          '--notif-accent-secondary-rgb': notifBrand.secondaryRgb || notifBrand.rgb,
          '--notif-accent-secondary-hex': notifBrand.secondaryHex || notifBrand.hex,
          '--robo-eye-color': islandSettings.eyeColorHex || '#ffffff',
          '--dynamic-music-w': `${dynamicMusicBarWidth}px`,
          ...(hudOverlay.ghelper?.color ? {
            '--ghelper-aura-color': hudOverlay.ghelper.color,
            '--ghelper-aura-color2': hudOverlay.ghelper.color2 || hudOverlay.ghelper.color,
            '--ghelper-aura-gradient': hudOverlay.ghelper.gradient || `linear-gradient(135deg, ${hudOverlay.ghelper.color}, ${hudOverlay.ghelper.color2 || hudOverlay.ghelper.color})`,
          } : {}),
          ...(hudOverlay.ghelper?.category === 'mode' ? {
            '--hud-mode-color': (GHELPER_PERF_MODES[typeof hudOverlay.ghelper.modeIndex === 'number' ? hudOverlay.ghelper.modeIndex : ghelperStatus.performanceMode] || GHELPER_PERF_MODES[0]).color,
          } : {}),
          ...(hudOverlay.ghelper?.category === 'gpu' ? {
            '--hud-mode-color': (GHELPER_GPU_MODES[typeof hudOverlay.ghelper.gpuIndex === 'number' ? hudOverlay.ghelper.gpuIndex : ghelperStatus.gpuMode] || GHELPER_GPU_MODES[0]).color,
          } : {}),
        }}
        onMouseEnter={() => {
          if (gameModeActive || isShowingNotifToastRef.current) return;
          if (islandMode !== 'expanded' && !isMiniProgressBar) {
            if (hoverExpandTimerRef.current) clearTimeout(hoverExpandTimerRef.current);
            hoverExpandTimerRef.current = setTimeout(() => {
              setIslandMode('expanded');
            }, 160);
          }
        }}
        onMouseLeave={() => {
          if (hoverExpandTimerRef.current) {
            clearTimeout(hoverExpandTimerRef.current);
            hoverExpandTimerRef.current = null;
          }
          if (gameModeActive) return;
          if (islandMode === 'expanded') {
            setShowMenu(false);
            setNotificationHistoryOpen(false);
            setIslandMode(resolvedCollapsedMode);
          }
        }}
        onClick={() => {
          if (hoverExpandTimerRef.current) {
            clearTimeout(hoverExpandTimerRef.current);
            hoverExpandTimerRef.current = null;
          }
          if (isMiniProgressBar) {
            setIsMiniProgressBar(false);
            setIslandMode('expanded');
          } else if (islandMode !== 'expanded') {
            setIslandMode('expanded');
          }
        }}
      >
        {/* ============================================================
            COLLAPSED LAYER 1: IDLE MINI-NOTCH (Robo's glowing eyes)
            ============================================================ */}
        <div className={`morph-layer layer-idle ${islandMode === 'idle' ? 'is-visible' : ''}`}>
          <div className="idle-eyes-center">
            <RoboEyes
              mood={topEyeMood}
              reaction={roboReaction}
              active={documentVisible && islandMode === 'idle'}
              size="normal"
              batteryPercent={batteryPercent}
              batteryCharging={batteryCharging}
            />
          </div>
        </div>

        {/* ============================================================
            COLLAPSED LAYER 1B: THIN PROGRESS BAR NOTCH (Right-click mode)
            Matches screenshot media_1794017471677_b790137d.png
            ============================================================ */}
        <div
          className={`morph-layer layer-mini-progress ${
            islandMode === 'mini-progress' ? 'is-visible' : ''
          }`}
          title="Normal görünüme dönmek için sağ tıkla veya tıkla"
        >
          <div className="mini-progress-track">
            <div
              className="mini-progress-fill"
              style={{ width: `${ Math.max(6, progressPercent) }%` }}
            />
          </div>
        </div>

        {/* ============================================================
            COLLAPSED LAYER 2: BATTERY ALERT NOTCH (Charging & Low Battery)
            ============================================================ */}
        <div
          className={`morph-layer layer-battery ${islandMode === 'battery' ? 'is-visible' : ''} ${batteryAlertKind === 'charging' ? 'is-charging' : 'is-low'}`}
          onClick={() => setIslandMode(resolvedCollapsedModeRef.current)}
        >
          {islandMode === 'battery' && (
            <>
              <div className="battery-alert-left">
                <div className="battery-icon-badge">
                  {batteryAlertKind === 'charging' ? (
                    <div className="battery-charging-graphic">
                      <svg className="battery-capsule-svg" width="32" height="18" viewBox="0 0 32 18" fill="none">
                        <rect x="1" y="1" width="26" height="16" rx="4.5" stroke="#30D158" strokeWidth="2" />
                        <rect x="3.5" y="3.5" width={Math.max(3.5, (21 * Math.min(100, Math.max(0, batteryPercent))) / 100)} height="11" rx="2.5" fill="#30D158" className="battery-fill-rect" />
                        <path d="M29 6.5V11.5" stroke="#30D158" strokeWidth="2.2" strokeLinecap="round" />
                      </svg>
                      <div className="charging-bolt-glow">
                        <svg className="charging-bolt-svg" width="13" height="17" viewBox="0 0 14 18" fill="none">
                          <path d="M8.2 1L1.8 10H7.2L5.8 17L12.2 8H6.8L8.2 1Z" fill="#ffffff" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="battery-low-graphic">
                      <svg className="battery-capsule-svg" width="32" height="18" viewBox="0 0 32 18" fill="none">
                        <rect x="1" y="1" width="26" height="16" rx="4.5" stroke="#FF453A" strokeWidth="2" />
                        <rect x="3.5" y="3.5" width={Math.max(3.5, (21 * Math.min(25, Math.max(0, batteryPercent))) / 100)} height="11" rx="2.5" fill="#FF453A" className="battery-low-fill-rect" />
                        <path d="M29 6.5V11.5" stroke="#FF453A" strokeWidth="2.2" strokeLinecap="round" />
                      </svg>
                      <div className="battery-warning-mark">!</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="battery-alert-center">
                <div className="battery-alert-headline">
                  <strong>
                    {batteryAlertKind === 'charging' ? 'Şarj Ediliyor' : 'Düşük Pil'}
                  </strong>
                  <span className="battery-alert-pct-pill">
                    %{batteryPercent}
                  </span>
                </div>
                <span className="battery-alert-sub">
                  {batteryAlertKind === 'charging' ? 'Güç kaynağı bağlandı' : 'Lütfen şarj aletini takın'}
                </span>
              </div>

              <div className="battery-alert-right">
                <div className="battery-mini-bar-wrap">
                  <div className="battery-mini-bar-track">
                    <div
                      className="battery-mini-bar-fill"
                      style={{ width: `${Math.min(100, Math.max(5, batteryPercent))}%` }}
                    >
                      {batteryAlertKind === 'charging' && <div className="battery-bar-shimmer" />}
                    </div>
                  </div>
                  <span className="battery-mini-bar-label">
                    {batteryAlertKind === 'charging' ? 'DOLUYOR' : 'KRİTİK'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ============================================================
            COLLAPSED LAYER 2B: SYSTEM VOLUME / BRIGHTNESS HUD NOTCH
            ============================================================ */}
        <div className={`morph-layer layer-hud ${hudOverlay.type === 'ghelper' ? 'is-ghelper' : ''} ${hudOverlay.ghelper?.category === 'aura' ? `is-aura effect-${hudOverlay.ghelper.effectType || 'static'}` : ''} ${islandMode === 'hud' || isSystemHudVisible ? 'is-visible' : ''}`}>
          {hudOverlay.type === 'ghelper' && hudOverlay.ghelper ? (
            hudOverlay.ghelper.category === 'aura' ? (
              <div className={`hud-aura-clean effect-${hudOverlay.ghelper.effectType || 'static'}`}>
                {/* 1. Animated Glowing Keyboard Icon */}
                <div
                  className="hud-aura-icon-box"
                  style={{
                    '--glow-color': hudOverlay.ghelper.color || '#00e5ff',
                  }}
                >
                  <Keyboard size={17} strokeWidth={2.3} className="hud-aura-icon" />
                </div>

                {/* 2. Clean Minimalist Typography */}
                <div className="hud-aura-text-row">
                  <span className="hud-aura-label">{hudOverlay.ghelper.label || 'Laptop Klavyesi'}</span>
                  <span className="hud-aura-val">{hudOverlay.ghelper.valueText || 'Sabit'}</span>
                </div>

                {/* 3. Fluid Animated Color Pill Visualizer */}
                <div
                  className={`hud-aura-pill effect-${hudOverlay.ghelper.effectType || 'static'}`}
                  style={{
                    '--pill-color': hudOverlay.ghelper.color || '#00e5ff',
                    '--pill-color2': hudOverlay.ghelper.color2 || hudOverlay.ghelper.color || '#ff007f',
                    '--pill-gradient': hudOverlay.ghelper.gradient || `linear-gradient(90deg, ${hudOverlay.ghelper.color || '#00e5ff'}, ${hudOverlay.ghelper.color2 || hudOverlay.ghelper.color || '#ff007f'})`,
                  }}
                >
                  <div className="hud-aura-pill-flow" />
                  <div className="hud-aura-pill-sheen" />
                </div>
              </div>
            ) : (
              <div
                className={`hud-ghelper-wrap cat-${hudOverlay.ghelper.category} ${
                  hudOverlay.ghelper.category === 'mode'
                    ? `perf-mode-${typeof hudOverlay.ghelper.modeIndex === 'number' ? hudOverlay.ghelper.modeIndex : ghelperStatus.performanceMode}`
                    : hudOverlay.ghelper.category === 'gpu'
                    ? `gpu-mode-${typeof hudOverlay.ghelper.gpuIndex === 'number' ? hudOverlay.ghelper.gpuIndex : ghelperStatus.gpuMode}`
                    : ''
                } ${hudOverlay.ghelper.category === 'backlight' && hudOverlay.ghelper.level === 0 ? 'is-off' : ''}`}
                style={{
                  ...(hudOverlay.ghelper.category === 'mode' ? {
                    '--mode-perf-color': (GHELPER_PERF_MODES[typeof hudOverlay.ghelper.modeIndex === 'number' ? hudOverlay.ghelper.modeIndex : ghelperStatus.performanceMode] || GHELPER_PERF_MODES[0]).color,
                  } : {}),
                  ...(hudOverlay.ghelper.category === 'gpu' ? {
                    '--mode-gpu-color': (GHELPER_GPU_MODES[typeof hudOverlay.ghelper.gpuIndex === 'number' ? hudOverlay.ghelper.gpuIndex : ghelperStatus.gpuMode] || GHELPER_GPU_MODES[0]).color,
                  } : {}),
                }}
              >
                <div
                  className={`hud-notch-icon is-ghelper-icon ${hudOverlay.ghelper.category === 'mic' && hudOverlay.ghelper.isMuted ? 'is-mic-muted' : ''}`}
                >
                  {hudOverlay.ghelper.icon === 'backlight' ? (
                    <Sunrise size={18} strokeWidth={2.4} />
                  ) : hudOverlay.ghelper.icon === 'mic-mute' ? (
                    <MicOff size={18} strokeWidth={2.4} />
                  ) : hudOverlay.ghelper.icon === 'mic' ? (
                    <Mic size={18} strokeWidth={2.4} />
                  ) : hudOverlay.ghelper.category === 'mode' || hudOverlay.ghelper.icon === 'mode' ? (
                    (() => {
                      const mIdx = typeof hudOverlay.ghelper.modeIndex === 'number' ? hudOverlay.ghelper.modeIndex : ghelperStatus.performanceMode;
                      const ModeIcon = (GHELPER_PERF_MODES[mIdx] || GHELPER_PERF_MODES[0]).icon;
                      return <ModeIcon size={18} strokeWidth={2.4} />;
                    })()
                  ) : hudOverlay.ghelper.category === 'gpu' || hudOverlay.ghelper.icon === 'gpu' ? (
                    (() => {
                      const gIdx = typeof hudOverlay.ghelper.gpuIndex === 'number' ? hudOverlay.ghelper.gpuIndex : ghelperStatus.gpuMode;
                      const GpuIcon = (GHELPER_GPU_MODES[gIdx] || GHELPER_GPU_MODES[0]).icon;
                      return <GpuIcon size={18} strokeWidth={2.4} />;
                    })()
                  ) : hudOverlay.ghelper.icon === 'touchpad' ? (
                    <TouchpadIcon size={18} strokeWidth={2.4} />
                  ) : hudOverlay.ghelper.icon === 'lock' ? (
                    <Lock size={18} strokeWidth={2.4} />
                  ) : (
                    <Palette size={18} strokeWidth={2.4} />
                  )}
                </div>
                <div className="hud-ghelper-info">
                  <span className="hud-ghelper-label">{hudOverlay.ghelper.label}</span>
                  <div className="hud-ghelper-val-row">
                    {/* Backlight Level Dots */}
                    {hudOverlay.ghelper.category === 'backlight' && typeof hudOverlay.ghelper.level === 'number' && (
                      <div className="hud-level-dots">
                        {[1, 2, 3].map((step) => (
                          <span
                            key={step}
                            className={`hud-level-dot ${hudOverlay.ghelper.level >= step ? 'is-active' : ''}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Mic Pulsing State Dot */}
                    {hudOverlay.ghelper.category === 'mic' && (
                      <span className={`hud-mic-state-dot ${hudOverlay.ghelper.isMuted ? 'is-muted' : 'is-live'}`} />
                    )}

                    <span className={`hud-ghelper-val cat-${hudOverlay.ghelper.category}`}>
                      {hudOverlay.ghelper.valueText}
                    </span>
                  </div>
                </div>
              </div>
            )
          ) : (
            <>
              <div className="hud-notch-icon">
                {hudOverlay.type === 'brightness' ? (
                  <Sun size={17} strokeWidth={2.2} />
                ) : hudOverlay.muted || hudOverlay.value === 0 ? (
                  <VolumeX size={17} strokeWidth={2.2} />
                ) : (
                  <Volume2 size={17} strokeWidth={2.2} />
                )}
              </div>
              <span className="hud-notch-label">{hudOverlay.type === 'brightness' ? 'Parlaklık' : 'Ses'}</span>
              <div className="hud-notch-track">
                <div
                  className={`hud-notch-fill ${hudOverlay.type === 'brightness' ? 'is-brightness' : ''}`}
                  style={{
                    width: `${hudOverlay.muted ? 0 : Math.min(100, Math.max(0, hudOverlay.value))}%`,
                  }}
                />
              </div>
              <span className="hud-notch-val">
                {hudOverlay.muted ? 'Sessiz' : `${Math.round(hudOverlay.value)}%`}
              </span>
            </>
          )}
        </div>

        {/* ============================================================
            COLLAPSED LAYER 2C: WINDOWS SYSTEM NOTIFICATION BANNER NOTCH
            Sleek, modern, uncluttered Dynamic Island notification
            ============================================================ */}
        <div
          className={`morph-layer layer-notif-toast ${islandMode === 'notif-toast' ? 'is-visible' : ''} ${notifPresentation.kind === 'audio' || notifPresentation.kind === 'video' ? 'is-call-notification' : ''}`}
          role="button"
          tabIndex={0}
          title="Uygulamayı aç"
          style={{ '--notif-stay-ms': `${notifRemainingMsRef.current || 4500}ms` }}
          onMouseEnter={() => {
            if (!isShowingNotifToastRef.current || !notifTimerRef.current) return;
            clearTimeout(notifTimerRef.current);
            notifTimerRef.current = null;
            notifRemainingMsRef.current = Math.max(
              0,
              notifRemainingMsRef.current - (Date.now() - notifTimerStartedAtRef.current)
            );
          }}
          onMouseLeave={() => {
            if (!isShowingNotifToastRef.current || notifTimerRef.current) return;
            const remainingMs = Math.max(900, notifRemainingMsRef.current);
            const prevMode = notifPrevModeRef.current;
            notifTimerStartedAtRef.current = Date.now();
            notifTimerRef.current = setTimeout(() => {
              isShowingNotifToastRef.current = false;
              notifRemainingMsRef.current = 0;
              notifTimerRef.current = null;
              setIslandMode(prevMode);
            }, remainingMs);
          }}
          onClick={() => openNotification(toastBanner)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openNotification(toastBanner); }}
        >
          <div className="notif-toast-ambient" aria-hidden="true" />
          <div className="notif-toast-hero">
            <NotificationAvatar banner={toastBanner} brand={notifBrand.brand} presentation={notifPresentation} />
          </div>
          <div className="notif-toast-main">
            <div className="notif-toast-top-row">
              <span className="notif-toast-badge">
                <span className="notif-toast-badge-dot" />
                <span className="notif-toast-badge-app">{notifPresentation.app}</span>
              </span>
              <span className="notif-toast-meta">
                <span className="notif-toast-time">şimdi</span>
                <span className="notif-toast-arrow" aria-hidden="true">↗</span>
              </span>
            </div>
            <div className="notif-toast-message-row">
              <span className="notif-toast-headline">
                <NotificationText text={notifPresentation.title} />
              </span>
              {Boolean(
                notifPresentation.subtitle &&
                notifPresentation.subtitle.trim() &&
                notifPresentation.subtitle !== notifPresentation.title &&
                notifPresentation.subtitle !== notifPresentation.app
              ) && (
                <span className="notif-toast-body">
                  <NotificationText text={notifPresentation.subtitle} />
                </span>
              )}
            </div>
          </div>
          <div className="notif-toast-countdown-track" aria-hidden="true">
            <div className="notif-toast-countdown-bar" />
          </div>
        </div>

        {/* ============================================================
            COLLAPSED LAYER 3: COMPACT MUSIC / KARAOKE BAR NOTCH
            Matches screenshots media_1794017581469_4fb13cc8.png & media_1794019642044_7536817b.png
            ============================================================ */}
        <div
          className={`morph-layer layer-music-bar ${
            islandMode === 'music-bar' ? 'is-visible' : ''
          } ${hasSyncedLyrics ? 'is-karaoke-mode' : ''}`}
        >
          <div className="compact-left">
            {currentMedia.thumbnail ? (
              <img
                src={currentMedia.thumbnail}
                alt=""
                className="compact-album-thumb"
              />
            ) : (
              <div className="compact-album-placeholder">
                <Music size={12} />
              </div>
            )}
          </div>
          <div className="compact-center">
            <span className={`compact-lyric ${hasSyncedLyrics ? 'karaoke-fill' : ''}`}>
              {primaryLine}
            </span>
          </div>
          <div className="compact-right">
            <div className={`soundwave ${currentMedia.isPlaying ? 'playing' : 'paused'}`}>
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

        {/* ============================================================
            COLLAPSED LAYER 3B: FOCUS RUNNING BAR NOTCH
            Matches screenshot media_1794019559611_7bcce858.png
            ============================================================ */}
        <div
          className={`morph-layer layer-focus-bar ${
            islandMode === 'focus-bar' || islandMode === 'focus-bar-media' ? 'is-visible' : ''
          }`}
        >
          <div className="focus-notch-ring-wrap">
            <svg width="22" height="22" viewBox="0 0 22 22">
              <circle
                cx="11"
                cy="11"
                r="8.5"
                fill="none"
                stroke="#b085f5"
                strokeWidth="2.8"
              />
            </svg>
          </div>
          <span className="focus-notch-countdown">
            {formatTimerBig(timerSeconds)}
          </span>
        </div>

        {/* ============================================================
            EXPANDED LAYER 4: FULL DYNAMIC ISLAND
            ============================================================ */}
        <div
          className={`morph-layer layer-expanded ${
            islandMode === 'expanded' ? 'is-visible' : ''
          }`}
        >
          {/* TOP STATUS BAR */}
          <header className="island-topbar">
            <div className="topbar-left">
              {islandOverlay === 'all-apps' ? (
                <button
                  type="button"
                  className="topbar-apps-back-title"
                  onClick={() => setIslandOverlay(null)}
                >
                  Apps
                </button>
              ) : islandOverlay === 'mirror' ? (
                <button
                  type="button"
                  className="topbar-apps-back-title"
                  onClick={() => setIslandOverlay(null)}
                >
                  ← Mirror
                </button>
              ) : (
                <>
                  {activeTab === 'home' && !islandOverlay && (
                    <div
                      className="topbar-sys-icons"
                      title="Control Center (Wi-Fi & Bluetooth)"
                      onClick={(e) => {
                        e.stopPropagation();
                        playRoboSound('tap', islandSettings.soundEffects !== false);
                        if (!showControlCenter) {
                          window.twocode?.getNetworkInfo?.().then((info) => {
                            if (info) setNetworkInfo(info);
                          });
                          refreshRadioStates();
                        }
                        setShowControlCenter((s) => !s);
                      }}
                    >
                      <button
                        type="button"
                        className="topbar-icon-btn"
                        title="Wi-Fi"
                      >
                        <Wifi size={13} strokeWidth={2.4} color={networkInfo.wifiConnected ? '#55e6a5' : networkInfo.wifiState === 'On' ? '#f4f4f5' : '#777780'} />
                      </button>
                      <button
                        type="button"
                        className="topbar-icon-btn"
                        title="Bluetooth"
                      >
                        <Bluetooth size={13} strokeWidth={2.4} color={networkInfo.bluetoothState === 'On' ? '#8dbbff' : '#777780'} />
                      </button>
                    </div>
                  )}
                  {renderDateTop(now)}
                </>
              )}
            </div>

            {/* ============================================================
                CONTROL CENTER POPOVER (Exact replica of screenshot media_1794051605526_7a537730.png)
                ============================================================ */}
            {showControlCenter && (
              <div
                className="twocode-control-center-popover"
                onClick={(e) => e.stopPropagation()}
                onMouseLeave={() => setShowControlCenter(false)}
              >
                <div className="cc-tiles-grid">
                  <div
                    className="cc-tile cc-wifi-tile"
                    role="button"
                    tabIndex={0}
                    aria-pressed={networkInfo.wifiState === 'On'}
                    aria-busy={radioBusy === 'Wifi'}
                    onClick={() => toggleRadio('Wifi')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleRadio('Wifi');
                      }
                    }}
                  >
                    <div className={`cc-tile-icon-circle ${networkInfo.wifiConnected ? 'connected' : networkInfo.wifiState === 'On' ? 'blue' : 'off'}`}>
                      <Wifi size={18} strokeWidth={2.4} color="#ffffff" />
                    </div>
                    <strong className="cc-tile-title">Wi-Fi</strong>
                    <span className="cc-tile-sub">{radioBusy === 'Wifi' ? 'Değiştiriliyor…' : networkInfo.wifiConnected ? `Bağlı · ${networkInfo.wifi || 'Wi-Fi'}` : networkInfo.wifiState === 'Off' ? 'Kapalı' : networkInfo.wifiState === 'On' ? 'Ağ bağlı değil' : 'Durum alınıyor…'}</span>
                  </div>

                  <div
                    className="cc-tile cc-bt-tile"
                    role="button"
                    tabIndex={0}
                    aria-pressed={networkInfo.bluetoothState === 'On'}
                    aria-busy={radioBusy === 'Bluetooth'}
                    onClick={() => toggleRadio('Bluetooth')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleRadio('Bluetooth');
                      }
                    }}
                  >
                    <div className={`cc-tile-icon-circle ${networkInfo.bluetoothState === 'On' ? 'blue' : networkInfo.bluetoothState === 'Off' ? 'off' : 'pending'}`}>
                      <Bluetooth size={18} strokeWidth={2.4} color="#ffffff" />
                    </div>
                    <strong className="cc-tile-title">Bluetooth</strong>
                    <span className="cc-tile-sub">{radioBusy === 'Bluetooth' ? 'Değiştiriliyor…' : networkInfo.bluetoothState || 'Durum alınıyor…'}</span>
                  </div>
                </div>

                {radioError && <div className="cc-radio-error" role="status">{radioError}</div>}

                {radioPanel && (
                  <section className="cc-nearby-panel" aria-live="polite">
                    <div className="cc-nearby-heading">
                      <strong>{radioPanel === 'wifi' ? 'Yakındaki Wi-Fi ağları' : 'Yakındaki Bluetooth aygıtları'}</strong>
                      <div>
                        <button
                          type="button"
                          className="cc-nearby-icon-button"
                          aria-label="Yeniden tara"
                          disabled={radioScanBusy}
                          onClick={radioPanel === 'wifi' ? scanWifiNetworks : scanBluetoothDevices}
                        ><RotateCw size={13} className={radioScanBusy ? 'is-spinning' : ''} /></button>
                        <button type="button" className="cc-nearby-icon-button" aria-label="Listeyi kapat" onClick={() => setRadioPanel('')}><X size={14} /></button>
                      </div>
                    </div>
                    {radioScanBusy ? (
                      <div className="cc-nearby-empty">Aygıtlar aranıyor…</div>
                    ) : radioPanel === 'wifi' ? (
                      wifiNetworks.length ? wifiNetworks.map((network) => (
                        <div className="cc-nearby-item" key={`${network.ssid}-${network.profileName || ''}`}>
                          <Wifi size={15} />
                          <span className="cc-nearby-name">
                            <strong>{network.ssid}</strong>
                            <small>{network.connected ? 'Bağlı' : `${network.signal}% sinyal${network.secured ? ' · Güvenli' : ' · Açık ağ'}`}</small>
                          </span>
                          {network.connected && <Check size={15} className="cc-nearby-check" />}
                        </div>
                      )) : <div className="cc-nearby-empty">Tarama tamamlandı; görünür ağ bulunamadı.</div>
                    ) : bluetoothDevices.length ? bluetoothDevices.map((device) => (
                      <div className="cc-nearby-item" key={device.id}>
                        <Bluetooth size={15} />
                        <span className="cc-nearby-name"><strong>{device.name}</strong><small>{device.paired ? 'Eşleştirildi' : 'Yakında'}</small></span>
                        {!device.paired && <button type="button" className="cc-nearby-action" disabled={Boolean(radioBusy)} onClick={() => pairBluetoothDevice(device)}>{radioBusy === device.id ? '…' : 'Eşleştir'}</button>}
                      </div>
                    )) : <div className="cc-nearby-empty">Tarama tamamlandı; görünür aygıt bulunamadı.</div>}
                  </section>
                )}

                <div className="cc-list-rows">
                  <button
                    ref={notificationHistoryTriggerRef}
                    type="button"
                    className="cc-list-row"
                    onClick={scanWifiNetworks}
                  >
                    <div className="cc-row-left">
                      <Wifi size={14} strokeWidth={2.2} />
                      <span>Wi-Fi ağlarını tara</span>
                    </div>
                    <ChevronRight size={14} strokeWidth={2.2} className="cc-row-chev" />
                  </button>

                  <button
                    type="button"
                    className="cc-list-row"
                    onClick={scanBluetoothDevices}
                  >
                    <div className="cc-row-left">
                      <Bluetooth size={14} strokeWidth={2.2} />
                      <span>Yakındaki aygıtları tara</span>
                    </div>
                    <ChevronRight size={14} strokeWidth={2.2} className="cc-row-chev" />
                  </button>
                </div>
              </div>
            )}

            <div className="topbar-center">
              {(islandOverlay || roboReaction ||
                (activeTab !== 'code' && activeTab !== 'robo')) && (
                <RoboEyes
                  mood={topEyeMood}
                  reaction={roboReaction}
                  active={documentVisible && (islandMode === 'expanded' || Boolean(roboReaction))}
                  batteryPercent={batteryPercent}
                  batteryCharging={batteryCharging}
                  onPoke={(m) => {
                    setRoboMood(m);
                    playRoboSound(m, islandSettings.soundEffects !== false);
                  }}
                />
              )}
            </div>

            <div className="topbar-right">
              {activeTab === 'home' && !islandOverlay && (
                <>
                  <div className="topbar-ghelper-group" role="group" aria-label="G-Helper Modları">
                    {(() => {
                      const perfMeta = GHELPER_PERF_MODES[ghelperStatus.performanceMode] || GHELPER_PERF_MODES[0];
                      const PerfIcon = perfMeta.icon;
                      return (
                        <button
                          type="button"
                          className={`topbar-ghelper-btn perf-mode-${ghelperStatus.performanceMode}`}
                          style={{ '--gh-color': perfMeta.color }}
                          aria-label={`G-Helper Performans Modu: ${perfMeta.name}`}
                          data-no-tooltip="true"
                          onClick={(event) => {
                            event.stopPropagation();
                            suppressGHelperHudUntilRef.current = Date.now() + 6000;
                            playRoboSound('tap', islandSettings.soundEffects !== false);
                            window.twocode?.openGHelper?.();
                          }}
                        >
                          <PerfIcon size={15} strokeWidth={2.2} />
                        </button>
                      );
                    })()}
                    {(() => {
                      const gpuMeta = GHELPER_GPU_MODES[ghelperStatus.gpuMode] || GHELPER_GPU_MODES[0];
                      const GpuIcon = gpuMeta.icon;
                      return (
                        <button
                          type="button"
                          className={`topbar-ghelper-btn gpu-mode-${ghelperStatus.gpuMode}`}
                          style={{ '--gh-color': gpuMeta.color }}
                          aria-label={`G-Helper GPU Modu: ${gpuMeta.name}`}
                          data-no-tooltip="true"
                          onClick={(event) => {
                            event.stopPropagation();
                            suppressGHelperHudUntilRef.current = Date.now() + 6000;
                            playRoboSound('tap', islandSettings.soundEffects !== false);
                            window.twocode?.openGHelper?.();
                          }}
                        >
                          <GpuIcon size={15} strokeWidth={2.2} />
                        </button>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    className="topbar-mode-btn"
                    style={{ '--mode-color': activeModeOption.color }}
                    onClick={(event) => { event.stopPropagation(); setActiveTab('sleep'); setNotificationHistoryOpen(false); setShowMenu(false); }}
                    aria-label={`${selectedModeName} modunu aç`}
                    title={`${selectedModeName} · ${activeModeSummary}`}
                  >
                    <ActiveModeIcon size={16} strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    className={`topbar-notifications-btn ${notificationHistoryOpen ? 'is-open' : ''} ${unreadNotificationCount ? 'has-unread' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      playRoboSound('tap', islandSettings.soundEffects !== false);
                      openNotificationHistory();
                    }}
                    aria-label={`Bildirim geçmişi${unreadNotificationCount ? `, ${unreadNotificationCount} okunmamış` : ''}`}
                    aria-expanded={notificationHistoryOpen}
                    aria-controls="notification-history-panel"
                    title="Bildirim geçmişi"
                  >
                    <Bell size={16} strokeWidth={2} />
                    {unreadNotificationCount > 0 && <span className="notification-count-badge">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>}
                  </button>
                </>
              )}
              <button
                type="button"
                className={`topbar-dots-btn ${showMenu ? 'is-open' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  playRoboSound('tap', islandSettings.soundEffects !== false);
                  setShowMenu((s) => !s);
                  setNotificationHistoryOpen(false);
                  setQuitConfirming(false);
                }}
                title="Menü"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>

            {/* ============================================================
                EXACT TWOCODE `•••` POPOVER MENU
                Spans down to bottom navbar area; robust backdrop dismiss
                ============================================================ */}
            {showMenu && (
              <>
                <div
                  className="twocode-popover-backdrop"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    setQuitConfirming(false);
                  }}
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowMenu(false);
                    setQuitConfirming(false);
                  }}
                />
                <div
                  className="twocode-dots-popover"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Volume Slider Bar */}
                  <div
                    ref={volumeBarRef}
                    className="popover-volume-slider"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setIsDraggingVolume(true);
                      updateVolumeFromMouse(e.clientX);
                    }}
                  >
                    <div
                      className="popover-volume-fill"
                      style={{ width: `${isMuted ? 0 : volumePercent}%` }}
                    />
                    <div className="popover-volume-icon">
                      {isMuted || volumePercent === 0 ? (
                        <VolumeX size={16} strokeWidth={2.3} />
                      ) : (
                        <Volume2 size={16} strokeWidth={2.3} />
                      )}
                    </div>
                  </div>

                  {/* 3x2 Action Tiles Grid */}
                  <div className="popover-tiles-grid">
                    <button
                      type="button"
                      className="popover-tile-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        playRoboSound('tap', islandSettings.soundEffects !== false);
                        setIslandOverlay('all-apps');
                        setShowMenu(false);
                      }}
                    >
                      <LayoutGrid size={17} strokeWidth={2} />
                      <span>All apps</span>
                    </button>

                    <button
                      type="button"
                      className="popover-tile-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        playRoboSound('tap', islandSettings.soundEffects !== false);
                        setIslandOverlay('customize-carousel');
                        setShowMenu(false);
                      }}
                    >
                      <Pencil size={17} strokeWidth={2} />
                      <span>Customize</span>
                    </button>

                    <button
                      type="button"
                      className="popover-tile-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        playRoboSound('tap', islandSettings.soundEffects !== false);
                        window.twocode?.openSettingsWindow?.('home');
                        setShowMenu(false);
                      }}
                    >
                      <Settings size={17} strokeWidth={2} />
                      <span>Settings</span>
                    </button>

                    <button
                      type="button"
                      className="popover-tile-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        playRoboSound('tap', islandSettings.soundEffects !== false);
                        window.twocode?.openSettingsWindow?.('news');
                        setShowMenu(false);
                      }}
                    >
                      <RotateCw size={17} strokeWidth={2} />
                      <span>Updates</span>
                    </button>

                    <button
                      type="button"
                      className="popover-tile-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        playRoboSound('tap', islandSettings.soundEffects !== false);
                        setShowMenu(false);
                        setIslandMode(resolvedCollapsedMode);
                      }}
                    >
                      <ChevronUp size={18} strokeWidth={2.2} />
                      <span>Fold in</span>
                    </button>

                    <button
                      type="button"
                      className={`popover-tile-btn quit-tile ${quitConfirming ? 'is-confirming' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!quitConfirming) {
                          playRoboSound('tap', islandSettings.soundEffects !== false);
                          setQuitConfirming(true);
                        } else {
                          window.twocode?.quitApp();
                        }
                      }}
                    >
                      <Power size={17} strokeWidth={2} color="#ef4444" />
                      <span style={{ color: '#ef4444' }}>{quitConfirming ? 'Sure?' : 'Quit'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </header>

          {notificationHistoryOpen && (
              <section
                ref={notificationHistoryPanelRef}
                id="notification-history-panel"
                className="notification-history-panel"
                aria-label="Bildirim geçmişi"
                style={(() => {
                  const newest = notificationHistory[0];
                  const accent = resolveNotifBrand(newest, newest?.logoAccent);
                  return { '--notif-panel-rgb': accent.rgb, '--notif-panel-hex': accent.hex };
                })()}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="notif-panel-ambient-glow" aria-hidden="true" />

                <header className="notification-history-header">
                  <div className="notification-history-heading">
                    <span className="notification-history-icon"><Bell size={13} strokeWidth={2.2} /></span>
                    <strong className="notification-history-title">Bildirimler</strong>
                    {notificationHistory.length > 0 && (
                      <span className="notif-history-badge">
                        {unreadNotificationCount > 0 ? `${unreadNotificationCount} yeni` : `${notificationHistory.length}`}
                      </span>
                    )}
                  </div>
                  <div className="notification-history-actions">
                    {notificationHistory.length > 0 && (
                      <button
                        className="notification-history-clear"
                        type="button"
                        onClick={() => setNotificationHistory([])}
                        title="Tüm bildirimleri temizle"
                      >
                        Temizle
                      </button>
                    )}
                    <button
                      className="notification-history-close"
                      type="button"
                      aria-label="Kapat"
                      title="Kapat"
                      onClick={() => setNotificationHistoryOpen(false)}
                    >
                      <X size={14} strokeWidth={2.2} />
                    </button>
                  </div>
                </header>

                <div className="notification-history-list">
                  {notificationHistory.length ? notificationHistory.map((item, index) => (
                    <div
                      className={`notif-card ${item.isRead ? 'is-read' : 'is-unread'}`}
                      key={item.id}
                      style={(() => {
                        const accent = resolveNotifBrand(item, item.logoAccent);
                        return {
                          '--notif-accent-rgb': accent.rgb,
                          '--notif-accent-hex': accent.hex,
                          '--card-delay': `${Math.min(index * 35, 240)}ms`,
                        };
                      })()}
                    >
                      <button
                        type="button"
                        className="notif-card-main"
                        onClick={() => openNotification(item)}
                        aria-label={`${item.app || 'Uygulama'} bildirimini aç`}
                      >
                        <div className="notif-card-avatar">
                          <NotificationAvatar
                            banner={item}
                            brand={resolveNotifBrand(item).brand}
                            presentation={resolveNotificationPresentation(item)}
                          />
                          {!item.isRead && <span className="notif-card-unread-dot" aria-label="Okunmadı" />}
                        </div>

                        <div className="notif-card-content">
                          <div className="notif-card-top-row">
                            <span className="notif-card-badge">
                              <span className="notif-card-badge-dot" />
                              <span className="notif-card-badge-app">{item.app || 'Sistem'}</span>
                            </span>
                            <span className="notif-card-time">{formatNotifTime(item.timestamp)}</span>
                          </div>

                          <div className="notif-card-message-row">
                            <span className="notif-card-headline">
                              <NotificationText text={item.title || item.app} />
                            </span>
                            {Boolean(
                              item.body &&
                              item.body.trim() &&
                              item.body !== item.title &&
                              item.body !== item.app
                            ) && (
                              <span className="notif-card-body">
                                <NotificationText text={item.body} />
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="notif-card-delete"
                        aria-label="Bildirimi sil"
                        title="Bildirimi sil"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotificationHistory((items) => items.filter((entry) => entry.id !== item.id));
                        }}
                      >
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    </div>
                  )) : (
                    <div className="notification-history-empty">
                      <div className="notification-empty-icon">
                        <Bell size={20} strokeWidth={2} />
                      </div>
                      <strong className="notification-empty-title">Bildirim Yok</strong>
                      <span className="notification-empty-desc">Yeni bildirimler geldiğinde burada toplanır.</span>
                    </div>
                  )}
                </div>
              </section>
          )}

          {/* ============================================================
              OVERLAY 0: FILE DRAG-DROP 3-CARD TARGETS (Matches media_1794049683895_d176ec76.jpg)
              ============================================================ */}
          {islandOverlay === 'all-apps' ? (
            <div className="all-apps-overlay-view" onClick={() => setShowMenu(false)}>
              <div className="all-apps-grid">
                {[
                  { id: 'music', label: 'Music', icon: Music, action: () => { setActiveTab('music'); setIslandOverlay(null); } },
                  // { id: 'robo', label: 'Robo', isRoboEyes: true, action: () => { setActiveTab('robo'); setIslandOverlay(null); } },
                  { id: 'code', label: 'Agents', icon: Terminal, action: () => { setActiveTab('code'); setIslandOverlay(null); } },
                  { id: 'timer', label: 'Focus', icon: Timer, action: () => { setActiveTab('timer'); setIslandOverlay(null); } },
                  { id: 'clips', label: 'Clipboard', icon: Copy, action: () => { setActiveTab('clips'); setIslandOverlay(null); } },
                  { id: 'notes', label: 'Note', icon: FileText, action: () => { setActiveTab('notes'); setIslandOverlay(null); } },
                  { id: 'cal', label: 'Calendar', icon: Calendar, action: () => { setActiveTab('cal'); setIslandOverlay(null); } },
                  // { id: 'inbox', label: 'Mail', icon: Mail, action: () => { setActiveTab('inbox'); setIslandOverlay(null); } },
                  { id: 'mirror', label: 'Mirror', icon: Video, action: () => { setIslandOverlay('mirror'); } },
                  { id: 'settings', label: 'Settings', icon: Settings, action: () => { window.twocode?.openSettingsWindow?.('home'); setIslandOverlay(null); } },
                ].map((appItem) => {
                  const AppIcon = appItem.icon;
                  return (
                    <button
                      key={appItem.id}
                      type="button"
                      className="all-apps-cell"
                      onClick={() => {
                        playRoboSound('tap', islandSettings.soundEffects !== false);
                        appItem.action();
                      }}
                    >
                      <div className="all-apps-squircle">
                        {appItem.isRoboEyes ? (
                          <div className="mini-squircle-eyes">
                            <i />
                            <i />
                          </div>
                        ) : (
                          <AppIcon size={18} strokeWidth={1.9} />
                        )}
                      </div>
                      <span className="all-apps-label">{appItem.label}</span>
                    </button>
                  );
                })}

                {/* User's own added shortcuts ( ONLY if user added any in Settings ) */}
                {shortcuts.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    className="all-apps-cell"
                    onClick={() => {
                      playRoboSound('tap', islandSettings.soundEffects !== false);
                      triggerRoboReaction('app-open', 2, 1050);
                      window.twocode?.openApp(sc);
                      setIslandOverlay(null);
                    }}
                  >
                    <div className="all-apps-squircle">
                      <RealAppIcon sc={sc} size={22} />
                    </div>
                    <span className="all-apps-label">{sc.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : islandOverlay === 'mirror' ? (
            /* ============================================================
               OVERLAY 1B: MIRROR WEBCAM VIEW
               ============================================================ */
            <div className="mirror-overlay-view">
              <video
                ref={mirrorVideoRef}
                autoPlay
                playsInline
                muted
                className="mirror-video-feed"
              />
              <button
                type="button"
                className="mirror-close-pill"
                onClick={() => setIslandOverlay(null)}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* MAIN TAB CONTENT AREA */}
              <main className="island-body" onClick={() => setShowMenu(false)}>
                {/* ============================================================
                    OVERLAY 2: CUSTOMIZE 4-LAYOUT CAROUSEL
                    Matches screenshot media_1794017528945_3ce66107.png
                    ============================================================ */}
                {islandOverlay === 'customize-carousel' ? (
                  <div className="customize-carousel-view">
                    <div className="carousel-track-stage">
                      {/* Left Neighbour Preview Card */}
                      <div
                        className="carousel-side-card left"
                        onClick={() => {
                          playRoboSound('tap', islandSettings.soundEffects !== false);
                          setHomeLayoutIndex((i) => (i + 3) % 4);
                        }}
                      >
                        <div className="mini-bento-preview">
                          <div className="mb-box">
                            <small>FOCUS</small>
                            <strong className="clock-number-text">25:00</strong>
                          </div>
                          <div className="mb-box">
                            <small>ROBO</small>
                            <strong>Ask Robo</strong>
                          </div>
                          <div className="mb-box">
                            <small>NOTE</small>
                            <strong>Note</strong>
                          </div>
                          <div className="mb-box">
                            <small>AGENDA</small>
                            <strong>Nothing planned</strong>
                          </div>
                        </div>
                      </div>

                      {/* Active Center Preview Card with White Border */}
                      <div
                        className="carousel-center-card"
                        onClick={() => setIslandOverlay(null)}
                      >
                        <div className="cc-topbar">
                          {renderDateTop(now, true)}
                          <div className="cc-eyes">
                            <i />
                            <i />
                          </div>
                        </div>

                        {currentLayoutId === 'clock' && (
                          <>
                            <div className="cc-big-clock" style={{ color: effectiveClockColor }}>
                              {formatTimeHHMM(now)}
                            </div>
                            <div className="cc-cards-row">
                              <div className="cc-mini-card">
                                <span className="cc-grey-sq" />
                                <div>
                                  <strong>Connect</strong>
                                  <small>in Settings</small>
                                </div>
                              </div>
                              <div className="cc-mini-card">
                                {currentMedia.thumbnail ? (
                                  <img src={currentMedia.thumbnail} alt="" className="cc-thumb" />
                                ) : (
                                  <div className="cc-thumb-empty" />
                                )}
                                <div className="truncate">
                                  <strong>{currentMedia.title || 'Music'}</strong>
                                  <small>{currentMedia.artist || 'Ready'}</small>
                                </div>
                              </div>
                              <div className="cc-mini-card">
                                <div>
                                  <strong className="clock-number-text">25:00</strong>
                                  <small>Focus, ready</small>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {currentLayoutId === 'grid' && (
                          <div className="cc-grid-preview">
                            <div className="mb-box">
                              <small>MUSIC</small>
                              <strong>{currentMedia.title || 'Ready'}</strong>
                            </div>
                            <div className="mb-box">
                              <small>FOCUS</small>
                              <strong className="clock-number-text">25:00</strong>
                            </div>
                            <div className="mb-box">
                              <small>ROBO</small>
                              <strong>Ask Robo</strong>
                            </div>
                            <div className="mb-box">
                              <small>AGENDA</small>
                              <strong>Nothing planned</strong>
                            </div>
                          </div>
                        )}

                        {currentLayoutId === 'dial' && (
                          <div className="cc-dial-preview">
                            <div className="cc-dial-art" />
                            <div className="cc-dial-ring">
                              <small>CLAUDE</small>
                              <strong>Connect</strong>
                              <span>in Settings</span>
                            </div>
                          </div>
                        )}

                        {currentLayoutId === 'minimal' && (
                          <div className="cc-minimal-preview">
                            <div className="cc-big-clock" style={{ color: clockColor }}>
                              {formatTimeHHMM(now)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Neighbour Preview Card */}
                      <div
                        className="carousel-side-card right"
                        onClick={() => {
                          playRoboSound('tap', islandSettings.soundEffects !== false);
                          setHomeLayoutIndex((i) => (i + 1) % 4);
                        }}
                      >
                        <div className="cc-dial-preview">
                          <div className="cc-dial-art" />
                          <div className="cc-dial-ring">
                            <small>CLAUDE</small>
                            <strong>Connect</strong>
                            <span>in Settings</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="carousel-footer-bar">
                      <strong className="carousel-layout-name">
                        {HOME_LAYOUTS[homeLayoutIndex].name}
                      </strong>
                      <span className="carousel-layout-counter">
                        {homeLayoutIndex + 1} / {HOME_LAYOUTS.length}
                      </span>
                      <button
                        type="button"
                        className="carousel-font-apps-btn"
                        onClick={() => {
                          playRoboSound('tap', islandSettings.soundEffects !== false);
                          setIslandOverlay(null);
                          setActiveTab('home');
                          setIsCustomizingClock(true);
                        }}
                      >
                        Font and apps
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* ============================================================
                        1. HOME TAB (Supports Clock / Grid / Dial / Minimal + Clock Customizer)
                        ============================================================ */}
                    {activeTab === 'home' && (
                      <div className={`home-view ${isCustomizingClock ? 'is-clock-customizing' : ''}`}>
                        <HeroClock
                          timeStr={clockDisplay.time}
                          suffix={clockDisplay.suffix}
                          fontIndex={clockFontIndex}
                          color={effectiveClockColor}
                          scale={clockScale}
                          onClick={() => {
                            if (isCustomizingClock) setShowClockAdvanced(false);
                            setIsCustomizingClock((value) => !value);
                          }}
                        />

                        {isCustomizingClock ? (
                          <div className="clock-customizer-panel">
                            <div className="customizer-row-top">
                              <div className="clock-font-pills">
                                {[
                                  { idx: 0, cls: 'font-serif-bold' },
                                  { idx: 1, cls: 'font-condensed' },
                                  { idx: 2, cls: 'font-editorial' },
                                  { idx: 3, cls: 'font-mono-dot' },
                                  { idx: 4, cls: 'font-script' },
                                  ].map((f) => (
                                  <button
                                    key={f.idx}
                                    type="button"
                                    className={`font-preview-pill ${f.cls} ${
                                      clockFontIndex === f.idx ? 'is-selected' : ''
                                    }`}
                                      style={{ fontFamily: CLOCK_FONT_FAMILIES[f.idx] }}
                                    onClick={() => setClockFontIndex(f.idx)}
                                  >
                                    12
                                  </button>
                                ))}
                              </div>

                              <div className="clock-size-control">
                                <input
                                  type="range"
                                  min="0.78"
                                  max="1.12"
                                  step="0.01"
                                  value={clockScale}
                                  onChange={(e) => setClockScale(parseFloat(e.target.value))}
                                  className="clock-size-slider"
                                  aria-label="Saat boyutu"
                                />
                                <button type="button" className="clock-size-value" title="Boyutu sıfırla" onClick={() => setClockScale(1)}>
                                  {Math.round(clockScale * 100)}%
                                </button>
                              </div>
                            </div>

                            <div className="customizer-row-bottom">
                              <div className="clock-color-swatches">
                                {CLOCK_COLORS.map((hex) => (
                                  <button
                                    key={hex}
                                    type="button"
                                    className={`color-swatch-circle ${
                                      userPickedClockColor && clockColor === hex
                                        ? 'is-selected'
                                        : ''
                                    }`}
                                    style={{ background: hex }}
                                    aria-label={`Saat rengi ${hex}`}
                                    aria-pressed={userPickedClockColor && clockColor === hex}
                                    onClick={() => {
                                      setClockColor(hex);
                                      setUserPickedClockColor(true);
                                    }}
                                  />
                                ))}
                                <button
                                  type="button"
                                  className={`color-swatch-circle rainbow-wheel ${
                                    !userPickedClockColor ? 'is-selected' : ''
                                  }`}
                                  onClick={() => {
                                    setUserPickedClockColor(false);
                                    setClockColor('#7ea6d8');
                                  }}
                                  title="Cover-adaptive colour"
                                  aria-label="Albüm kapağına göre renk"
                                />
                                <label className={`color-swatch-custom ${userPickedClockColor && !CLOCK_COLORS.includes(clockColor) ? 'is-selected' : ''}`} title="Özel renk seç">
                                  <input
                                    type="color"
                                    value={clockColor}
                                    aria-label="Özel saat rengi seç"
                                    onChange={(event) => {
                                      setClockColor(event.target.value);
                                      setUserPickedClockColor(true);
                                    }}
                                  />
                                  <span>＋</span>
                                </label>
                              </div>

                              <div className="customizer-actions">
                                <button
                                  type="button"
                                  className={`customizer-advanced-btn ${showClockAdvanced ? 'is-open' : ''}`}
                                  aria-expanded={showClockAdvanced}
                                  onClick={() => setShowClockAdvanced((value) => !value)}
                                  title="Saat biçimi ve ek seçenekler"
                                >
                                  <Settings size={14} />
                                  <span>Ayrıntılar</span>
                                </button>
                                <button
                                  type="button"
                                  className="customizer-add-app-btn"
                                  onClick={() => handleAddShortcut()}
                                  title="Uygulama ekle"
                                  aria-label="Uygulama ekle"
                                >
                                  <Plus size={17} />
                                </button>
                                <button
                                  type="button"
                                  className="customizer-done-btn"
                                  onClick={() => {
                                    setShowClockAdvanced(false);
                                    setIsCustomizingClock(false);
                                  }}
                                >
                                  Tamam
                                </button>
                              </div>
                            </div>

                            {showClockAdvanced && (
                              <div className="clock-advanced-options">
                                <span>Saat biçimi</span>
                                <div className="clock-time-options" aria-label="Saat biçimi">
                                <button
                                  type="button"
                                  className={clock24Hour ? 'is-selected' : ''}
                                  aria-pressed={clock24Hour}
                                  onClick={() => setClock24Hour(true)}
                                >24 saat</button>
                                <button
                                  type="button"
                                  className={!clock24Hour ? 'is-selected' : ''}
                                  aria-pressed={!clock24Hour}
                                  onClick={() => setClock24Hour(false)}
                                >12 saat</button>
                                <button
                                  type="button"
                                  className={clockShowSeconds ? 'is-selected' : ''}
                                  aria-pressed={clockShowSeconds}
                                  onClick={() => setClockShowSeconds((value) => !value)}
                                >Saniye</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                          <div className="home-cards-row">
                            {/* Left Card: Matches original TwoCode (`0 / jobs today`) */}
                            <div
                              className="home-card jobs-card"
                              onClick={() => setActiveTab('code')}
                              title="AI & Görev geçmişini aç"
                            >
                              <span
                                className={`job-status-square ${
                                  pendingApproval
                                    ? 'pulse-amber'
                                    : activeHookTask
                                    ? 'active-white'
                                    : 'dim-grey'
                                }`}
                              />
                              <div className="home-card-meta">
                                <strong className="home-card-big mono">
                                  {pendingApproval ? 'Approval' : `${jobsToday}`}
                                </strong>
                                <span className="home-card-sub">
                                  {pendingApproval ? 'needed now' : 'jobs today'}
                                </span>
                              </div>
                            </div>

                            {/* Middle Card: Live Windows Media with crimson placeholder & ambient color */}
                            <div
                              className={`home-card media-mini-card ${
                                musicAccent.hasColor ? 'tinted-media-card' : ''
                              } ${!currentMedia.hasSession ? 'is-nothing-playing' : ''} ${
                                !currentMedia.hasSession && showMusicServicePicker
                                  ? 'service-picker-open'
                                  : ''
                              }`}
                              onClick={() => {
                                if (!currentMedia.hasSession) {
                                  playRoboSound('tap', islandSettings.soundEffects !== false);
                                  setShowMusicServicePicker((p) => !p);
                                } else {
                                  setActiveTab('music');
                                }
                              }}
                              title={
                                !currentMedia.hasSession
                                  ? 'Spotify veya YouTube Music başlatmak için tıkla'
                                  : 'Müzik görünümünü aç'
                              }
                            >
                              {!currentMedia.hasSession && showMusicServicePicker ? (
                                <div
                                  className="music-service-picker-row"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className="music-service-logo-btn spotify-btn"
                                    onClick={(e) => handleLaunchMusicService(e, 'spotify')}
                                    title="Spotify Aç"
                                  >
                                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                                      <circle cx="12" cy="12" r="11" fill="#1ED760" />
                                      <path
                                        d="M16.9 10.6C13.9 8.8 8.9 8.6 6.1 9.5C5.6 9.6 5.1 9.4 5 8.9C4.9 8.4 5.1 7.9 5.6 7.8C8.9 6.8 14.4 7 17.9 9.1C18.3 9.3 18.5 9.9 18.2 10.3C18 10.7 17.4 10.9 16.9 10.6ZM16.8 13.5C16.6 13.9 16.1 14 15.7 13.7C13.2 12.2 9.4 11.7 6.5 12.6C6.1 12.7 5.6 12.5 5.5 12.1C5.4 11.7 5.6 11.2 6 11.1C9.4 10.1 13.6 10.6 16.5 12.4C16.9 12.6 17 13.1 16.8 13.5ZM15.5 16.3C15.3 16.6 14.9 16.7 14.6 16.5C12.4 15.2 9.7 14.9 6.6 15.6C6.3 15.7 5.9 15.5 5.8 15.1C5.7 14.8 5.9 14.4 6.3 14.3C9.8 13.5 12.8 13.8 15.3 15.3C15.6 15.5 15.7 16 15.5 16.3Z"
                                        fill="#000000"
                                      />
                                    </svg>
                                    <span>Spotify</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="music-service-logo-btn ytmusic-btn"
                                    onClick={(e) => handleLaunchMusicService(e, 'ytmusic')}
                                    title="YouTube Music Aç"
                                  >
                                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                                      <circle cx="12" cy="12" r="11" fill="#FF0033" />
                                      <circle
                                        cx="12"
                                        cy="12"
                                        r="6.2"
                                        stroke="#FFFFFF"
                                        strokeWidth="1.4"
                                      />
                                      <polygon points="10.4,9.3 15.2,12 10.4,14.7" fill="#FFFFFF" />
                                    </svg>
                                    <span>YT Music</span>
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {currentMedia.thumbnail ? (
                                    <img
                                      src={currentMedia.thumbnail}
                                      alt=""
                                      className="mini-card-cover"
                                    />
                                  ) : (
                                    <div className="mini-card-cover crimson-placeholder-cover" />
                                  )}
                                  <div className="home-card-meta truncate">
                                    <strong className="home-card-title">
                                      {currentMedia.title}
                                    </strong>
                                    {currentMedia.hasSession && (
                                      <span className="home-card-sub">
                                        {currentMedia.artist || 'Windows Media'}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className={`circle-white-btn ${
                                      !currentMedia.hasSession ? 'nothing-play-btn' : ''
                                    }`}
                                    onClick={handlePlayPause}
                                    aria-label="Play or Pause"
                                  >
                                    {currentMedia.isPlaying ? (
                                      <Pause size={13} fill="#050506" strokeWidth={2.5} />
                                    ) : (
                                      <Play
                                        size={13}
                                        fill="#050506"
                                        strokeWidth={2.5}
                                        style={{ marginLeft: 1 }}
                                      />
                                    )}
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Right Card: Focus Timer */}
                            <div
                              className="home-card focus-mini-card"
                              onClick={() => setActiveTab('timer')}
                              title="Focus sayacını aç"
                            >
                              <div className="home-card-meta">
                                <strong className="home-card-big mono">
                                  {formatTimerBig(timerSeconds)}
                                </strong>
                                <span className="home-card-sub">
                                  {timerRunning ? 'Focus, running' : 'Focus, ready'}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="circle-white-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playRoboSound('tap', islandSettings.soundEffects !== false);
                                  setTimerRunning((r) => !r);
                                }}
                                aria-label="Start or Pause Focus"
                              >
                                {timerRunning ? (
                                  <Pause size={14} fill="#050506" strokeWidth={2.5} />
                                ) : (
                                  <Play
                                    size={14}
                                    fill="#050506"
                                    strokeWidth={2.5}
                                    style={{ marginLeft: 1 }}
                                  />
                                )}
                              </button>
                            </div>
                          </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* ============================================================
                        2. CODEX / CLAUDE TAB
                        ============================================================ */}
                    {activeTab === 'code' && (
                      <div className="codex-view">
                        <div className="codex-left-col">
                          <div
                            className="codex-giant-eyes"
                            onClick={() => playRoboSound('happy', islandSettings.soundEffects !== false)}
                            title="Robo"
                          >
                            <span className="giant-eye" />
                            <span className="giant-eye" />
                          </div>
                          <div className="codex-jobs-counter">{jobsToday}</div>
                          <div className="codex-jobs-label">
                            <i className="codex-white-sq" />
                            <span>JOBS TODAY</span>
                          </div>
                        </div>
                        <div className="codex-right-col">
                          <div className="codex-header-row">
                            <h3 className="codex-title" title="Kod ajanlarının görev geçmişi">AI ACTIVITY</h3>
                            {pendingApproval && (
                              <div className="approval-inline-btns">
                                <button type="button" className="btn-allow-sm" onClick={() => handleApprovalDecision(true)}>Allow</button>
                                <button type="button" className="btn-deny-sm" onClick={() => handleApprovalDecision(false)}>Deny</button>
                              </div>
                            )}
                          </div>
                          <div className="codex-recently-card">
                            <span className="recently-heading">AGENT ACTIVITY</span>
                            <div className="recently-list">
                              {activeRecentJobs.length === 0 ? (
                                <div className="recently-row">
                                  <span className="recently-prompt-text" style={{ opacity: 0.5 }}>Agent activity will appear here</span>
                                </div>
                              ) : (
                                activeRecentJobs.slice(0, 3).map((job) => (
                                  <div key={job.id} className="recently-row">
                                    <span className={`recently-check-circle ${job.type === 'thinking' ? 'is-agent-thinking' : ''}`}>
                                      {job.type === 'thinking' ? <i /> : <Check size={11} strokeWidth={3.2} color="#000000" />}
                                    </span>
                                    <span className="recently-prompt-text">{job.title}</span>
                                    <span className="recently-time">{job.agent} · {job.type === 'thinking' ? 'Düşünüyor' : job.type === 'done' ? 'Yanıtladı' : job.type === 'error' ? 'Hata' : job.type === 'interrupted' ? 'Durduruldu' : job.time}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ============================================================
                        3. MUSIC TAB (Live Cover Art + Karaoke Lyrics + Dynamic Color)
                        ============================================================ */}
                    {activeTab === 'music' && (
                      <div className="music-view">
                        <div className="music-art-column">
                          <div className={`music-cover-art ${currentMedia.thumbnail ? 'has-art' : ''}`}>
                            {currentMedia.thumbnail ? (
                              <img src={currentMedia.thumbnail} alt={`${currentMedia.title} albüm kapağı`} />
                            ) : (
                              <Music size={38} strokeWidth={1.8} aria-hidden="true" />
                            )}
                          </div>
                        </div>
                        <div className="music-right-panel">
                          <div className="music-track-header" aria-live="polite">
                            <span className={`music-status-dot ${currentMedia.isPlaying ? 'is-playing' : ''}`} />
                            <span>{currentMedia.hasSession ? 'NOW PLAYING' : 'Nothing playing'}</span>
                            <span className="music-track-dot">·</span>
                            <span className="music-track-artist">
                              {currentMedia.hasSession ? (currentMedia.artist || currentMedia.album || 'Playing on this PC') : 'Play music or a video'}
                            </span>
                          </div>

                          <div className="music-lyrics-box">
                            <p
                              className={`lyric-line-active ${
                                hasSyncedLyrics ? 'karaoke-active-line' : ''
                              }`}
                            >
                              {primaryLine}
                            </p>
                            {secondaryLine && <p className="lyric-line-next">{secondaryLine}</p>}
                          </div>

                          <div className="music-progress-row">
                            <span className="music-time-label">
                              {formatMMSS(isScrubbing && scrubPosition !== null ? scrubPosition : currentMedia.position)}
                            </span>
                            <div
                              ref={scrubberTrackRef}
                              className={`music-scrubber-track ${isScrubbing ? 'is-scrubbing' : ''}`}
                              role="slider"
                              tabIndex={0}
                              aria-label="Parça ilerlemesi"
                              aria-valuemin={0}
                              aria-valuemax={currentMedia.duration || 0}
                              aria-valuenow={Math.round(isScrubbing && scrubPosition !== null ? scrubPosition : (currentMedia.position || 0))}
                              onClick={handleScrubberClick}
                              onMouseDown={handleScrubberMouseDown}
                            >
                              <div
                                className="music-scrubber-fill"
                                style={{
                                  width: `${
                                    currentMedia.duration > 0
                                      ? Math.min(100, Math.max(0, (((isScrubbing && scrubPosition !== null ? scrubPosition : currentMedia.position) || 0) / currentMedia.duration) * 100))
                                      : 0
                                  }%`,
                                }}
                              />
                              <div
                                className="music-scrubber-thumb"
                                style={{
                                  left: `${
                                    currentMedia.duration > 0
                                      ? Math.min(100, Math.max(0, (((isScrubbing && scrubPosition !== null ? scrubPosition : currentMedia.position) || 0) / currentMedia.duration) * 100))
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="music-time-label">
                              -{formatMMSS(Math.max(0, (currentMedia.duration || 0) - (isScrubbing && scrubPosition !== null ? scrubPosition : (currentMedia.position || 0))))}
                            </span>
                          </div>

                          <div className="music-controls-row">
                            {!currentMedia.hasSession && showMusicServicePicker ? (
                              <div className="music-service-picker-row in-music-tab">
                                <button
                                  type="button"
                                  className="music-service-logo-btn spotify-btn"
                                  onClick={(e) => handleLaunchMusicService(e, 'spotify')}
                                  title="Spotify Aç"
                                >
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="11" fill="#1ED760" />
                                    <path
                                      d="M16.9 10.6C13.9 8.8 8.9 8.6 6.1 9.5C5.6 9.6 5.1 9.4 5 8.9C4.9 8.4 5.1 7.9 5.6 7.8C8.9 6.8 14.4 7 17.9 9.1C18.3 9.3 18.5 9.9 18.2 10.3C18 10.7 17.4 10.9 16.9 10.6ZM16.8 13.5C16.6 13.9 16.1 14 15.7 13.7C13.2 12.2 9.4 11.7 6.5 12.6C6.1 12.7 5.6 12.5 5.5 12.1C5.4 11.7 5.6 11.2 6 11.1C9.4 10.1 13.6 10.6 16.5 12.4C16.9 12.6 17 13.1 16.8 13.5ZM15.5 16.3C15.3 16.6 14.9 16.7 14.6 16.5C12.4 15.2 9.7 14.9 6.6 15.6C6.3 15.7 5.9 15.5 5.8 15.1C5.7 14.8 5.9 14.4 6.3 14.3C9.8 13.5 12.8 13.8 15.3 15.3C15.6 15.5 15.7 16 15.5 16.3Z"
                                      fill="#000000"
                                    />
                                  </svg>
                                  <span>Spotify</span>
                                </button>

                                <button
                                  type="button"
                                  className="music-service-logo-btn ytmusic-btn"
                                  onClick={(e) => handleLaunchMusicService(e, 'ytmusic')}
                                  title="YouTube Music Aç"
                                >
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="11" fill="#FF0033" />
                                    <circle
                                      cx="12"
                                      cy="12"
                                      r="6.2"
                                      stroke="#FFFFFF"
                                      strokeWidth="1.4"
                                    />
                                    <polygon points="10.4,9.3 15.2,12 10.4,14.7" fill="#FFFFFF" />
                                  </svg>
                                  <span>YouTube Music</span>
                                </button>
                              </div>
                            ) : (
                              <div className="music-transport-center">
                                <button
                                  type="button"
                                  className="transport-icon-btn"
                                  onClick={handlePrev}
                                  aria-label="Önceki parça"
                                  title="Önceki parça"
                                >
                                  <SkipBack size={18} fill="#ffffff" />
                                </button>
                                <button
                                  type="button"
                                  className="transport-play-circle"
                                  onClick={handlePlayPause}
                                  aria-label={currentMedia.isPlaying ? 'Duraklat' : currentMedia.hasSession ? 'Oynat' : 'Müzik uygulaması seç'}
                                  title={currentMedia.isPlaying ? 'Duraklat' : currentMedia.hasSession ? 'Oynat' : 'Müzik uygulaması seç'}
                                >
                                  {currentMedia.isPlaying ? (
                                    <Pause size={18} fill="#050506" strokeWidth={2.5} />
                                  ) : (
                                    <Play
                                      size={18}
                                      fill="#050506"
                                      strokeWidth={2.5}
                                      style={{ marginLeft: 2 }}
                                    />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="transport-icon-btn"
                                  onClick={handleNext}
                                  aria-label="Sonraki parça"
                                  title="Sonraki parça"
                                >
                                  <SkipForward size={18} fill="#ffffff" />
                                </button>
                              </div>
                            )}

                            <div className="music-device-wrap">
                              {showPlayOnPopover && (
                                <div
                                  className="play-on-popover"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="play-on-header">
                                    <strong>Play on</strong>
                                    <button
                                      type="button"
                                      className="play-on-close"
                                      onClick={() => setShowPlayOnPopover(false)}
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                  <div className="play-on-divider" />
                                  <div className="play-on-row">
                                    <div className="play-on-left">
                                      <Laptop size={14} />
                                      <span>This PC</span>
                                    </div>
                                    <Check size={14} strokeWidth={2.5} />
                                  </div>
                                </div>
                              )}
                              <button
                                type="button"
                                className="music-device-btn active-live"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playRoboSound('tap', islandSettings.soundEffects !== false);
                                  setShowPlayOnPopover((p) => !p);
                                }}
                                title="Play on"
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
                                  <polygon points="12 15 17 21 7 21 12 15" fill="currentColor" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ============================================================
                        4. ROBO TAB
                        ============================================================ */}
                    {activeTab === 'robo' && (
                      <div className="robo-ask-view">
                        <div className="robo-chat-layout">
                          <nav className="robo-model-switcher" aria-label="Yanıt modelini seç">
                            {[
                              { name: 'Claude', accent: '#d97757' },
                              { name: 'Codex', accent: '#b8c5d2' },
                              { name: 'Gemini', accent: '#9a8cff' },
                            ].map((model) => (
                              <button
                                key={model.name}
                                type="button"
                                className={`robo-model-option ${selectedAiProvider === model.name ? 'active' : ''}`}
                                style={{ '--provider-accent': model.accent }}
                                onClick={() => setSelectedAiProvider(model.name)}
                                aria-pressed={selectedAiProvider === model.name}
                              >
                                <span className="robo-model-logo"><AiProviderLogo provider={model.name} size={18} /></span>
                                <span className="robo-model-name"><strong>{model.name}</strong></span>
                              </button>
                            ))}
                          </nav>

                          <div className="robo-chat-main">
                            <section className={`robo-answer-card ${roboLoading ? 'is-loading' : ''}`} aria-live="polite" aria-busy={roboLoading}>
                              {roboReply ? (
                                <>
                                  <div className="robo-answer-header">
                                    <div className="robo-answer-provider">
                                      <span>Yanıt</span>
                                    </div>
                                    <div className="robo-answer-actions">
                                      <button type="button" className="robo-ans-btn" onClick={() => { window.twocode?.copyText(roboReply); playRoboSound('tap', islandSettings.soundEffects !== false); }} title="Cevabı kopyala">
                                        <Copy size={13} /><span>Kopyala</span>
                                      </button>
                                      <button type="button" className="robo-ans-btn close" onClick={() => setRoboReply(null)} title="Cevabı kapat" aria-label="Cevabı kapat"><X size={14} /></button>
                                    </div>
                                  </div>
                                  <div className="robo-answer-body"><RoboMarkdown content={roboReply} /></div>
                                </>
                              ) : roboLoading ? (
                                <div className="robo-answer-empty is-thinking"><span className="robo-answer-empty-icon"><Bot size={18} /></span><strong>Yanıt hazırlanıyor</strong></div>
                              ) : (
                                <div className="robo-answer-empty"><span className="robo-answer-empty-icon"><Bot size={18} /></span><strong>Yanıtın burada görünecek</strong></div>
                              )}
                            </section>

                            <div className={`robo-search-pill ${roboLoading ? 'is-thinking' : ''}`} aria-busy={roboLoading}>
                              <input
                                type="text"
                                placeholder={roboLoading ? 'Robo düşünüyor…' : 'Sorunu buraya yaz…'}
                                value={roboQuestion}
                                onChange={(e) => setRoboQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !roboLoading && submitRoboPrompt()}
                                aria-label="Robo’ya soru sor"
                              />
                              <button type="button" className="robo-mic-btn" title="Sesli giriş" onClick={() => { setRoboReply('Sesli soru girişi henüz desteklenmiyor. Sorunuzu metin olarak yazın.'); setRoboReplyProvider(selectedAiProvider); }}>
                                <Mic size={16} />
                              </button>
                              <button type="button" className="robo-send-circle" onClick={() => submitRoboPrompt()} disabled={roboLoading || !roboQuestion.trim()} aria-label="Soruyu gönder">
                                <ArrowUp size={16} strokeWidth={2.6} color="#000000" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ============================================================
                        5. FOCUS TAB
                        ============================================================ */}
                    {activeTab === 'timer' && (
                      <div className="focus-tab-view">
                        <div className="focus-top-row">
                          <div className="focus-time-col">
                            <HeroClock
                              timeStr={formatTimerBig(timerSeconds)}
                              fontIndex={clockFontIndex}
                              color="#ffffff"
                              size="focus"
                            />
                            <span className="focus-done-at">Done at {doneAtTimeStr}</span>
                          </div>

                          {timerRunning ? (
                            <div className="focus-running-actions">
                              <button
                                type="button"
                                className="focus-secondary-btn"
                                onClick={() => {
                                  playRoboSound('tap', islandSettings.soundEffects !== false);
                                  setFocusMinutes((m) => Math.min(60, m + 5));
                                  setTimerSeconds((s) => s + 5 * 60);
                                }}
                              >
                                +5 min
                              </button>
                              <button
                                type="button"
                                className="focus-secondary-btn"
                                onClick={() => {
                                  playRoboSound('tap', islandSettings.soundEffects !== false);
                                  setTimerRunning(false);
                                  setTimerSeconds(focusMinutes * 60);
                                }}
                              >
                                Stop
                              </button>
                              <button
                                type="button"
                                className="focus-start-btn"
                                onClick={() => {
                                  playRoboSound('tap', islandSettings.soundEffects !== false);
                                  setTimerRunning(false);
                                }}
                              >
                                Pause
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="focus-start-btn"
                              onClick={() => {
                                playRoboSound('focused', islandSettings.soundEffects !== false);
                                setTimerRunning(true);
                              }}
                            >
                              Start
                            </button>
                          )}
                        </div>

                        <div
                          ref={rulerRef}
                          className="focus-ruler-container"
                          onMouseDown={(e) => {
                            setIsDraggingRuler(true);
                            updateRulerMinutes(e.clientX);
                          }}
                        >
                          <div className="focus-ruler-ticks">
                            {Array.from({ length: 61 }, (_, m) => {
                              const isMajor = m % 10 === 0;
                              const isSelected = m === focusMinutes;
                              return (
                                <div
                                  key={m}
                                  className={`ruler-tick-wrap ${isMajor ? 'major' : 'minor'} ${
                                    isSelected ? 'selected' : ''
                                  }`}
                                >
                                  <span className="ruler-tick-line" />
                                </div>
                              );
                            })}
                          </div>
                          <div className="focus-ruler-labels">
                            {[0, 10, 20, 30, 40, 50, 60].map((num) => (
                              <span key={num}>{num}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ============================================================
                        6. MODES TAB
                        ============================================================ */}
                    {activeTab === 'sleep' && (
                      <div className="modes-tab-view">
                        <div className="modes-sidebar">
                          {MODE_OPTIONS.map((m) => {
                            const MIcon = m.icon;
                            const active = selectedModeName === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                className={`mode-side-btn ${active ? 'is-active' : ''}`}
                                style={{ '--mode-color': m.color }}
                                onClick={() => handleSelectMode(m.id)}
                              >
                                <MIcon size={15} strokeWidth={2} />
                                <span>{m.id}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="modes-main-panel">
                          <div className="modes-profile-header">
                            <div className="mode-profile-icon"><ActiveModeIcon size={17} strokeWidth={2.1} /></div>
                            <div className="mode-profile-copy">
                              <strong>{selectedModeName}</strong>
                              <span>{activeModeSummary}</span>
                            </div>
                            <span className="mode-active-indicator"><i /> Aktif</span>
                          </div>

                          <div className="modes-toggles-list">
                            <div className="mode-toggle-row">
                              <div className="mode-toggle-left">
                                <Shield size={14} className="mode-row-icon" />
                                <span>Block YouTube, TikTok, Instagram</span>
                              </div>
                              <button
                                type="button"
                                className={`ios-switch ${modeToggles.blockSocial ? 'on' : 'off'}`}
                                onClick={() =>
                                  setModeToggles((t) => ({ ...t, blockSocial: !t.blockSocial }))
                                }
                              >
                                <span className="ios-switch-thumb" />
                              </button>
                            </div>

                            <div className="mode-toggle-row">
                              <div className="mode-toggle-left">
                                <Bell size={14} className="mode-row-icon" />
                                <span>Only Claude can reach you</span>
                              </div>
                              <button
                                type="button"
                                className={`ios-switch ${modeToggles.onlyClaude ? 'on' : 'off'}`}
                                onClick={() =>
                                  setModeToggles((t) => ({ ...t, onlyClaude: !t.onlyClaude }))
                                }
                              >
                                <span className="ios-switch-thumb" />
                              </button>
                            </div>

                            <div className="mode-toggle-row">
                              <div className="mode-toggle-left">
                                <Music size={14} className="mode-row-icon" />
                                <span>Keep my music on</span>
                              </div>
                              <button
                                type="button"
                                className={`ios-switch ${modeToggles.keepMusic ? 'on' : 'off'}`}
                                onClick={() =>
                                  setModeToggles((t) => ({ ...t, keepMusic: !t.keepMusic }))
                                }
                              >
                                <span className="ios-switch-thumb" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ============================================================
                        8. CLIPS TAB
                        ============================================================ */}
                    {activeTab === 'clips' && (
                      <div className="clips-tab-view">
                        {clips.length === 0 ? (
                          <div className="clips-empty-state">
                            <strong>Nothing copied yet</strong>
                            <span>Copy something (Ctrl + C) and it shows up here.</span>
                          </div>
                        ) : (
                          <div className="panel-view clips-view">
                            <div className="clips-header">
                              <span>Copied Clips ({clips.length})</span>
                              <button
                                type="button"
                                className="mini-action-btn"
                                onClick={() => setClips([])}
                              >
                                Clear
                              </button>
                            </div>
                            <div className="clips-list">
                              {clips.map((c) => (
                                <div
                                  key={c.id}
                                  className="clip-row"
                                  onClick={() => {
                                    window.twocode?.copyText(c.text);
                                    setCopiedId(c.id);
                                    setTimeout(() => setCopiedId(null), 1200);
                                  }}
                                >
                                  <code className="clip-text">{c.text}</code>
                                  <span className="clip-time">
                                    {copiedId === c.id ? '✓ Copied' : c.time}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ============================================================
                        9. NOTE TAB
                        ============================================================ */}
                    {activeTab === 'notes' && (
                      <div className="note-split-view">
                        <div className="note-left-pane">
                          <div className="note-header">
                            <div>
                              <span className="note-eyebrow">NOTE</span>
                              <span className="note-save-hint">Otomatik kaydedilir</span>
                            </div>
                            <span className="note-character-count"><span className="clock-number-text">{notesText.length}</span> karakter</span>
                          </div>
                          <textarea
                            className="note-clean-input"
                            placeholder="Başlık ya da notunu yaz…"
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            aria-label="Not içeriği"
                          />
                        </div>

                        <div className="note-vertical-divider" />

                        <div className="note-right-pane">
                          <div className="note-task-header">
                            <div>
                              <strong>Görevler</strong>
                              <span>{noteCheckItems.length ? `${noteCheckItems.filter((item) => /^\[x\]/i.test(item.line.trim())).length}/${noteCheckItems.length} tamamlandı` : 'Notundan görev listesi'}</span>
                            </div>
                            <button type="button" className="note-add-task" onClick={appendNoteTask} title="Görev ekle" aria-label="Görev ekle">
                              <Plus size={14} /> Görev ekle
                            </button>
                          </div>
                          {noteCheckItems.length > 0 ? (
                            <div className="note-checklist">
                              {noteCheckItems.map((item) => {
                                const cleanLabel = item.line.replace(/^\[( |x)\]\s*/i, '');
                                const isChecked = /^\[x\]/i.test(item.line.trim());
                                return (
                                  <button
                                    key={item.idx}
                                    type="button"
                                    className={`note-check-row ${isChecked ? 'checked' : ''}`}
                                    onClick={() => toggleNoteTask(item.idx)}
                                  >
                                    <span className={`note-check-circle ${isChecked ? 'on' : ''}`}>
                                      {isChecked && <Check size={10} strokeWidth={3} color="#000" />}
                                    </span>
                                    <span>{cleanLabel || 'Task item'}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="note-helper-copy">
                              Görev ekleyebilir ya da notta yeni bir satıra <code>[ ]</code> yazarak kontrol listesi oluşturabilirsin.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ============================================================
                        10. AGENDA TAB
                        ============================================================ */}
                    {activeTab === 'cal' && (
                      <AgendaCalendar
                        events={agendaItems}
                        onAddEvent={handleAddAgendaEvent}
                        onDeleteEvent={handleDeleteAgendaEvent}
                      />
                    )}
                    {/* ============================================================
                        11. MAIL TAB
                        ============================================================ */}
                    {activeTab === 'inbox' && (
                      <div className="mail-workspace">
                        <section className="mail-main-panel">
                          <header className="mail-main-header">
                            <nav className="mail-folder-list" aria-label="Posta kategorileri">
                            {MAIL_FOLDERS.map((folder) => {
                              const FolderIcon = folder.icon;
                              const count = Number(mailCounts[folder.countKey]) || 0;
                              return (
                                <button key={folder.id} type="button" className={`mail-folder-btn ${mailCategory === folder.id ? 'active' : ''}`} onClick={() => setMailCategory(folder.id)} aria-current={mailCategory === folder.id ? 'page' : undefined}>
                                  <FolderIcon size={15} strokeWidth={1.9} />
                                  <span>{folder.label}</span>
                                  {count > 0 && <small>{count > 99 ? '99+' : count}</small>}
                                </button>
                              );
                            })}
                            </nav>
                            <div className="mail-header-actions">
                              <span className={`mail-connection-state ${mailIsConnected ? 'connected' : ''}`} title={mailIsConnected ? 'Gmail bağlı' : 'Gmail bağlı değil'} aria-label={mailIsConnected ? 'Gmail bağlı' : 'Gmail bağlı değil'}><i /></span>
                              <button type="button" className="mail-open-gmail" title="Gmail’i aç" aria-label="Gmail’i aç" onClick={() => window.twocode?.openExternal(currentMailFolder.url)}><ExternalLink size={15} /></button>
                              <button type="button" className="mail-compose-btn" title="Yeni e-posta yaz" aria-label="Yeni e-posta yaz" onClick={() => window.twocode?.openExternal('https://mail.google.com/mail/u/0/#compose')}><Plus size={17} /></button>
                            </div>
                          </header>

                          <div className="mail-message-list">
                            {visibleMailItems.length > 0 ? visibleMailItems.map((item, index) => {
                              const sender = item.from || item.sender || 'Gönderen bilinmiyor';
                              const mailId = String(item.id || '');
                              const hasThreadId = Boolean(mailId && !/^(m_|mail_count_bump|row_)/i.test(mailId));
                              const messageUrl = hasThreadId ? `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(mailId)}` : currentMailFolder.url;
                              return (
                                <button key={mailId || `${sender}-${item.subject}-${index}`} type="button" className="mail-message-row" aria-label={`${sender}: ${item.subject || 'Konu yok'}`} onClick={() => window.twocode?.openExternal(messageUrl)}>
                                  <span className="mail-sender-avatar">
                                    {(item.senderPhoto || item.profileImage) ? <img src={item.senderPhoto || item.profileImage} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : sender.trim().charAt(0).toLocaleUpperCase('tr-TR')}
                                  </span>
                                  <span className="mail-message-copy">
                                    <span className="mail-message-topline"><strong>{sender}</strong><time className="clock-number-text">{item.time || 'Bugün'}</time></span>
                                    <span className="mail-message-subject">{item.subject || 'Konu yok'}</span>
                                    <small>{item.snippet || ' '}</small>
                                  </span>
                                  <ExternalLink className="mail-message-open-icon" size={13} />
                                </button>
                              );
                            }) : (
                              <div className="mail-empty-state">
                                <span className="mail-empty-icon"><CurrentMailFolderIcon size={18} /></span>
                                <strong>{!mailIsConnected ? 'Gmail’i bağla' : mailCategory !== 'primary' ? 'Bu klasörde ileti yok' : 'Gelen kutusu boş'}</strong>
                                {!mailIsConnected ? <button type="button" onClick={() => window.twocode?.openSettingsWindow?.('connections')} aria-label="Gmail’i bağla"><ExternalLink size={14} /></button> : mailCategory !== 'primary' ? <button type="button" onClick={() => window.twocode?.openExternal(currentMailFolder.url)} aria-label="Gmail’de görüntüle"><ExternalLink size={14} /></button> : null}
                              </div>
                            )}
                          </div>
                        </section>
                      </div>
                    )}
                  </>
                )}
              </main>

              {/* BOTTOM NAVIGATION DOCK */}
              <footer className="island-dock">
                <div className="dock-shortcuts-pill">
                  {shortcuts.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      className="shortcut-brand-btn"
                      title={sc.name}
                      onClick={() => {
                        triggerRoboReaction('app-open', 2, 1050);
                        window.twocode?.openApp(sc);
                      }}
                    >
                      <RealAppIcon sc={sc} size={15} />
                    </button>
                  ))}
                  <div
                    className="shortcut-plus-wrap"
                    onMouseEnter={() => setHoverAddApp(true)}
                    onMouseLeave={() => setHoverAddApp(false)}
                  >
                    {hoverAddApp && (
                      <div className="dock-add-tooltip">Add your own app</div>
                    )}
                    <button
                      type="button"
                      className="shortcut-plus-btn"
                      onClick={handleAddShortcut}
                    >
                      <Plus size={14} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>

                <nav className="dock-tabs" aria-label="Dynamic Island Modes">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id && !islandOverlay;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`dock-tab-btn ${isActive ? 'is-active' : ''}`}
                        onClick={() => {
                          playRoboSound('tap', islandSettings.soundEffects !== false);
                          setIslandOverlay(null);
                          setActiveTab(item.id);
                        }}
                        title={item.label}
                      >
                        <Icon size={14} strokeWidth={2} />
                        {isActive && <span className="dock-tab-label">{item.label}</span>}
                        {item.badge && <span className="dock-tab-badge">{item.badge}</span>}
                      </button>
                    );
                  })}
                </nav>

                <button
                  type="button"
                  className="dock-volume-btn"
                  onClick={handleVolumeClick}
                  onWheel={handleVolumeWheel}
                  title="Ses Kontrolü (Tıkla: Sessize Al, Tekerlek: Ses Aç/Kıs)"
                >
                  {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
              </footer>
            </>
          )}
        </div>
      </div>

      {/* Detached Top-Bezel Circular Media Droplet when Focus Timer + Media are both active */}
      <div
        className={`detached-media-droplet ${
          islandMode === 'focus-bar-media' ? 'is-visible' : ''
        }`}
        style={{ left: 418, width: 48, height: 26 }}
        onClick={() => {
          setActiveTab('music');
          setIslandMode('expanded');
        }}
      >
        {currentMedia.thumbnail ? (
          <img src={currentMedia.thumbnail} alt="" className="droplet-cover-img" />
        ) : (
          <Music size={14} />
        )}
      </div>

      {/* Modern Sleek Global Tooltip */}
      <div
        className={`modern-tooltip-portal is-${tooltipState.placement} ${
          tooltipState.visible ? 'is-visible' : 'is-hidden'
        }`}
        style={{
          left: Math.max(70, Math.min(window.innerWidth - 70, tooltipState.x)),
          top: tooltipState.y,
        }}
        aria-hidden="true"
      >
        <div className="modern-tooltip-bubble">
          {renderTooltipContent(tooltipState.text)}
        </div>
      </div>
    </div>
  );
}
