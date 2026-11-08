import React, { useState, useEffect, useRef, useMemo } from 'react';
import RealAppIcon from './RealAppIcon';
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
} from 'lucide-react';
import RoboEyes from './RoboEyes';
import HeroClock from './HeroClock';
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
    img.crossOrigin = 'Anonymous';
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

// Use the notifying app identity first, then its native icon's dominant color.
const NOTIFICATION_BRANDS = [
  { match: /gmail|google.?mail|com\.google\.android\.gm/, rgb: '234, 67, 53', hex: '#EA4335', brand: 'gmail' },
  { match: /google.?calendar|calendar|takvim|ajanda/, rgb: '66, 133, 244', hex: '#4285F4', brand: 'calendar' },
  { match: /outlook|microsoft\.office\.outlook/, rgb: '0, 120, 212', hex: '#0078D4', brand: 'outlook' },
  { match: /teams|msteams/, rgb: '98, 100, 167', hex: '#6264A7', brand: 'teams' },
  { match: /whatsapp/, rgb: '37, 211, 102', hex: '#25D366', brand: 'whatsapp' },
  { match: /discord/, rgb: '88, 101, 242', hex: '#5865F2', brand: 'discord' },
  { match: /telegram/, rgb: '42, 171, 238', hex: '#2AABEE', brand: 'telegram' },
  { match: /spotify/, rgb: '30, 215, 96', hex: '#1ED760', brand: 'spotify' },
  { match: /youtube|ytmusic/, rgb: '255, 0, 51', hex: '#FF0033', brand: 'youtube' },
  { match: /instagram/, rgb: '225, 48, 108', hex: '#E1306C', brand: 'instagram' },
  { match: /slack/, rgb: '97, 31, 105', hex: '#611F69', brand: 'slack' },
  { match: /twitter|(^|[\s._-])x($|[\s._-])/, rgb: '29, 155, 240', hex: '#1D9BF0', brand: 'x' },
  { match: /linkedin/, rgb: '10, 102, 194', hex: '#0A66C2', brand: 'linkedin' },
  { match: /facebook|messenger|meta/, rgb: '8, 102, 255', hex: '#0866FF', brand: 'facebook' },
  { match: /tiktok/, rgb: '254, 44, 85', hex: '#FE2C55', brand: 'tiktok' },
  { match: /snapchat/, rgb: '255, 252, 0', hex: '#FFFC00', brand: 'snapchat' },
  { match: /pinterest/, rgb: '230, 0, 35', hex: '#E60023', brand: 'pinterest' },
  { match: /signal/, rgb: '58, 118, 240', hex: '#3A76F0', brand: 'signal' },
  { match: /zoom/, rgb: '45, 140, 255', hex: '#2D8CFF', brand: 'zoom' },
  { match: /steam/, rgb: '23, 26, 33', hex: '#171A21', brand: 'steam' },
  { match: /github/, rgb: '110, 64, 201', hex: '#6E40C9', brand: 'github' },
  { match: /claude|anthropic/, rgb: '217, 119, 87', hex: '#D97757', brand: 'claude' },
  { match: /chatgpt|openai/, rgb: '16, 163, 127', hex: '#10A37F', brand: 'openai' },
  { match: /chrome|google chrome/, rgb: '66, 133, 244', hex: '#4285F4', brand: 'chrome' },
  { match: /microsoft edge|\bedge\b/, rgb: '10, 155, 140', hex: '#0A9B8C', brand: 'edge' },
  { match: /firefox|mozilla/, rgb: '255, 113, 57', hex: '#FF7139', brand: 'firefox' },
  { match: /visual studio code|vscode/, rgb: '0, 122, 204', hex: '#007ACC', brand: 'vscode' },
  { match: /onedrive/, rgb: '0, 120, 212', hex: '#0078D4', brand: 'onedrive' },
  { match: /windows security|defender/, rgb: '0, 164, 239', hex: '#00A4EF', brand: 'security' },
];

function resolveNotifBrand(banner, logoAccent) {
  const appIdentity = `${banner?.app || ''} ${banner?.appId || ''}`.toLowerCase();
  const genericApp = /^(windows|notification|unknown|app)?\s*$/i.test(banner?.app || '');
  const fallbackText = genericApp ? `${banner?.title || ''} ${banner?.body || ''}` : '';
  const identity = `${appIdentity} ${fallbackText}`;

  const knownBrand = NOTIFICATION_BRANDS.find(({ match }) => match.test(identity));
  if (knownBrand) return knownBrand;
  if (logoAccent?.isLiveCover) {
    return { rgb: logoAccent.rgb, hex: logoAccent.hex, brand: 'native-logo' };
  }
  return { rgb: '43, 130, 246', hex: '#2b82f6', brand: 'default' };
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
  return typeof src === 'string' && (/^data:image\//i.test(src) || /^https:\/\//i.test(src));
}

function NotificationAvatar({ banner, brand, presentation }) {
  const profileImage = isSafeNotificationImage(banner?.profileImage) ? banner.profileImage : '';
  const initials = presentation.sender
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toLocaleUpperCase('tr-TR') || '')
    .join('');
  const personAvatar = presentation.hasPerson;

  return (
    <div className={`notif-toast-avatar ${personAvatar ? 'is-person-avatar' : ''} ${presentation.kind === 'audio' || presentation.kind === 'video' ? 'is-call-avatar' : ''}`}>
      {profileImage ? (
        <>
          <span className="notif-toast-initials is-image-fallback">{initials || '?'}</span>
          <img className="notif-toast-profile-image" src={profileImage} alt={`${presentation.sender} profil fotoğrafı`} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
        </>
      ) : personAvatar ? (
        <span className="notif-toast-initials">{initials || '?'}</span>
      ) : (
        <NotifBrandIcon brand={brand} logo={banner.logo} />
      )}
      {personAvatar && isSafeNotificationImage(banner?.logo) && (
        <span className="notif-toast-app-chip"><img src={banner.logo} alt="" /></span>
      )}
    </div>
  );
}

function NotifBrandIcon({ brand, logo }) {
  if (logo && isSafeNotificationImage(logo)) {
    return <img src={logo} alt="" className="notif-toast-app-logo" />;
  }
  if (brand === 'gmail') {
    return (
      <svg width="31" height="31" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="#fff" />
        <path d="M4.5 17.5V7.2l7.5 5.5 7.5-5.5v10.3" fill="none" stroke="#EA4335" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.5 7.2v10.3" stroke="#4285F4" strokeWidth="2.25" strokeLinecap="round" />
        <path d="M19.5 7.2v10.3" stroke="#34A853" strokeWidth="2.25" strokeLinecap="round" />
        <path d="M12 12.7 19.5 7.2" stroke="#FBBC04" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (brand === 'calendar') {
    return (
      <svg width="29" height="29" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4.5" width="18" height="17" rx="4" fill="#fff" />
        <path d="M3 8.2a3.7 3.7 0 0 1 3.7-3.7h10.6A3.7 3.7 0 0 1 21 8.2V10H3z" fill="#4285F4" />
        <path d="M6.5 3v4M17.5 3v4" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" />
        <text x="12" y="18" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="9" fontWeight="700" fill="#4285F4">31</text>
      </svg>
    );
  }
  if (brand === 'whatsapp') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM17.46 16.26C17.22 16.94 16.06 17.55 15.51 17.63C15.01 17.71 14.37 17.74 13.67 17.52C13.24 17.38 12.69 17.2 11.99 16.9C9.03 15.62 7.1 12.64 6.95 12.44C6.8 12.24 5.75 10.85 5.75 9.41C5.75 7.97 6.51 7.26 6.78 6.97C7.05 6.68 7.37 6.61 7.57 6.61C7.77 6.61 7.97 6.61 8.14 6.62C8.32 6.63 8.56 6.55 8.8 7.12C9.04 7.7 9.62 9.14 9.69 9.29C9.76 9.44 9.81 9.61 9.71 9.81C9.61 10.01 9.56 10.14 9.41 10.31C9.26 10.48 9.1 10.7 8.96 10.84C8.81 10.99 8.65 11.15 8.83 11.45C9.01 11.75 9.62 12.75 10.53 13.56C11.7 14.6 12.68 14.93 12.98 15.08C13.28 15.23 13.46 15.2 13.64 14.99C13.82 14.78 14.41 14.09 14.62 13.79C14.83 13.49 15.03 13.54 15.31 13.64C15.59 13.74 17.08 14.48 17.38 14.63C17.68 14.78 17.88 14.85 17.95 14.98C18.02 15.11 18.02 15.72 17.46 16.26Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (brand === 'discord') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4C14.8 4.37 14.58 4.86 14.42 5.25C12.83 5.01 11.26 5.01 9.69 5.25C9.53 4.86 9.3 4.37 9.1 4C7.6 4.26 6.16 4.71 4.83 5.33C2.13 9.4 1.4 13.37 1.76 17.28C3.55 18.61 5.29 19.42 7 19.95C7.43 19.37 7.81 18.74 8.13 18.08C7.51 17.85 6.91 17.56 6.35 17.22C6.5 17.11 6.64 16.99 6.78 16.87C10.21 18.46 13.94 18.46 17.33 16.87C17.47 16.99 17.61 17.11 17.76 17.22C17.2 17.56 16.6 17.85 15.98 18.08C16.3 18.74 16.68 19.37 17.11 19.95C18.82 19.42 20.56 18.61 22.35 17.28C22.77 12.74 21.63 8.81 19.27 5.33ZM8.68 14.87C7.65 14.87 6.8 13.91 6.8 12.74C6.8 11.57 7.63 10.61 8.68 10.61C9.73 10.61 10.58 11.57 10.56 12.74C10.56 13.91 9.73 14.87 8.68 14.87ZM15.43 14.87C14.4 14.87 13.55 13.91 13.55 12.74C13.55 11.57 14.38 10.61 15.43 10.61C16.48 10.61 17.33 11.57 17.31 12.74C17.31 13.91 16.48 14.87 15.43 14.87Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (brand === 'telegram') {
    return (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
        <path
          d="M20.66 4.24L2.93 11.08C1.72 11.56 1.73 12.24 2.71 12.54L7.26 13.96L17.79 7.31C18.29 7.01 18.75 7.17 18.37 7.51L9.84 15.21H9.83L9.84 15.22L9.53 19.91C9.99 19.91 10.19 19.7 10.45 19.45L12.66 17.3L17.26 20.7C18.11 21.17 18.72 20.93 18.93 19.92L21.95 5.68C22.26 4.44 21.48 3.88 20.66 4.24Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }
  if (brand === 'spotify') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M17.9 9.1C14.4 7 8.9 6.8 5.6 7.8C5.1 7.9 4.9 8.4 5 8.9C5.1 9.4 5.6 9.6 6.1 9.5C8.9 8.6 13.9 8.8 16.9 10.6C17.4 10.9 18 10.7 18.2 10.3C18.5 9.9 18.3 9.3 17.9 9.1ZM16.8 13.5C16.6 13.9 16.1 14 15.7 13.7C13.2 12.2 9.4 11.7 6.5 12.6C6.1 12.7 5.6 12.5 5.5 12.1C5.4 11.7 5.6 11.2 6 11.1C9.4 10.1 13.6 10.6 16.5 12.4C16.9 12.6 17 13.1 16.8 13.5ZM15.5 16.3C15.3 16.6 14.9 16.7 14.6 16.5C12.4 15.2 9.7 14.9 6.6 15.6C6.3 15.7 5.9 15.5 5.8 15.1C5.7 14.8 5.9 14.4 6.3 14.3C9.8 13.5 12.8 13.8 15.3 15.3C15.6 15.5 15.7 16 15.5 16.3Z"
          fill="#000000"
        />
      </svg>
    );
  }
  if (brand === 'youtube') {
    return (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
        <polygon points="9.5,7.5 16.5,12 9.5,16.5" fill="#FFFFFF" />
      </svg>
    );
  }
  if (brand === 'claude') {
    return <Check size={20} strokeWidth={3} color="#ffffff" />;
  }
  if (brand === 'mail' || brand === 'outlook') {
    return <Mail size={19} strokeWidth={2.3} color="#ffffff" />;
  }
  if (logo) {
    return <img src={logo} alt="" className="notif-toast-app-logo" />;
  }
  return <Bell size={18} strokeWidth={2.3} color="#ffffff" />;
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

export default function App() {
  // Island mode: 'idle' | 'mini-progress' | 'battery' | 'music-bar' | 'expanded'
  const [islandMode, setIslandMode] = useState('idle');
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
  const [batteryAlertKind, setBatteryAlertKind] = useState('low');
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
  const [showClockAdvanced, setShowClockAdvanced] = useState(false);

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
  const [codexHistory, setCodexHistory] = useState([]);
  const [claudeHistory, setClaudeHistory] = useState([]);
  const [geminiHistory, setGeminiHistory] = useState([]);
  const [antigravityHistory, setAntigravityHistory] = useState([]);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [activeHookTask, setActiveHookTask] = useState(null);

  // Robo Ask state
  const [roboQuestion, setRoboQuestion] = useState('');
  const [roboReply, setRoboReply] = useState(null);
  const [roboReplyProvider, setRoboReplyProvider] = useState(null);
  const [roboLoading, setRoboLoading] = useState(false);

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

  // AGENDA tab state — NO mock events
  const [agendaViewMode, setAgendaViewMode] = useState('Day');
  const [agendaItems, setAgendaItems] = useState([]);
  const [addingAgenda, setAddingAgenda] = useState(false);
  const [newAgendaTitle, setNewAgendaTitle] = useState('');

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
  const notifTimerRef = useRef(null);
  const isShowingNotifToastRef = useRef(false);
  const hoverExpandTimerRef = useRef(null);

  // Live Windows System HUD (Volume & Screen Brightness) and Windows Notification Toast state
  const [hudOverlay, setHudOverlay] = useState({
    type: 'volume',
    value: 68,
    muted: false,
  });
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
  const [smoothPosition, setSmoothPosition] = useState(0);
  const lastMediaTickRef = useRef(Date.now());

  useEffect(() => {
    if (liveMedia && typeof liveMedia.position === 'number') {
      setSmoothPosition(liveMedia.position);
      lastMediaTickRef.current = Date.now();
    }
  }, [liveMedia?.position, liveMedia?.title]);

  // Advance by real elapsed time so lyric timing stays locked to the media clock.
  useEffect(() => {
    const mediaTick = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min(1, Math.max(0, (now - lastMediaTickRef.current) / 1000));
      lastMediaTickRef.current = now;
      const media = liveMediaRef.current;
      if (!media || !media.hasSession || !media.isPlaying) return;
      setSmoothPosition((prev) => {
        const next = prev + elapsed;
        return media.duration > 0 ? Math.min(media.duration, next) : next;
      });
    }, 250);
    return () => clearInterval(mediaTick);
  }, []);

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
      setBatteryAlertKind('low');
      setIslandMode((current) => {
        if (current === 'expanded') return current;
        return 'battery';
      });
    };

    const triggerChargingAlert = () => {
      setBatteryAlertKind('charging');
      setIslandMode((current) => (current === 'expanded' ? current : 'battery'));
    };

    const handleBatteryChange = () => {
      if (!batteryObj) return;
      const nextPct = Math.round(batteryObj.level * 100);
      setBatteryPercent(nextPct);

      if (batteryObj.charging) {
        if (wasCharging === false) triggerChargingAlert();
        wasCharging = true;
        hasShown20AlertRef.current = false;
        return;
      }
      wasCharging = false;

      if (nextPct > 20) {
        hasShown20AlertRef.current = false;
        return;
      }

      if (nextPct === 20 && !batteryObj.charging && !hasShown20AlertRef.current) {
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
          const pct = Math.round(bat.level * 100);
          if (pct > 0 && pct <= 100) {
            setBatteryPercent(pct);
            if (pct === 20 && !bat.charging && !hasShown20AlertRef.current) {
              hasShown20AlertRef.current = true;
              batteryTimerRef.current = setTimeout(() => triggerBatteryAlert(pct), 1400);
            }
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
  }, [timerRunning, focusMinutes, islandSettings.notifSound, islandSettings.soundEffects]);

  // Connect to Electron IPC bridges
  useEffect(() => {
    if (!window.twocode) return;

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

    window.twocode.getGoogleData?.().then((g) => {
      if (g) {
        setGoogleData(g);
        if (g.mailCounts) setMailCounts({ ...g.mailCounts });
        if (Array.isArray(g.agenda) && g.agenda.length > 0) {
          setAgendaItems(g.agenda.map((a) => a.title));
        }
      }
    });

    const unsubGoogle = window.twocode.onGoogleDataUpdate?.((g) => {
      if (!g) return;
      setGoogleData(g);
      if (g.mailCounts) setMailCounts({ ...g.mailCounts });
      if (Array.isArray(g.agenda) && g.agenda.length > 0) {
        setAgendaItems(g.agenda.map((a) => a.title));
      }
    });

    window.twocode.getMediaStatus?.().then((m) => {
      if (m) setLiveMedia(m);
    });

    const unsubHover = window.twocode.onNotchHoverChange?.((hovering) => {
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

    const unsubMedia = window.twocode.onMediaUpdate((data) => {
      if (data && data.hasSession) {
        setShowMusicServicePicker(false);
      }
      setLiveMedia(data || { hasSession: false });
    });

    const unsubClip = window.twocode.onClipboardUpdate((list) => {
      if (Array.isArray(list)) {
        setClips(list);
      }
    });

    const unsubAgent = window.twocode.onAgentEvent((ev) => {
      const timeStr = new Date().toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const newEntry = {
        id: ev.id,
        agent: ev.agent || selectedAiProvider,
        title: ev.command || ev.title,
        time: timeStr,
        status: ev.type === 'approval' ? 'pending' : 'done',
      };
      setActiveHookTask(newEntry);
      if ((ev.agent || '').toLowerCase().includes('claude')) {
        setClaudeHistory((prev) => [newEntry, ...prev].slice(0, 15));
      } else {
        setCodexHistory((prev) => [newEntry, ...prev].slice(0, 15));
      }

      if (ev.type === 'approval') {
        setPendingApproval(ev);
        setRoboMood('curious');
        setIslandMode('expanded');
        setActiveTab('code');
        playRoboSound('curious', true);
      } else if (ev.type === 'done') {
        setJobsToday((j) => j + 1);
        setRoboMood('happy');
        playNotifSound(islandSettings.notifSound || 'Ding', true);
        playRoboSound('happy', true);
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
      setHudOverlay({
        type: hud.type === 'brightness' ? 'brightness' : 'volume',
        value: typeof hud.value === 'number' ? hud.value : 0,
        muted: Boolean(hud.muted),
      });
      setIslandMode((curr) => {
        if (curr === 'expanded') return curr;
        if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
        hudTimerRef.current = setTimeout(() => {
          setIslandMode((c) => (c === 'hud' ? resolvedCollapsedModeRef.current : c));
        }, 2100);
        return 'hud';
      });
    });

    const unsubWinNotif = window.twocode.onWindowsNotification?.((notif) => {
      if (!notif || (!notif.title && !notif.body)) return;
      if (islandSettings.doNotDisturb) return;
      if (islandSettings.windowsNotifications === false) return;
      if (modeToggles.onlyClaude && !/claude|anthropic/i.test(`${notif.app || ''} ${notif.appId || ''}`)) return;
      const notifId = notif.id || `notification_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      setToastBanner({
        id: notifId,
        app: notif.app || 'Windows',
        appId: notif.appId || '',
        logo: notif.logo || '',
        profileImage: notif.profileImage || notif.avatar || '',
        sender: notif.sender || '',
        notificationKind: notif.notificationKind || '',
        callKind: notif.callKind || '',
        title: notif.title || notif.app || 'Notification',
        body: notif.body || '',
        targetUrl: notif.targetUrl || '',
      });
      setNotificationHistory((items) => [{
        id: notifId,
        app: notif.app || 'Windows', appId: notif.appId || '', logo: notif.logo || '',
        profileImage: notif.profileImage || notif.avatar || '', sender: notif.sender || '',
        notificationKind: notif.notificationKind || '', callKind: notif.callKind || '',
        title: notif.title || notif.app || 'Notification', body: notif.body || '',
        targetUrl: notif.targetUrl || '', timestamp: Date.now(), isRead: false,
      }, ...items.filter((item) => item.id !== notifId)].slice(0, 100));
      playNotifSound(
        islandSettings.notifSound || 'Ding',
        islandSettings.soundEffects !== false
      );
      setRoboMood('surprised');
      setTimeout(() => setRoboMood('normal'), 2600);

      const stayMs = Math.max(3000, (Number(islandSettings.notifDurationSec) || 5) * 1000);
      isShowingNotifToastRef.current = true;
      setIslandMode((curr) => {
        const prevMode = curr === 'notif-toast' ? resolvedCollapsedModeRef.current : curr;
        if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
        notifTimerRef.current = setTimeout(() => {
          isShowingNotifToastRef.current = false;
          setIslandMode(prevMode);
        }, stayMs);
        return 'notif-toast';
      });
    });

    return () => {
      if (unsubSettings) unsubSettings();
      if (unsubEmotion) unsubEmotion();
      if (unsubAiHist) unsubAiHist();
      if (unsubHover) unsubHover();
      if (unsubMedia) unsubMedia();
      if (unsubClip) unsubClip();
      if (unsubAgent) unsubAgent();
      if (unsubHud) unsubHud();
      if (unsubWinNotif) unsubWinNotif();
      if (unsubGoogle) unsubGoogle();
    };
  }, [
    selectedAiProvider,
    pendingApproval,
    resolvedCollapsedMode,
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

  const formatDateTop = (d) => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
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
      playRoboSound('happy', islandSettings.soundEffects !== false);
      setJobsToday((j) => j + 1);
      setRoboReply(res?.text || 'Cevap hazırlandı.');
      setRoboReplyProvider(res?.provider || selectedAiProvider);
      setRoboQuestion('');
    } catch (err) {
      setRoboLoading(false);
      setRoboMood('sad');
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
    { id: 'code', label: 'AGENTS', icon: Terminal, badge: pendingApproval ? '!' : null },
    { id: 'music', label: 'MUSIC', icon: Music },
    // { id: 'robo', label: 'ROBO', icon: RoboDockIcon },
    { id: 'timer', label: 'FOCUS', icon: Timer },
    { id: 'sleep', label: 'MODES', icon: Moon },
    { id: 'clips', label: 'CLIPS', icon: Copy },
    { id: 'notes', label: 'NOTE', icon: FileText },
    { id: 'cal', label: 'AGENDA', icon: Calendar },
    // { id: 'inbox', label: 'MAIL', icon: Mail },
  ];

  const activeRecentJobs = useMemo(() => {
    if (selectedAiProvider === 'Claude' && claudeHistory.length > 0) {
      return claudeHistory;
    }
    if (selectedAiProvider === 'Gemini' && geminiHistory.length > 0) {
      return geminiHistory;
    }
    if (selectedAiProvider === 'Antigravity' && antigravityHistory.length > 0) {
      return antigravityHistory;
    }
    return codexHistory;
  }, [selectedAiProvider, claudeHistory, geminiHistory, antigravityHistory, codexHistory]);

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
    : activeTab === 'music' && currentMedia.hasSession && currentMedia.isPlaying
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
  const mailAccountLabel = googleData?.account || islandSettings.googleEmail || '';
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

  return (
    <div
      className="notch-stage"
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
        } ${musicAccent.hasColor ? 'has-cover-color' : ''}`}
        style={{
          '--music-accent-rgb': musicAccent.rgb,
          '--music-accent-hex': musicAccent.hex,
          '--notif-accent-rgb': notifBrand.rgb,
          '--notif-accent-hex': notifBrand.hex,
          '--robo-eye-color': islandSettings.eyeColorHex || '#ffffff',
          '--dynamic-music-w': `${dynamicMusicBarWidth}px`,
        }}
        onMouseEnter={() => {
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
            <RoboEyes mood={topEyeMood} size="normal" batteryPercent={batteryPercent} />
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
            COLLAPSED LAYER 2: LOW BATTERY ALERT NOTCH
            ============================================================ */}
        <div className={`morph-layer layer-battery ${islandMode === 'battery' ? 'is-visible' : ''} ${batteryAlertKind === 'charging' ? 'is-charging' : ''}`}>
          <div className="battery-alert-icon">
            <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
              <rect x="1" y="1" width="19" height="12" rx="3" stroke="#ffffff" strokeWidth="1.8" />
              {batteryAlertKind === 'charging' ? (
                <path d="M12.7 2.8 8.2 7.5h3l-.5 3.7 4.6-5h-3l.4-3.4Z" fill="#ffffff" />
              ) : (
                <rect x="4" y="4" width="2.5" height="6" rx="1" fill="#ffffff" />
              )}
              <path d="M22 4.5V9.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="battery-alert-text">
            <strong>{batteryAlertKind === 'charging' ? `Charging · ${batteryPercent}%` : `Only ${batteryPercent}% battery left`}</strong>
            <span>{batteryAlertKind === 'charging' ? 'Power connected' : 'Plug in your charger!'}</span>
          </div>
        </div>

        {/* ============================================================
            COLLAPSED LAYER 2B: SYSTEM VOLUME / BRIGHTNESS HUD NOTCH
            ============================================================ */}
        <div className={`morph-layer layer-hud ${islandMode === 'hud' ? 'is-visible' : ''}`}>
          <div className="hud-notch-icon">
            {hudOverlay.type === 'brightness' ? (
              <Sun size={17} strokeWidth={2.2} />
            ) : hudOverlay.muted || hudOverlay.value === 0 ? (
              <VolumeX size={17} strokeWidth={2.2} />
            ) : (
              <Volume2 size={17} strokeWidth={2.2} />
            )}
          </div>
          <div className="hud-notch-track">
            <div
              className={`hud-notch-fill ${hudOverlay.type === 'brightness' ? 'is-brightness' : ''}`}
              style={{
                width: `${hudOverlay.muted ? 0 : Math.min(100, Math.max(0, hudOverlay.value))}%`,
              }}
            />
          </div>
          <span className="hud-notch-val">
            {hudOverlay.muted ? 'Mute' : `${Math.round(hudOverlay.value)}%`}
          </span>
        </div>

        {/* ============================================================
            COLLAPSED LAYER 2C: WINDOWS SYSTEM NOTIFICATION BANNER NOTCH
            Renders the app's own logo & brand/dominant ambient color
            ============================================================ */}
        <div
          className={`morph-layer layer-notif-toast ${islandMode === 'notif-toast' ? 'is-visible' : ''} ${notifPresentation.kind === 'audio' || notifPresentation.kind === 'video' ? 'is-call-notification' : ''}`}
          role="button"
          tabIndex={0}
          title="Uygulamayı aç"
          onClick={() => openNotification(toastBanner)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openNotification(toastBanner); }}
        >
          <NotificationAvatar banner={toastBanner} brand={notifBrand.brand} presentation={notifPresentation} />
          <div className="notif-toast-content">
            <small className="notif-toast-app-name">{notifPresentation.app}</small>
            <strong>{notifPresentation.title}</strong>
            <span>{notifPresentation.subtitle || notifPresentation.app}</span>
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
          {/* Full-bleed left album art with dynamic cover color glow when on MUSIC tab */}
          {activeTab === 'music' && !islandOverlay && currentMedia.thumbnail && (
            <div className="music-fullbleed-art">
              <img src={currentMedia.thumbnail} alt="" />
              <div className="music-fullbleed-gradient" />
            </div>
          )}

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
                  <span className="topbar-date">{formatDateTop(now)}</span>
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
              {(islandOverlay ||
                (activeTab !== 'code' && activeTab !== 'robo')) && (
                <RoboEyes
                  mood={topEyeMood}
                  batteryPercent={batteryPercent}
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
              <section ref={notificationHistoryPanelRef} id="notification-history-panel" className="notification-history-panel" aria-label="Bildirim geçmişi" onClick={(event) => event.stopPropagation()}>
                <header className="notification-history-header">
                  <div className="notification-history-heading">
                    <span className="notification-history-icon"><Bell size={15} /></span>
                    <div><strong>Bildirim geçmişi</strong><span>{notificationHistory.length} kayıt</span></div>
                  </div>
                  <div className="notification-history-actions">
                    <button className="notification-history-clear" type="button" onClick={() => setNotificationHistory([])} disabled={!notificationHistory.length}>Tümünü sil</button>
                    <button className="notification-history-close" type="button" aria-label="Kapat" title="Kapat" onClick={() => setNotificationHistoryOpen(false)}><X size={16} /></button>
                  </div>
                </header>
                <div className="notification-history-list">
                  {notificationHistory.length ? notificationHistory.map((item) => (
                    <div className="notification-history-item" key={item.id}>
                      <button type="button" className="notification-history-open" onClick={() => openNotification(item)} aria-label={`${item.app || 'Uygulama'} bildirimini aç`}>
                        <NotificationAvatar banner={item} brand={resolveNotifBrand(item).brand} presentation={resolveNotificationPresentation(item)} />
                        <span className="notification-history-copy"><strong>{item.title || item.app}</strong><span>{item.body || item.app}</span><small>{item.app} · {new Date(item.timestamp).toLocaleString('tr-TR')}</small></span>
                      </button>
                      <button type="button" className="notification-history-delete" aria-label="Bildirimi sil" title="Bildirimi sil" onClick={() => setNotificationHistory((items) => items.filter((entry) => entry.id !== item.id))}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )) : (
                    <div className="notification-history-empty">
                      <span className="notification-empty-icon"><Bell size={19} /></span>
                      <strong>Şimdilik sessiz</strong>
                      <span>Yeni bildirimlerin burada görünecek.</span>
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
                      window.twocode?.openExternal(sc.url);
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
                            <strong>25:00</strong>
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
                          <span>{formatDateTop(now)}</span>
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
                                  <strong>25:00</strong>
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
                              <strong>25:00</strong>
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
                            onClick={() =>
                              playRoboSound('happy', islandSettings.soundEffects !== false)
                            }
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
                            <h3 className="codex-title" title="Kod ajanlarının görev geçmişi">
                              AI ACTIVITY
                            </h3>
                            {pendingApproval && (
                              <div className="approval-inline-btns">
                                <button
                                  type="button"
                                  className="btn-allow-sm"
                                  onClick={() => handleApprovalDecision(true)}
                                >
                                  Allow
                                </button>
                                <button
                                  type="button"
                                  className="btn-deny-sm"
                                  onClick={() => handleApprovalDecision(false)}
                                >
                                  Deny
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="codex-recently-card">
                            <span className="recently-heading">RECENTLY</span>
                            <div className="recently-list">
                              {activeRecentJobs.length === 0 ? (
                                <div className="recently-row">
                                  <span className="recently-prompt-text" style={{ opacity: 0.5 }}>
                                    No tasks yet · Connect in Settings
                                  </span>
                                </div>
                              ) : (
                                activeRecentJobs.slice(0, 3).map((job) => (
                                  <div key={job.id} className="recently-row">
                                    <span className="recently-check-circle">
                                      <Check size={11} strokeWidth={3.2} color="#000000" />
                                    </span>
                                    <span className="recently-prompt-text">{job.title}</span>
                                    <span className="recently-time">{job.time}</span>
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
                        <div className="music-spacer-left">
                          {!currentMedia.thumbnail && (
                            <div className="music-no-cover-box">
                              <Music size={34} />
                            </div>
                          )}
                        </div>
                        <div className="music-right-panel">
                          <div className="music-track-header">
                            <span className="music-track-title">{currentMedia.title}</span>
                            {currentMedia.artist && (
                              <>
                                <span className="music-track-dot"> · </span>
                                <span className="music-track-artist">{currentMedia.artist}</span>
                              </>
                            )}
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
                              {formatMMSS(currentMedia.position)}
                            </span>
                            <div className="music-scrubber-track">
                              <div
                                className="music-scrubber-fill"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="music-time-label">-{formatMMSS(remainingSec)}</span>
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
                                >
                                  <SkipBack size={18} fill="#ffffff" />
                                </button>
                                <button
                                  type="button"
                                  className="transport-play-circle"
                                  onClick={handlePlayPause}
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
                          <aside className="robo-model-sidebar" aria-label="AI modelleri">
                            <div className="robo-model-sidebar-title">
                              <strong>Modeller</strong>
                              <span>Yanıt sağlayıcısı</span>
                            </div>
                            {[
                              { name: 'Claude', brand: 'Anthropic', accent: '#d97757' },
                              { name: 'Codex', brand: 'OpenAI', accent: '#b8c5d2' },
                              { name: 'Gemini', brand: 'Google', accent: '#9a8cff' },
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
                                <span className="robo-model-name"><strong>{model.name}</strong><small>{model.brand}</small></span>
                                {selectedAiProvider === model.name && <i className="robo-model-selected-dot" />}
                              </button>
                            ))}
                          </aside>

                          <div className="robo-chat-main">
                            <header className="robo-chat-header">
                              <div><strong>{roboReply ? 'Yanıtın' : 'Robo’ya sor'}</strong><span>{roboLoading ? 'Yanıt hazırlanıyor…' : roboReply ? 'Cevap sağ panelde hazır' : 'Sorunu yaz, cevabın burada görünsün'}</span></div>
                              <span className="robo-current-provider" style={{ '--provider-accent': (roboReply && roboReplyProvider ? roboReplyProvider : selectedAiProvider) === 'Claude' ? '#d97757' : (roboReply && roboReplyProvider ? roboReplyProvider : selectedAiProvider) === 'Gemini' ? '#9a8cff' : '#b8c5d2' }}>
                                <AiProviderLogo provider={roboReply && roboReplyProvider ? roboReplyProvider : selectedAiProvider} size={15} />
                                {roboReply && roboReplyProvider ? roboReplyProvider : selectedAiProvider}
                              </span>
                            </header>

                            <section className={`robo-answer-card ${roboLoading ? 'is-loading' : ''}`} aria-live="polite" aria-busy={roboLoading}>
                              {roboReply ? (
                                <>
                                  <div className="robo-answer-header">
                                    <div className="robo-answer-provider">
                                      <AiProviderLogo provider={roboReplyProvider || selectedAiProvider} size={16} />
                                      <span>{roboReplyProvider || selectedAiProvider} yanıtı</span>
                                    </div>
                                    <div className="robo-answer-actions">
                                      <button type="button" className="robo-ans-btn" onClick={() => { window.twocode?.copyText(roboReply); playRoboSound('tap', islandSettings.soundEffects !== false); }} title="Cevabı kopyala">
                                        <Copy size={13} /><span>Kopyala</span>
                                      </button>
                                      <button type="button" className="robo-ans-btn close" onClick={() => setRoboReply(null)} title="Cevabı kapat" aria-label="Cevabı kapat"><X size={14} /></button>
                                    </div>
                                  </div>
                                  <div className="robo-answer-body">{roboReply}</div>
                                </>
                              ) : roboLoading ? (
                                <div className="robo-answer-empty is-thinking"><span className="robo-answer-empty-icon"><Bot size={18} /></span><strong>Robo düşünüyor…</strong><span>Yanıt hazır olunca burada görünecek.</span></div>
                              ) : (
                                <div className="robo-answer-empty"><span className="robo-answer-empty-icon"><Bot size={18} /></span><strong>Yanıt alanı</strong><span>Bir soru gönderdiğinde cevabın burada açılacak.</span></div>
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
                              fontIndex={3}
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
                            <span className="note-character-count">{notesText.length} karakter</span>
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
                      <div className="agenda-tab-view">
                        <div className="agenda-top-row">
                          <div className="agenda-title-group">
                            <span className="agenda-eyebrow">TODAY</span>
                            {addingAgenda ? (
                              <input
                                type="text"
                                className="agenda-inline-input"
                                placeholder="Add event title & press Enter..."
                                autoFocus
                                value={newAgendaTitle}
                                onChange={(e) => setNewAgendaTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newAgendaTitle.trim()) {
                                    const title = newAgendaTitle.trim();
                                    setAgendaItems((prev) => [...prev, title]);
                                    setNewAgendaTitle('');
                                    setAddingAgenda(false);
                                    const now = new Date();
                                    const eventTime = formatTimeHHMM(new Date(now.getTime() + 15 * 60 * 1000));
                                    window.twocode?.addAgendaEvent?.({
                                      title,
                                      date: 'Bugün',
                                      time: eventTime,
                                    });
                                  } else if (e.key === 'Escape') {
                                    setAddingAgenda(false);
                                  }
                                }}
                              />
                            ) : (
                              <h2 className="agenda-main-heading">
                                {agendaItems.length > 0
                                  ? agendaItems[agendaItems.length - 1]
                                  : 'Nothing planned'}
                              </h2>
                            )}
                          </div>

                          <div className="agenda-controls-right">
                            <div className="agenda-day-month-pill">
                              <button
                                type="button"
                                className={`dm-btn ${agendaViewMode === 'Day' ? 'active' : ''}`}
                                onClick={() => setAgendaViewMode('Day')}
                              >
                                Day
                              </button>
                              <button
                                type="button"
                                className={`dm-btn ${agendaViewMode === 'Month' ? 'active' : ''}`}
                                onClick={() => setAgendaViewMode('Month')}
                              >
                                Month
                              </button>
                            </div>

                            <button
                              type="button"
                              className="agenda-plus-circle"
                              onClick={() => setAddingAgenda((a) => !a)}
                              title="Add event"
                            >
                              <Plus size={16} strokeWidth={2.5} color="#000000" />
                            </button>
                          </div>
                        </div>

                        <div className="agenda-timeline-wrap">
                          <div className="agenda-ticks-row">
                            {Array.from({ length: 13 }, (_, i) => (
                              <span key={i} className="agenda-tick" />
                            ))}
                          </div>
                          <div className="agenda-hours-row">
                            <span>08:00</span>
                            <span>12:00</span>
                            <span>16:00</span>
                            <span>20:00</span>
                          </div>
                        </div>

                        {(islandSettings.googleConnected || googleData?.connected) && (islandSettings.googleEmail || googleData?.account) && (
                          <div className="agenda-footer-email">{islandSettings.googleEmail || googleData?.account}</div>
                        )}
                      </div>
                    )}

                    {/* ============================================================
                        11. MAIL TAB
                        ============================================================ */}
                    {activeTab === 'inbox' && (
                      <div className="mail-workspace">
                        <aside className="mail-sidebar" aria-label="Posta klasörleri">
                          <div className="mail-sidebar-heading"><span>MAILBOX</span><strong>Posta kutusu</strong></div>
                          <nav className="mail-folder-list">
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
                          <div className={`mail-connection-state ${mailIsConnected ? 'connected' : ''}`}><i />{mailIsConnected ? 'Gmail bağlı' : 'Gmail bağlı değil'}</div>
                          {mailAccountLabel && <span className="mail-account-label" title={mailAccountLabel}>{mailAccountLabel}</span>}
                        </aside>

                        <section className="mail-main-panel">
                          <header className="mail-main-header">
                            <div className="mail-title-block">
                              <div className="mail-title-icon"><CurrentMailFolderIcon size={17} /></div>
                              <div><h2>{currentMailFolder.label}</h2><span>{mailCounts[currentMailFolder.countKey] || 0} okunmamış ileti</span></div>
                            </div>
                            <div className="mail-header-actions">
                              <button type="button" className="mail-open-gmail" onClick={() => window.twocode?.openExternal(currentMailFolder.url)}><ExternalLink size={13} /><span>Gmail’i aç</span></button>
                              <button type="button" className="mail-compose-btn" title="Yeni e-posta" aria-label="Yeni e-posta yaz" onClick={() => window.twocode?.openExternal('https://mail.google.com/mail/u/0/#compose')}><Plus size={16} /><span>Yaz</span></button>
                            </div>
                          </header>

                          <div className="mail-list-heading"><span>{mailCategory === 'primary' ? 'Son iletiler' : `${currentMailFolder.label} iletileri`}</span><span>{visibleMailItems.length} ileti</span></div>
                          <div className="mail-message-list">
                            {visibleMailItems.length > 0 ? visibleMailItems.map((item, index) => {
                              const sender = item.from || item.sender || 'Gönderen bilinmiyor';
                              const mailId = String(item.id || '');
                              const hasThreadId = Boolean(mailId && !/^(m_|mail_count_bump|row_)/i.test(mailId));
                              const messageUrl = hasThreadId ? `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(mailId)}` : currentMailFolder.url;
                              return (
                                <button key={mailId || `${sender}-${item.subject}-${index}`} type="button" className="mail-message-row" onClick={() => window.twocode?.openExternal(messageUrl)}>
                                  <span className="mail-sender-avatar">
                                    {(item.senderPhoto || item.profileImage) ? <img src={item.senderPhoto || item.profileImage} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : sender.trim().charAt(0).toLocaleUpperCase('tr-TR')}
                                  </span>
                                  <span className="mail-message-copy"><strong>{sender}</strong><span>{item.subject || 'Konu yok'}</span><small>{item.snippet || 'İçeriği Gmail’de görüntüle'}</small></span>
                                  <span className="mail-message-meta"><time>{item.time || 'Bugün'}</time><ExternalLink size={12} /></span>
                                </button>
                              );
                            }) : (
                              <div className="mail-empty-state">
                                <span className="mail-empty-icon"><CurrentMailFolderIcon size={18} /></span>
                                <strong>{!mailIsConnected ? 'Gmail bağlantısı gerekli' : mailCategory !== 'primary' ? 'Kategori iletileri Gmail’de' : 'Gelen kutusu sakin'}</strong>
                                <span>{!mailIsConnected ? 'Gmail’i bağlayınca son iletiler burada görünür.' : mailCategory !== 'primary' ? 'Bu kategori için Gmail’deki ileti listesine geçebilirsiniz.' : 'Yeni iletiler geldiğinde bu listede görünecek.'}</span>
                                {!mailIsConnected ? <button type="button" onClick={() => window.twocode?.openSettingsWindow?.('connections')}>Gmail’i bağla</button> : mailCategory !== 'primary' ? <button type="button" onClick={() => window.twocode?.openExternal(currentMailFolder.url)}>Gmail’de görüntüle <ExternalLink size={12} /></button> : null}
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
                      onClick={() => window.twocode?.openExternal(sc.url)}
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
    </div>
  );
}
