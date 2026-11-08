import React, { useState, useEffect, useMemo } from 'react';
import RealAppIcon from './RealAppIcon';
import {
  Home,
  Plug,
  MessageSquare,
  LayoutGrid,
  Bot,
  Shirt,
  User,
  SlidersHorizontal,
  Bell,
  PanelTop,
  Shield,
  Newspaper,
  Heart,
  Sun,
  Check,
  Calendar,
  Flame,
  ChevronRight,
  Hand,
  ExternalLink,
  Play,
  Search,
  Sparkles,
  Ban,
  Crown,
  Lock,
  Download,
  Copy,
  Minus,
  Square,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import './settings.css';
import { playRoboSound, playNotifSound } from './sounds';

const DEFAULT_SETTINGS = {
  userName: 'Bedirhan',
  googleEmail: '',
  googleConnected: false,
  calEnabled: false,
  newMailEnabled: false,
  mailFileEnabled: false,
  claudeEnabled: true,
  codexEnabled: true,
  claudeApiKey: '',
  codexApiKey: '',
  geminiApiKey: '',
  antigravityApiKey: '',
  apps: [],
  roboBuddy: true,
  roboName: 'Robo',
  eyePreset: 'Classic',
  workingEyeColor: '#f59e0b',
  doneEyeColor: '#22c55e',
  errorEyeColor: '#ef4444',
  facesEnabled: true,
  blinkingEnabled: true,
  dancingEnabled: true,
  sleepEffectEnabled: true,
  fallAsleepMinutes: 10,
  startupAnimEnabled: true,
  hungerEnabled: true,
  outfit: 'Best',
  bodyColor: 'Cloud',
  eyeColorName: 'White',
  eyeColorHex: '#ffffff',
  seasonalOutfits: true,
  language: 'English',
  windowsNotifications: true,
  doNotDisturb: false,
  notifShowWhere: 'In the island',
  notifSize: 'Big',
  notifDurationSec: 5,
  notifSound: 'Ding',
  notifColor: '#3b82f6',
  notifShowText: 'Show',
  notifDuringFocus: false,
  notifDuringGames: false,
  islandSize: 'Normal',
  islandStyle: 'Attached',
  islandSeeThrough: 0,
  islandMusicColour: true,
  islandOpenMode: 'On hover',
  leftOfRobo: 'Nothing',
  roboEyesVisible: true,
  rightOfRobo: 'Nothing',
  clockFormat: 'Automatic',
  lyricsEnabled: true,
  focusGuardEnabled: false,
  focusGuardApps: ['YouTube', 'TikTok', 'Instagram'],
  focusGuardCustom: '',
  focusGuardWaitSec: 5,
  focusGuardLeaveMin: 5,
};

const PAGE_HEADERS = {
  home: { title: 'Home', subtitle: '' },
  connections: { title: 'Connections', subtitle: 'Which AIs Robo keeps an eye on for you' },
  aichat: { title: 'AI & Chat', subtitle: "Which AI Robo's chat talks to" },
  apps: { title: 'Apps', subtitle: 'Pick which apps are in your TwoCode' },
  robo: { title: 'Robo', subtitle: 'His name, eyes, behaviour and badges', hasSearch: true },
  wardrobe: {
    title: 'Wardrobe',
    subtitle: 'Pick what Robo wears. He tries it on right away.',
  },
  account: { title: 'Account', subtitle: 'Your account and your TwoCode' },
  general: {
    title: 'General',
    subtitle: 'Language, behaviour and TwoCode itself',
    hasSearch: true,
  },
  notifications: { title: 'Notifications', subtitle: '' },
  island: {
    title: 'Island',
    subtitle: 'How the island looks and what it shows',
    hasSearch: true,
  },
  focusguard: {
    title: 'Focus guard',
    subtitle: 'Robo stops you for a moment when something distracts you',
    hasSearch: true,
  },
  news: { title: 'News', subtitle: 'What is new in TwoCode' },
  support: { title: 'Support TwoCode', subtitle: 'Help TwoCode grow' },
};

const NOTIFICATION_ITEMS = [
  { group: 'MAIL AND OTHER APPS', items: ['New mail', 'Mail sent', "Other apps' notifications"] },
  {
    group: 'CLAUDE AND AI',
    items: [
      'Claude asks for permission',
      'Claude has a question',
      'Claude is done',
      'Claude: error',
      'ChatGPT or Claude in your browser',
      'Claude limit almost full',
    ],
  },
  { group: 'FOCUS', items: ['Focus done', 'Back to work'] },
  {
    group: 'MUSIC AND SOUND',
    items: ['Next or previous song', 'Sound moved', "Can't jump in this song", 'Volume'],
  },
  {
    group: 'PHONE, CALENDAR, BATTERY',
    items: [
      'Received from your phone',
      'Calendar: in 10 minutes',
      'Calendar linked',
      'Battery low',
      'Headphones almost empty',
    ],
  },
];

// Crowned Robo SVG Avatar matching the screenshots
function RoboCrownAvatar({ outfit = 'Best', size = 64, eyeHex = '#ffffff' }) {
  return (
    <div className="robo-stage-avatar" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width="100%" height="100%">
        <defs>
          <linearGradient id="spotlightGrad" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        {/* Spotlight cone */}
        <polygon points="48,0 72,0 104,120 16,120" fill="url(#spotlightGrad)" />
        {/* Antenna */}
        <line x1="60" y1="22" x2="60" y2="48" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="60" cy="20" rx="4.5" ry="6.5" fill="#ffffff" />
        {/* Crown if Best or Crown */}
        {(outfit === 'Best' || outfit === 'Crown') && (
          <g>
            <polygon
              points="37,88 37,54 49,68 60,48 71,68 83,54 83,88"
              fill="url(#crownGrad)"
              stroke="#fbbf24"
              strokeWidth="1.5"
            />
            <ellipse cx="60" cy="73" rx="3.8" ry="5.5" fill="#ec4899" />
          </g>
        )}
        {/* Party Hat */}
        {outfit === 'Party hat' && (
          <polygon points="42,88 60,44 78,88" fill="#a855f7" stroke="#f472b6" strokeWidth="2" />
        )}
        {/* Robo White Head Dome */}
        <path
          d="M 28 118 C 32 88, 88 88, 92 118 Z"
          fill="#ffffff"
          style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.65))' }}
        />
        {/* Sunglasses */}
        {outfit === 'Sunglasses' && (
          <g>
            <rect x="38" y="96" width="18" height="10" rx="2" fill="#111" />
            <rect x="64" y="96" width="18" height="10" rx="2" fill="#111" />
            <line x1="56" y1="100" x2="64" y2="100" stroke="#111" strokeWidth="2.5" />
          </g>
        )}
      </svg>
    </div>
  );
}

export default function SettingsApp() {
  const [activePage, setActivePage] = useState('home');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [now, setNow] = useState(new Date());
  const [liveMedia, setLiveMedia] = useState({ hasSession: false });
  const [aiHistory, setAiHistory] = useState({
    codexJobs: [
      {
        id: 'c1',
        agent: 'Codex',
        title: 'ne kadar limitim kaldığını görebiliyor muyum',
        time: '02:49',
      },
      { id: 'c2', agent: 'Codex', title: 'naber', time: '02:48' },
    ],
    claudeJobs: [],
    jobsToday: 2,
  });

  // Inputs for Apps page
  const [newAppName, setNewAppName] = useState('');
  const [newAppUrl, setNewAppUrl] = useState('');
  const [activitySearch, setActivitySearch] = useState('');
  const [pageSearch, setPageSearch] = useState('');
  const [roboNameDraft, setRoboNameDraft] = useState('Robo');
  const [selectedNotifItem, setSelectedNotifItem] = useState('Claude is done');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPass, setAccountPass] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [showKeyClaude, setShowKeyClaude] = useState(false);
  const [showKeyCodex, setShowKeyCodex] = useState(false);
  const [showKeyGemini, setShowKeyGemini] = useState(false);
  const [showKeyAntigravity, setShowKeyAntigravity] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load & sync settings + AI history + live media with Electron main process
  useEffect(() => {
    if (!window.twocode) return;

    window.twocode.getSettings?.().then((saved) => {
      if (saved && typeof saved === 'object') {
        setSettings((prev) => ({ ...prev, ...saved }));
        if (saved.roboName) setRoboNameDraft(saved.roboName);
      }
    });

    const unsubSettings = window.twocode.onSettingsUpdated?.((updated) => {
      if (updated && typeof updated === 'object') {
        setSettings((prev) => ({ ...prev, ...updated }));
      }
    });

    const unsubNavigate = window.twocode.onNavigateSettingsTab?.((tabId) => {
      if (tabId && PAGE_HEADERS[tabId]) {
        setActivePage(tabId);
      }
    });

    window.twocode.getAiHistory?.().then((hist) => {
      if (hist) setAiHistory(hist);
    });

    const unsubAi = window.twocode.onAiHistoryUpdate?.((hist) => {
      if (hist) setAiHistory(hist);
    });

    window.twocode.getMediaStatus?.().then((m) => {
      if (m) setLiveMedia(m);
    });

    const unsubMedia = window.twocode.onMediaUpdate?.((m) => {
      if (m) setLiveMedia(m);
    });

    return () => {
      if (unsubSettings) unsubSettings();
      if (unsubNavigate) unsubNavigate();
      if (unsubAi) unsubAi();
      if (unsubMedia) unsubMedia();
    };
  }, []);

  const updateSetting = (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      window.twocode?.saveSettings?.(next);
      return next;
    });
  };

  const formatTimeHHMM = (d) => {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const formatDateTop = (d) => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];
    return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
  };

  const greetingTimeOfDay = useMemo(() => {
    const h = now.getHours();
    if (h < 6 || h >= 22) return 'Good night';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, [now]);

  const handleAddApp = async () => {
    const name = newAppName.trim();
    const url = newAppUrl.trim();
    if (!name || !url) return;
    const isLocal = /^[a-zA-Z]:\\/i.test(url) || /\.(exe|lnk)$/i.test(url);
    const formattedUrl =
      isLocal || /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const lower = name.toLowerCase();

    let type = 'app';
    let iconUrl = '';

    if (isLocal) {
      type = 'native-app';
      try {
        const nativeIco = await window.twocode?.getFileIcon?.(formattedUrl);
        if (nativeIco) iconUrl = nativeIco;
      } catch {}
    } else if (lower.includes('youtube') || formattedUrl.includes('youtube.com')) {
      type = 'youtube';
    } else if (lower.includes('gemini') || formattedUrl.includes('gemini.google')) {
      type = 'gemini';
    } else if (lower.includes('git') || formattedUrl.includes('github.com')) {
      type = 'github';
    } else if (lower.includes('spotify') || formattedUrl.includes('spotify.com')) {
      type = 'spotify';
    } else if (lower.includes('whatsapp') || formattedUrl.includes('whatsapp.com')) {
      type = 'whatsapp';
    } else if (lower.includes('google') || formattedUrl.includes('google.com')) {
      type = 'google';
    } else {
      type = 'custom';
      try {
        const domain = new URL(formattedUrl).hostname;
        iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      } catch {}
    }

    const nextApps = [
      ...(settings.apps || []),
      {
        id: 'app_' + Date.now(),
        name,
        url: formattedUrl,
        path: isLocal ? formattedUrl : '',
        type,
        iconUrl,
      },
    ].slice(0, 4);
    updateSetting({ apps: nextApps });
    setNewAppName('');
    setNewAppUrl('');
  };

  const handleChooseProgram = async () => {
    const pickedPath = await window.twocode?.pickProgramFile?.();
    if (pickedPath) {
      const base = pickedPath.split(/[/\\]/).pop().replace(/\.(exe|lnk)$/i, '');
      setNewAppName(base);
      setNewAppUrl(pickedPath);
      // Immediately extract icon and add
      try {
        const nativeIco = await window.twocode?.getFileIcon?.(pickedPath);
        const nextApps = [
          ...(settings.apps || []),
          {
            id: 'app_' + Date.now(),
            name: base,
            url: pickedPath,
            path: pickedPath,
            type: 'native-app',
            iconUrl: nativeIco || '',
          },
        ].slice(0, 4);
        updateSetting({ apps: nextApps });
        setNewAppName('');
        setNewAppUrl('');
      } catch {}
    }
  };

  const handleRemoveApp = (id) => {
    const nextApps = (settings.apps || []).filter((a) => a.id !== id);
    updateSetting({ apps: nextApps });
  };

  const triggerEmotionOnIsland = (emotion) => {
    playRoboSound(emotion, settings.soundEffects !== false);
    window.twocode?.triggerIslandEmotion?.(emotion);
  };

  const triggerTestNotificationOnIsland = () => {
    playNotifSound(settings.notifSound || 'Ding', settings.soundEffects !== false);
    window.twocode?.triggerTestNotification?.({
      title: 'Claude Code is done',
      subtitle: 'checkout: Fixed the checkout total',
      color: settings.notifColor,
    });
  };

  const headerInfo = PAGE_HEADERS[activePage] || PAGE_HEADERS.home;

  const filteredActivities = useMemo(() => {
    const all = [
      ...(aiHistory.antigravityJobs || []),
      ...(aiHistory.geminiJobs || []),
      ...(aiHistory.codexJobs || []),
      ...(aiHistory.claudeJobs || []),
    ];
    if (!activitySearch.trim()) return all;
    const q = activitySearch.toLowerCase();
    return all.filter((item) => (item.title || '').toLowerCase().includes(q));
  }, [aiHistory, activitySearch]);

  return (
    <div className="twocode-settings-window">
      {/* ============================================================
          LEFT SIDEBAR NAVIGATION
          ============================================================ */}
      <aside className="settings-sidebar">
        <div className="sidebar-brand-row">
          <div className="brand-logo-wrap">
            <div className="brand-robo-icon">
              <span />
              <span />
              <i className="brand-gear-badge">⚙</i>
            </div>
            <div className="brand-text-col">
              <strong>TwoCode</strong>
              <span>Settings</span>
            </div>
          </div>
          <span className="beta-pill">BETA</span>
        </div>

        <div className="sidebar-scroll-nav">
          <div className="nav-section-group">
            <span className="nav-section-label">TWOCODE</span>
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'connections', label: 'Connections', icon: Plug },
              { id: 'aichat', label: 'AI & Chat', icon: MessageSquare },
              { id: 'apps', label: 'Apps', icon: LayoutGrid },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-nav-btn ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => setActivePage(item.id)}
                >
                  <Icon size={16} strokeWidth={2} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="nav-section-group">
            <span className="nav-section-label">ROBO</span>
            {[
              { id: 'robo', label: 'Robo', icon: Bot },
              { id: 'wardrobe', label: 'Wardrobe', icon: Shirt },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-nav-btn ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => setActivePage(item.id)}
                >
                  <Icon size={16} strokeWidth={2} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="nav-section-group">
            <span className="nav-section-label">SETTINGS</span>
            {[
              { id: 'account', label: 'Account', icon: User },
              { id: 'general', label: 'General', icon: SlidersHorizontal },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'island', label: 'Island', icon: PanelTop },
              { id: 'focusguard', label: 'Focus guard', icon: Shield },
              { id: 'news', label: 'News', icon: Newspaper },
              { id: 'support', label: 'Support TwoCode', icon: Heart },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-nav-btn ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => setActivePage(item.id)}
                >
                  <Icon size={16} strokeWidth={2} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="sidebar-footer-robo" onClick={() => setActivePage('robo')}>
          <div className="mini-robo-crown-box">
            <RoboCrownAvatar outfit={settings.outfit} size={34} />
          </div>
          <div className="mini-robo-meta">
            <strong>{settings.roboName || 'Robo'}</strong>
            <span>{aiHistory.jobsToday || 2} tasks done</span>
          </div>
          <button
            type="button"
            className="sidebar-theme-btn"
            onClick={(e) => e.stopPropagation()}
            title="Theme"
          >
            <Sun size={15} />
          </button>
        </div>
      </aside>

      {/* ============================================================
          RIGHT MAIN AREA (HERO BANNER + SCROLLABLE PAGE CONTENT)
          ============================================================ */}
      <div className="settings-main-area">
        {/* TOP HERO BANNER WITH LIVE NOTCH PREVIEW & WINDOW CONTROLS */}
        <header
          className={`settings-hero-banner ${
            activePage === 'notifications' ? 'compact-banner' : ''
          }`}
        >
          {/* Draggable titlebar region */}
          <div className="settings-window-dragbar" />

          {/* Window Minimize / Maximize / Close controls */}
          <div className="settings-win-controls">
            <button
              type="button"
              onClick={() => window.twocode?.settingsWindowControl?.('minimize')}
              title="Küçült"
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              onClick={() => window.twocode?.settingsWindowControl?.('maximize')}
              title="Büyüt"
            >
              <Square size={12} />
            </button>
            <button
              type="button"
              className="close-btn"
              onClick={() => window.twocode?.settingsWindowControl?.('close')}
              title="Kapat"
            >
              <X size={15} />
            </button>
          </div>

          {/* Center Top Notch Preview inside the Hero Banner */}
          <div className="hero-notch-preview clock-notch-preview">
            {liveMedia && liveMedia.hasSession && liveMedia.isPlaying ? (
              <div className="hero-media-top-pill">
                {liveMedia.thumbnail && (
                  <img src={liveMedia.thumbnail} alt="" className="hero-preview-thumb" />
                )}
                <span className="hero-preview-song">{liveMedia.title}</span>
                <div className="hero-preview-eq">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            ) : (
              <div className="hero-notch-toprow">
                <span className="hero-notch-date">{formatDateTop(now)}</span>
                <div className="hero-notch-eyes">
                  <i style={{ background: settings.eyeColorHex || '#fff' }} />
                  <i style={{ background: settings.eyeColorHex || '#fff' }} />
                </div>
              </div>
            )}
            <div className="hero-notch-clock">{formatTimeHHMM(now)}</div>
          </div>

          {/* Page Title & Subtitle at Bottom of Banner */}
          <div className="hero-banner-bottom">
            <div className="hero-title-col">
              <h1>{headerInfo.title}</h1>
              {headerInfo.subtitle && <p>{headerInfo.subtitle}</p>}
            </div>

            {headerInfo.hasSearch && (
              <div className="hero-search-box">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search"
                  value={pageSearch}
                  onChange={(e) => setPageSearch(e.target.value)}
                />
              </div>
            )}
          </div>
        </header>

        {/* ============================================================
            PAGE 1: HOME
            ============================================================ */}
        {activePage === 'home' && (
          <div className="settings-page-body">
            <div className="home-greeting-bar">
              <div>
                <h2 className="greeting-heading">
                  {greetingTimeOfDay}, {settings.userName}
                </h2>
                <p className="greeting-sub">
                  Robo keeps an eye on your AI and tells you when it is done or has a question.
                </p>
              </div>
              <div className="greeting-ai-pills">
                <div className="ai-status-pill" onClick={() => setActivePage('connections')}>
                  <span className="ai-badge-icon claude">
                    <i />
                    <i />
                  </span>
                  <strong>Claude Code</strong>
                  <span>idle</span>
                </div>
                <div className="ai-status-pill" onClick={() => setActivePage('connections')}>
                  <span className="ai-badge-icon codex">
                    <i />
                    <i />
                  </span>
                  <strong>Codex</strong>
                  <span>idle</span>
                </div>
                <div className="ai-status-pill" onClick={() => setActivePage('connections')}>
                  <span className="ai-badge-icon gemini">
                    <i />
                    <i />
                  </span>
                  <strong>Gemini</strong>
                  <span>active</span>
                </div>
                <div className="ai-status-pill" onClick={() => setActivePage('connections')}>
                  <span className="ai-badge-icon antigravity">
                    <i />
                    <i />
                  </span>
                  <strong>Antigravity</strong>
                  <span>active</span>
                </div>
              </div>
            </div>

            <div className="home-stats-grid">
              <div className="stat-box-card">
                <div className="stat-icon-sq green">
                  <Check size={16} strokeWidth={2.5} />
                </div>
                <div className="stat-meta">
                  <strong>{aiHistory.jobsToday || 0}</strong>
                  <span>tasks done</span>
                </div>
              </div>

              <div className="stat-box-card">
                <div className="stat-icon-sq blue">
                  <Calendar size={16} />
                </div>
                <div className="stat-meta">
                  <strong>{aiHistory.jobsToday || 0}</strong>
                  <span>today</span>
                </div>
              </div>

              <div className="stat-box-card">
                <div className="stat-icon-sq amber">
                  <Flame size={16} />
                </div>
                <div className="stat-meta">
                  <strong>1</strong>
                  <span>days in a row</span>
                </div>
              </div>
            </div>

            <div className="home-two-col">
              <div className="home-activity-col">
                <div className="activity-header-row">
                  <h3>Activity</h3>
                  <input
                    type="text"
                    className="activity-search-input"
                    placeholder="Search your activity"
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                  />
                </div>

                <div className="settings-card activity-list-card">
                  <span className="activity-day-label">Today</span>
                  <div className="activity-items-wrap">
                    {filteredActivities.slice(0, 8).map((job, idx) => {
                      const agent = (job.agent || '').toLowerCase();
                      const badgeClass = agent.includes('claude')
                        ? 'claude'
                        : agent.includes('gemini')
                        ? 'gemini'
                        : agent.includes('antigravity')
                        ? 'antigravity'
                        : 'codex';
                      const agentLabel = job.agent || (badgeClass === 'claude' ? 'Claude Code' : badgeClass === 'gemini' ? 'Gemini CLI' : badgeClass === 'antigravity' ? 'Antigravity' : 'Codex');
                      return (
                        <div key={job.id || idx} className="activity-item-row">
                          <span className={`ai-badge-icon ${badgeClass}`}>
                            <i />
                            <i />
                          </span>
                          <div className="activity-item-center">
                            <strong>{job.title}</strong>
                            <span>
                              {job.time} · {agentLabel} · {idx === 0 ? '2 s' : '1 s'}
                            </span>
                          </div>
                          <span className="activity-done-tag">Done</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="home-side-col">
                <div className="settings-card quick-links-card">
                  <button
                    type="button"
                    className="quick-link-row"
                    onClick={() => setActivePage('wardrobe')}
                  >
                    <div className="ql-left">
                      <span className="ql-icon pink">
                        <Shirt size={15} />
                      </span>
                      <strong>Wardrobe</strong>
                    </div>
                    <ChevronRight size={15} />
                  </button>

                  <button
                    type="button"
                    className="quick-link-row"
                    onClick={() => setActivePage('connections')}
                  >
                    <div className="ql-left">
                      <span className="ql-icon green">
                        <Plug size={15} />
                      </span>
                      <strong>Connections</strong>
                    </div>
                    <ChevronRight size={15} />
                  </button>

                  <button
                    type="button"
                    className="quick-link-row"
                    onClick={() => setActivePage('general')}
                  >
                    <div className="ql-left">
                      <span className="ql-icon blue">
                        <SlidersHorizontal size={15} />
                      </span>
                      <strong>General</strong>
                    </div>
                    <ChevronRight size={15} />
                  </button>
                </div>

                <div className="settings-card tip-card">
                  <div className="tip-header">
                    <Hand size={15} />
                    <strong>Tip: Robo Buddy</strong>
                  </div>
                  <p>
                    Drag Robo out of the island onto anything on your screen and ask what it says.
                    Or let him check your spelling in Word.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            PAGE 2: CONNECTIONS
            ============================================================ */}
        {activePage === 'connections' && (
          <div className="settings-page-body">
            <p className="page-lead-text">
              Turn on what you use. TwoCode does the rest: no windows to pick, no code.
            </p>

            <span className="section-eyebrow">LINKED</span>
            <div className="settings-card">
              <div className="settings-row">
                <div className="row-left-with-icon">
                  <span className="google-g-circle">
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  </span>
                  <div className="row-text-col">
                    <strong>
                      {settings.googleConnected ? settings.googleEmail : 'Google'}
                    </strong>
                    <span>
                      {settings.googleConnected ? 'Google account · Connected' : 'Calendar and Gmail'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="dark-pill-btn"
                  disabled={isConnectingGoogle}
                  onClick={async () => {
                    if (settings.googleConnected) {
                      await window.twocode?.disconnectGoogle?.();
                      updateSetting({ googleConnected: false, googleEmail: '' });
                    } else {
                      setIsConnectingGoogle(true);
                      try {
                        const res = await window.twocode?.connectGoogle?.();
                        if (res?.connected && res?.account) {
                          updateSetting({ googleConnected: true, googleEmail: res.account });
                        }
                      } catch (err) {
                        console.error('Google connect error:', err);
                      } finally {
                        setIsConnectingGoogle(false);
                      }
                    }
                  }}
                >
                  {settings.googleConnected
                    ? 'Disconnect'
                    : isConnectingGoogle
                    ? 'Connecting...'
                    : 'Connect'}
                </button>
              </div>

              {!settings.googleConnected && (
                <div className="settings-row google-link-input-row" style={{ paddingTop: 0, paddingBottom: 14 }}>
                  <input
                    type="email"
                    className="settings-input full google-email-field"
                    placeholder="example@gmail.com"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && accountEmail.trim()) {
                        setIsConnectingGoogle(true);
                        try {
                          const res = await window.twocode?.connectGoogle?.({ email: accountEmail.trim() });
                          if (res?.connected && res?.account) {
                            updateSetting({ googleConnected: true, googleEmail: res.account });
                            setAccountEmail('');
                          }
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsConnectingGoogle(false);
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="link-account-blue-btn"
                    disabled={isConnectingGoogle || !accountEmail.trim()}
                    onClick={async () => {
                      if (!accountEmail.trim()) return;
                      setIsConnectingGoogle(true);
                      try {
                        const res = await window.twocode?.connectGoogle?.({ email: accountEmail.trim() });
                        if (res?.connected && res?.account) {
                          updateSetting({ googleConnected: true, googleEmail: res.account });
                          setAccountEmail('');
                        }
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsConnectingGoogle(false);
                      }
                    }}
                  >
                    {isConnectingGoogle ? 'Linking...' : 'Link account'}
                  </button>
                </div>
              )}

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Calendar</strong>
                  <span>See and add events</span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.calEnabled ? 'on' : ''}`}
                  onClick={() => updateSetting({ calEnabled: !settings.calEnabled })}
                >
                  <i />
                </button>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>New mail</strong>
                  <span>Only how many. Not who, and not what</span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.newMailEnabled ? 'on' : ''}`}
                  onClick={() => updateSetting({ newMailEnabled: !settings.newMailEnabled })}
                >
                  <i />
                </button>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Mail a file</strong>
                  <span>Only when you press Send</span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.mailFileEnabled ? 'on' : ''}`}
                  onClick={() => updateSetting({ mailFileEnabled: !settings.mailFileEnabled })}
                >
                  <i />
                </button>
              </div>

              <div className="settings-row" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                <div className="row-text-col">
                  <strong>Notification Test</strong>
                  <span>Çentikte Mail ve Takvim bildirimini anında test edin</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="dark-pill-btn"
                    onClick={() => window.twocode?.testMailNotif?.()}
                    title="Çentikte canlı Mail bildirimi göster"
                  >
                    Test Mail
                  </button>
                  <button
                    type="button"
                    className="dark-pill-btn"
                    onClick={() => window.twocode?.testAgendaNotif?.()}
                    title="Çentikte canlı Ajanda bildirimi göster"
                  >
                    Test Ajanda
                  </button>
                </div>
              </div>
            </div>

            <span className="section-eyebrow" style={{ marginTop: 22 }}>
              CODING AI
            </span>
            <div className="settings-card">
              {/* 1. Claude Code */}
              <div className="settings-row align-top">
                <div className="row-left-with-icon align-top" style={{ flex: 1 }}>
                  <span className="ai-badge-icon lg claude">
                    <i />
                    <i />
                  </span>
                  <div className="row-text-col" style={{ width: '100%' }}>
                    <strong>Claude Code</strong>
                    <span>
                      Follows Claude Code in the terminal, in VS Code and in the Code tab of the
                      Claude app. The API key below is for Robo chat; it is not needed for monitoring.
                    </span>
                    <em className="amber-notice-text">
                      No task has come in yet. Close Claude Code and open it again (a new chat),
                      then give it a task. An old version? Update it with: claude update
                    </em>

                    <div className="ai-api-key-box">
                      <button
                        type="button"
                        className="ai-get-key-btn"
                        onClick={() =>
                          window.twocode?.openExternal?.('https://console.anthropic.com/settings/keys')
                        }
                        title="Anthropic Console'a git ve API anahtarı oluştur"
                      >
                        <ExternalLink size={12} />
                        <span>Get API Key</span>
                      </button>
                      <div className="ai-api-key-input-wrap">
                        <input
                          type={showKeyClaude ? 'text' : 'password'}
                          className="ai-api-key-input"
                          placeholder="sk-ant-api03-..."
                          value={settings.claudeApiKey || ''}
                          onChange={(e) => updateSetting({ claudeApiKey: e.target.value.trim() })}
                        />
                        <button
                          type="button"
                          className="ai-api-key-eye-btn"
                          onClick={() => setShowKeyClaude(!showKeyClaude)}
                          title={showKeyClaude ? 'Gizle' : 'Göster'}
                        >
                          {showKeyClaude ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                      {settings.claudeApiKey ? (
                        <span className="key-saved-pill">✓ Saved</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="row-right-group">
                  <span
                    className={`status-badge ${settings.claudeApiKey ? 'green' : 'amber'}`}
                  >
                      {settings.claudeApiKey ? 'API key saved' : 'Waiting for key'}
                  </span>
                  <button
                    type="button"
                    className={`settings-switch ${settings.claudeEnabled ? 'on' : ''}`}
                    onClick={() => updateSetting({ claudeEnabled: !settings.claudeEnabled })}
                  >
                    <i />
                  </button>
                </div>
              </div>

              {/* 2. Codex */}
              <div className="settings-row align-top">
                <div className="row-left-with-icon align-top" style={{ flex: 1 }}>
                  <span className="ai-badge-icon lg codex">
                    <i />
                    <i />
                  </span>
                  <div className="row-text-col" style={{ width: '100%' }}>
                    <strong>Codex</strong>
                    <span>
                      Follows OpenAI Codex (the app, the terminal or VS Code) while it codes for
                      you. The API key below is for Robo chat; Codex sign-in does not provide API access.
                    </span>

                    <div className="ai-api-key-box">
                      <button
                        type="button"
                        className="ai-get-key-btn"
                        onClick={() =>
                          window.twocode?.openExternal?.('https://platform.openai.com/api-keys')
                        }
                        title="OpenAI Platform'a git ve API anahtarı oluştur"
                      >
                        <ExternalLink size={12} />
                        <span>Get API Key</span>
                      </button>
                      <div className="ai-api-key-input-wrap">
                        <input
                          type={showKeyCodex ? 'text' : 'password'}
                          className="ai-api-key-input"
                          placeholder="sk-proj-..."
                          value={settings.codexApiKey || ''}
                          onChange={(e) => updateSetting({ codexApiKey: e.target.value.trim() })}
                        />
                        <button
                          type="button"
                          className="ai-api-key-eye-btn"
                          onClick={() => setShowKeyCodex(!showKeyCodex)}
                          title={showKeyCodex ? 'Gizle' : 'Göster'}
                        >
                          {showKeyCodex ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                      {settings.codexApiKey ? (
                        <span className="key-saved-pill">✓ Saved</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="row-right-group">
                  <span
                    className={`status-badge ${settings.codexApiKey ? 'green' : 'amber'}`}
                  >
                      {settings.codexApiKey ? 'API key saved' : 'Waiting for key'}
                  </span>
                  <button
                    type="button"
                    className={`settings-switch ${settings.codexEnabled ? 'on' : ''}`}
                    onClick={() => updateSetting({ codexEnabled: !settings.codexEnabled })}
                  >
                    <i />
                  </button>
                </div>
              </div>

              {/* 3. Gemini CLI */}
              <div className="settings-row align-top">
                <div className="row-left-with-icon align-top" style={{ flex: 1 }}>
                  <span className="ai-badge-icon lg gemini">
                    <i />
                    <i />
                  </span>
                  <div className="row-text-col" style={{ width: '100%' }}>
                    <strong>Gemini CLI</strong>
                    <span>
                      Follows Google Gemini CLI in the terminal and VS Code sessions.
                    </span>

                    <div className="ai-api-key-box">
                      <button
                        type="button"
                        className="ai-get-key-btn"
                        onClick={() =>
                          window.twocode?.openExternal?.('https://aistudio.google.com/app/apikey')
                        }
                        title="Google AI Studio'dan Ücretsiz Gemini API anahtarı al"
                      >
                        <ExternalLink size={12} />
                        <span>Get API Key</span>
                      </button>
                      <div className="ai-api-key-input-wrap">
                        <input
                          type={showKeyGemini ? 'text' : 'password'}
                          className="ai-api-key-input"
                          placeholder="AIzaSy..."
                          value={settings.geminiApiKey || ''}
                          onChange={(e) => updateSetting({ geminiApiKey: e.target.value.trim() })}
                        />
                        <button
                          type="button"
                          className="ai-api-key-eye-btn"
                          onClick={() => setShowKeyGemini(!showKeyGemini)}
                          title={showKeyGemini ? 'Gizle' : 'Göster'}
                        >
                          {showKeyGemini ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                      {settings.geminiApiKey ? (
                        <span className="key-saved-pill">✓ Saved</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="row-right-group">
                  <span
                    className={`status-badge ${settings.geminiApiKey ? 'green' : 'amber'}`}
                  >
                      {settings.geminiApiKey ? 'API key saved' : 'Waiting for key'}
                  </span>
                  <button
                    type="button"
                    className={`settings-switch ${settings.geminiEnabled !== false ? 'on' : ''}`}
                    onClick={() =>
                      updateSetting({
                        geminiEnabled: settings.geminiEnabled === false ? true : false,
                      })
                    }
                  >
                    <i />
                  </button>
                </div>
              </div>

              {/* 4. Antigravity */}
              <div className="settings-row align-top">
                <div className="row-left-with-icon align-top" style={{ flex: 1 }}>
                  <span className="ai-badge-icon lg antigravity">
                    <i />
                    <i />
                  </span>
                  <div className="row-text-col" style={{ width: '100%' }}>
                    <strong>Antigravity</strong>
                    <span>
                      DeepMind Agentic IDE & coding assistant with subagents and artifacts.
                    </span>

                    <div className="ai-api-key-box">
                      <button
                        type="button"
                        className="ai-get-key-btn"
                        onClick={() =>
                          window.twocode?.openExternal?.('https://aistudio.google.com/app/apikey')
                        }
                        title="Google DeepMind Gemini API Anahtarı Al"
                      >
                        <ExternalLink size={12} />
                        <span>Get API Key</span>
                      </button>
                      <div className="ai-api-key-input-wrap">
                        <input
                          type={showKeyAntigravity ? 'text' : 'password'}
                          className="ai-api-key-input"
                          placeholder="AIzaSy... / AGY Token"
                          value={settings.antigravityApiKey || ''}
                          onChange={(e) =>
                            updateSetting({ antigravityApiKey: e.target.value.trim() })
                          }
                        />
                        <button
                          type="button"
                          className="ai-api-key-eye-btn"
                          onClick={() => setShowKeyAntigravity(!showKeyAntigravity)}
                          title={showKeyAntigravity ? 'Gizle' : 'Göster'}
                        >
                          {showKeyAntigravity ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                      {settings.antigravityApiKey ? (
                        <span className="key-saved-pill">✓ Saved</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="row-right-group">
                  <span className={`status-badge ${settings.antigravityApiKey ? 'green' : 'amber'}`}>
                    {settings.antigravityApiKey ? 'API key saved' : 'No API key'}
                  </span>
                  <button
                    type="button"
                    className={`settings-switch ${
                      settings.antigravityEnabled !== false ? 'on' : ''
                    }`}
                    onClick={() =>
                      updateSetting({
                        antigravityEnabled: settings.antigravityEnabled === false ? true : false,
                      })
                    }
                  >
                    <i />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            PAGE 3: AI & CHAT
            ============================================================ */}
        {activePage === 'aichat' && (
          <div className="settings-page-body">
            <p className="page-lead-text">
              Robo&apos;s chat uses the AI you turned on in Connections. Both on? Then you pick one
              in the chat.
            </p>

            <div className="settings-card">
              <div className="settings-row">
                <div className="row-left-with-icon">
                  <span className="ai-badge-icon lg claude">
                    <i />
                    <i />
                  </span>
                  <div className="row-text-col">
                    <strong>Claude</strong>
                    <span>Robo sohbetinde Claude API anahtarını kullanır. Claude Code görevleri ayrı olarak izlenir.</span>
                  </div>
                </div>
                <span className={`status-badge ${settings.claudeApiKey ? 'green' : 'amber'}`}>
                  {settings.claudeApiKey ? 'API key saved' : 'No API key'}
                </span>
              </div>

              <div className="settings-row">
                <div className="row-left-with-icon">
                  <span className="ai-badge-icon lg codex">
                    <i />
                    <i />
                  </span>
                  <div className="row-text-col">
                    <strong>Codex</strong>
                    <span>Robo sohbetinde OpenAI API anahtarını kullanır. Google bağlantısı yalnızca Gmail ve Takvim içindir.</span>
                  </div>
                </div>
                <span className={`status-badge ${settings.codexApiKey ? 'green' : 'amber'}`}>
                  {settings.codexApiKey ? 'API key saved' : 'No API key'}
                </span>
              </div>
            </div>

            <div className="settings-card" style={{ marginTop: 14 }}>
              <div className="settings-row no-border">
                <div className="row-left-with-icon">
                  <span className="ai-badge-icon lg gemini">
                    <i />
                    <i />
                  </span>
                  <div className="row-text-col">
                    <strong>Google Gemini API Key</strong>
                    <span>Gemini API for Robo chat. Google may charge for API usage.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="password"
                    placeholder="AIzaSy... (Opsiyonel)"
                    value={settings.geminiApiKey || ''}
                    onChange={(e) => updateSetting({ geminiApiKey: e.target.value })}
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 8,
                      padding: '6px 12px',
                      color: '#ffffff',
                      fontSize: 12,
                      width: 180,
                      outline: 'none',
                    }}
                  />
                  {settings.geminiApiKey ? (
                    <span className="status-badge green">API key saved</span>
                  ) : (
                    <span className="status-badge">API key required</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            PAGE 4: APPS
            ============================================================ */}
        {activePage === 'apps' && (
          <div className="settings-page-body">
            <div className="settings-card">
              <div className="settings-row no-border">
                <div className="row-left-with-icon">
                  <div className="stat-icon-sq blue">
                    <ExternalLink size={16} />
                  </div>
                  <div className="row-text-col">
                    <strong>Your own apps</strong>
                    <span>
                      Up to 4 websites or programs. They sit in the island next to your tabs, on
                      every page. Click one and it opens.
                    </span>
                  </div>
                </div>
              </div>

              {(settings.apps || []).map((app) => (
                <div key={app.id} className="settings-row app-item-row">
                  <div className="app-item-left">
                    <span className="app-brand-badge" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <RealAppIcon sc={app} size={16} />
                    </span>
                    <strong className="app-item-name">{app.name}</strong>
                    <span className="app-item-path">{app.url}</span>
                  </div>
                  <button
                    type="button"
                    className="dark-pill-btn"
                    onClick={() => handleRemoveApp(app.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <div className="apps-add-form-row">
                <input
                  type="text"
                  className="settings-input"
                  placeholder="Name (e.g. YouTube)"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                />
                <input
                  type="text"
                  className="settings-input"
                  placeholder="Address (e.g. youtube.com)"
                  value={newAppUrl}
                  onChange={(e) => setNewAppUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddApp()}
                />
                <button type="button" className="white-pill-btn" onClick={handleAddApp}>
                  Add
                </button>
                <button type="button" className="dark-pill-btn" onClick={handleChooseProgram}>
                  Choose a program...
                </button>
              </div>
            </div>

            <div className="apps-bottom-three-grid">
              <div className="settings-card feature-card">
                <div className="feature-card-top">
                  <div className="row-left-with-icon">
                    <div className="stat-icon-sq blue">
                      <Shield size={16} />
                    </div>
                    <div className="row-text-col">
                      <strong>Focus guard</strong>
                      <span>Free for now ✓</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="dark-pill-btn"
                    onClick={() => setActivePage('focusguard')}
                  >
                    Open
                  </button>
                </div>
                <p>Robo stops you for a moment when you open something that distracts you.</p>
                <button
                  type="button"
                  className="how-it-works-btn"
                  onClick={() => setActivePage('focusguard')}
                >
                  <Play size={11} /> How does it work?
                </button>
              </div>

              <div className="settings-card feature-card">
                <div className="feature-card-top">
                  <div className="row-left-with-icon">
                    <div className="stat-icon-sq green">
                      <Bot size={16} />
                    </div>
                    <div className="row-text-col">
                      <strong>AI assistants</strong>
                      <span>Free</span>
                    </div>
                  </div>
                  <span className="status-badge subtle">Always on</span>
                </div>
                <p>
                  Claude Code and Codex: Robo shows whether your AI is busy, has a question or is
                  done.
                </p>
                <button
                  type="button"
                  className="how-it-works-btn"
                  onClick={() => setActivePage('connections')}
                >
                  <Play size={11} /> How does it work?
                </button>
              </div>

              <div className="settings-card feature-card">
                <div className="feature-card-top">
                  <div className="row-left-with-icon">
                    <div className="stat-icon-sq blue">
                      <Hand size={16} />
                    </div>
                    <div className="row-text-col">
                      <strong>Robo Buddy</strong>
                      <span>In your TwoCode</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`settings-switch ${settings.roboBuddy ? 'on' : ''}`}
                    onClick={() => updateSetting({ roboBuddy: !settings.roboBuddy })}
                  >
                    <i />
                  </button>
                </div>
                <p>Grab Robo out of the island, drop him on anything and ask about it.</p>
                <button
                  type="button"
                  className="how-it-works-btn"
                  onClick={() => setActivePage('robo')}
                >
                  <Play size={11} /> How does it work?
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            PAGE 5: ROBO
            ============================================================ */}
        {activePage === 'robo' && (
          <div className="settings-page-body">
            <div className="settings-card robo-hero-card">
              <div className="robo-hero-avatar-box">
                <RoboCrownAvatar outfit={settings.outfit} size={110} />
              </div>
              <div className="robo-hero-info">
                <h2>{settings.roboName || 'Robo'}</h2>
                <span>{aiHistory.jobsToday || 2} tasks done · 5 of 12 badges</span>
                <div className="robo-badge-progress">
                  <div className="robo-badge-fill" style={{ width: '42%' }} />
                </div>
              </div>
            </div>

            <span className="section-eyebrow">NAME</span>
            <div className="settings-card">
              <div className="settings-row">
                <div className="row-text-col">
                  <strong>What&apos;s his name?</strong>
                  <span>He says it when he says hi</span>
                </div>
                <div className="row-right-group">
                  <input
                    type="text"
                    className="settings-input w-180"
                    value={roboNameDraft}
                    onChange={(e) => setRoboNameDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    className="white-pill-btn"
                    onClick={() => updateSetting({ roboName: roboNameDraft || 'Robo' })}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>

            <span className="section-eyebrow" style={{ marginTop: 18 }}>
              LOOK
            </span>
            <div className="settings-card">
              <div className="settings-row no-border">
                <div className="row-text-col">
                  <strong>Traffic-light eyes</strong>
                  <span>Pick the colour for each state. Click the block for a test.</span>
                  <div className="preset-pills-row">
                    {['Classic', 'Soft', 'Colour-blind'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`preset-pill-btn ${
                          settings.eyePreset === preset ? 'active' : ''
                        }`}
                        onClick={() => updateSetting({ eyePreset: preset })}
                      >
                        <span className="preset-dots">
                          <i style={{ background: '#f59e0b' }} />
                          <i style={{ background: '#22c55e' }} />
                          <i style={{ background: '#ef4444' }} />
                        </span>
                        <span>{preset}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="traffic-subrow" onClick={() => triggerEmotionOnIsland('curious')}>
                <div className="traffic-left">
                  <i className="state-dot" style={{ background: settings.workingEyeColor }} />
                  <strong>Working or a question</strong>
                </div>
                <div className="swatch-group">
                  {['#f59e0b', '#fbbf24', '#fde047', '#f472b6', '#c084fc', '#60a5fa'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color-dot-btn ${
                        settings.workingEyeColor === c ? 'selected' : ''
                      }`}
                      style={{ background: c }}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSetting({ workingEyeColor: c });
                        triggerEmotionOnIsland('curious');
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="traffic-subrow" onClick={() => triggerEmotionOnIsland('happy')}>
                <div className="traffic-left">
                  <i className="state-dot" style={{ background: settings.doneEyeColor }} />
                  <strong>Done</strong>
                </div>
                <div className="swatch-group">
                  {['#22c55e', '#86efac', '#bef264', '#2dd4bf', '#3b82f6', '#ffffff'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color-dot-btn ${settings.doneEyeColor === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSetting({ doneEyeColor: c });
                        triggerEmotionOnIsland('happy');
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="traffic-subrow" onClick={() => triggerEmotionOnIsland('dizzy')}>
                <div className="traffic-left">
                  <i className="state-dot" style={{ background: settings.errorEyeColor }} />
                  <strong>Error</strong>
                </div>
                <div className="swatch-group">
                  {['#ef4444', '#f87171', '#fb7185', '#e879f9', '#a855f7', '#f97316'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color-dot-btn ${settings.errorEyeColor === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSetting({ errorEyeColor: c });
                        triggerEmotionOnIsland('dizzy');
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <span className="section-eyebrow" style={{ marginTop: 18 }}>
              BEHAVIOUR · CLICK A BLOCK FOR AN EXAMPLE
            </span>
            <div className="settings-card">
              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Faces</strong>
                  <span>Happy, sad, curious, focused</span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.facesEnabled ? 'on' : ''}`}
                  onClick={() => updateSetting({ facesEnabled: !settings.facesEnabled })}
                >
                  <i />
                </button>
              </div>

              <div className="settings-row align-top">
                <div className="row-text-col">
                  <strong>See emotions</strong>
                  <span>Click one to see it</span>
                </div>
                <div className="emotions-grid">
                  {[
                    { label: '😊 Happy', mood: 'happy' },
                    { label: '😍 In love', mood: 'happy' },
                    { label: '😮 Surprised', mood: 'curious' },
                    { label: '🧐 Curious', mood: 'curious' },
                    { label: '🤨 Focused', mood: 'focus-arc' },
                    { label: '😉 Wink', mood: 'wink' },
                    { label: '😢 Sad', mood: 'normal' },
                    { label: '😵 Dizzy', mood: 'dizzy' },
                    { label: '😴 Sleepy', mood: 'focus-arc' },
                  ].map((em) => (
                    <button
                      key={em.label}
                      type="button"
                      className="emotion-chip-btn"
                      onClick={() => triggerEmotionOnIsland(em.mood)}
                    >
                      {em.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Blinking</strong>
                  <span>He blinks now and then</span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.blinkingEnabled ? 'on' : ''}`}
                  onClick={() => updateSetting({ blinkingEnabled: !settings.blinkingEnabled })}
                >
                  <i />
                </button>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Dancing to music</strong>
                  <span>Moves along when Spotify plays</span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.dancingEnabled ? 'on' : ''}`}
                  onClick={() => updateSetting({ dancingEnabled: !settings.dancingEnabled })}
                >
                  <i />
                </button>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Sleep effect</strong>
                  <span>He falls asleep when nothing happens for a while</span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.sleepEffectEnabled ? 'on' : ''}`}
                  onClick={() => updateSetting({ sleepEffectEnabled: !settings.sleepEffectEnabled })}
                >
                  <i />
                </button>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Fall asleep after</strong>
                  <span>When nothing happens (Sleep effect must be on)</span>
                </div>
                <div className="seg-btn-group">
                  {[5, 10, 30].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`seg-choice-btn ${
                        settings.fallAsleepMinutes === m ? 'active' : ''
                      }`}
                      onClick={() => updateSetting({ fallAsleepMinutes: m })}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Startup animation</strong>
                  <span>Wave and say &quot;hi&quot; at startup</span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.startupAnimEnabled ? 'on' : ''}`}
                  onClick={() => updateSetting({ startupAnimEnabled: !settings.startupAnimEnabled })}
                >
                  <i />
                </button>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Hunger</strong>
                  <span>Robo is 100% full. Every task gives food 🍪</span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.hungerEnabled ? 'on' : ''}`}
                  onClick={() => updateSetting({ hungerEnabled: !settings.hungerEnabled })}
                >
                  <i />
                </button>
              </div>
            </div>

            <span className="section-eyebrow" style={{ marginTop: 18 }}>
              ACHIEVEMENTS · 5/12
            </span>
            <div className="achievements-grid">
              {[
                { icon: '🌱', title: 'First task', unlocked: true },
                { icon: '🔒', title: 'Ten tasks', unlocked: false },
                { icon: '🔒', title: 'Fifty tasks', unlocked: false },
                { icon: '🔒', title: 'Helpful', unlocked: false },
                { icon: '🦉', title: 'Night owl', unlocked: true },
                { icon: '🌅', title: 'Early bird', unlocked: true },
                { icon: '🎵', title: 'Music lover', unlocked: true },
                { icon: '🎯', title: 'Deep focus', unlocked: true },
                { icon: '🔒', title: 'Streak 7', unlocked: false },
                { icon: '🔒', title: 'Clipboard pro', unlocked: false },
                { icon: '🔒', title: 'Note taker', unlocked: false },
                { icon: '🔒', title: 'Best dressed', unlocked: false },
              ].map((ach) => (
                <div
                  key={ach.title}
                  className={`achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}`}
                >
                  <span className="ach-emoji">{ach.icon}</span>
                  <strong>{ach.title}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================
            PAGE 6: WARDROBE
            ============================================================ */}
        {activePage === 'wardrobe' && (
          <div className="settings-page-body">
            <div className="wardrobe-layout">
              <div className="settings-card wardrobe-preview-card">
                <RoboCrownAvatar
                  outfit={settings.outfit}
                  size={170}
                  eyeHex={settings.eyeColorHex}
                />
                <div className="wardrobe-preview-caption">
                  <strong>{settings.roboName || 'Robo'}</strong>
                  <span>Wearing: {settings.outfit}</span>
                </div>
              </div>

              <div className="wardrobe-options-col">
                <div className="wardrobe-group">
                  <div className="wardrobe-group-header">
                    <strong>Outfit</strong>
                    <span>Earn more by finishing tasks</span>
                  </div>
                  <div className="outfit-cards-grid">
                    {[
                      { id: 'Best', icon: '✨', sub: '' },
                      { id: 'None', icon: '🚫', sub: '' },
                      { id: 'Party hat', icon: '🥳', sub: 'Earned at 5 tasks' },
                      { id: 'Sunglasses', icon: '😎', sub: 'Earned at 15 tasks' },
                      { id: 'Crown', icon: '👑', sub: 'Earned at 30 tasks' },
                    ].map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className={`outfit-tile-btn ${settings.outfit === o.id ? 'selected' : ''}`}
                        onClick={() => updateSetting({ outfit: o.id })}
                      >
                        {settings.outfit === o.id && (
                          <span className="outfit-check-badge">
                            <Check size={10} strokeWidth={3.2} color="#050507" />
                          </span>
                        )}
                        <span className="outfit-emoji">{o.icon}</span>
                        <strong>{o.id}</strong>
                        {o.sub && <span>{o.sub}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="wardrobe-group">
                  <div className="wardrobe-group-header">
                    <strong>Body</strong>
                  </div>
                  <div className="sphere-swatches-row">
                    {[
                      { name: 'Cloud', bg: 'radial-gradient(circle at 30% 30%, #ffffff, #d4d4d8)' },
                      { name: 'Mint', bg: 'radial-gradient(circle at 30% 30%, #d1fae5, #6ee7b7)' },
                      { name: 'Sky', bg: 'radial-gradient(circle at 30% 30%, #e0f2fe, #7dd3fc)' },
                      { name: 'Rose', bg: 'radial-gradient(circle at 30% 30%, #fce7f3, #f9a8d4)' },
                      {
                        name: 'Classic',
                        bg: 'radial-gradient(circle at 30% 30%, #4b5563, #1f2937)',
                      },
                      { name: 'Night', bg: 'radial-gradient(circle at 30% 30%, #3f3f46, #18181b)' },
                      { name: 'Blue', bg: 'radial-gradient(circle at 30% 30%, #3b82f6, #1d4ed8)' },
                      {
                        name: 'Purple',
                        bg: 'radial-gradient(circle at 30% 30%, #8b5cf6, #4c1d95)',
                      },
                      { name: 'Pink', bg: 'radial-gradient(circle at 30% 30%, #be185d, #500724)' },
                      { name: 'Gold', bg: 'radial-gradient(circle at 30% 30%, #a16207, #422006)' },
                    ].map((b) => (
                      <div
                        key={b.name}
                        className="sphere-swatch-item"
                        onClick={() => updateSetting({ bodyColor: b.name })}
                      >
                        <span
                          className={`sphere-circle ${
                            settings.bodyColor === b.name ? 'selected' : ''
                          }`}
                          style={{ background: b.bg }}
                        />
                        <small>{b.name}</small>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="wardrobe-group">
                  <div className="wardrobe-group-header">
                    <strong>Eyes</strong>
                  </div>
                  <div className="sphere-swatches-row">
                    {[
                      { name: 'Mint', hex: '#a7f3d0' },
                      { name: 'White', hex: '#ffffff' },
                      { name: 'Blue', hex: '#7dd3fc' },
                      { name: 'Pink', hex: '#f9a8d4' },
                      { name: 'Purple', hex: '#c4b5fd' },
                      { name: 'Yellow', hex: '#fef08a' },
                    ].map((ey) => (
                      <div
                        key={ey.name}
                        className="sphere-swatch-item"
                        onClick={() =>
                          updateSetting({ eyeColorName: ey.name, eyeColorHex: ey.hex })
                        }
                      >
                        <span
                          className={`sphere-circle ${
                            settings.eyeColorName === ey.name ? 'selected' : ''
                          }`}
                          style={{ background: ey.hex }}
                        />
                        <small>{ey.name}</small>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="settings-card">
                  <div className="settings-row">
                    <div className="row-left-with-icon">
                      <div className="stat-icon-sq amber">
                        <Sparkles size={15} />
                      </div>
                      <div className="row-text-col">
                        <strong>Seasonal outfits</strong>
                        <span>Santa hat, witch hat, orange crown on King&apos;s Day</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`settings-switch ${settings.seasonalOutfits ? 'on' : ''}`}
                      onClick={() => updateSetting({ seasonalOutfits: !settings.seasonalOutfits })}
                    >
                      <i />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            PAGE 7: ACCOUNT
            ============================================================ */}
        {activePage === 'account' && (
          <div className="settings-page-body narrow-body">
            <div className="settings-card">
              <div className="settings-row">
                <div className="row-left-with-icon">
                  <div className="stat-icon-sq green">
                    <Bot size={16} />
                  </div>
                  <div className="row-text-col">
                    <strong>1 free day left</strong>
                    <span>
                      Buy it during your free day and get a discount: €8,99 instead of €9,99. Once,
                      forever.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="white-pill-btn"
                  onClick={() => window.twocode?.openExternal('https://twocode.nl/')}
                >
                  Buy · €8,99
                </button>
              </div>
            </div>

            <div className="settings-card" style={{ marginTop: 14 }}>
              <div className="settings-row no-border">
                <div className="row-left-with-icon">
                  <div className="stat-icon-sq blue">
                    <User size={16} />
                  </div>
                  <div className="row-text-col">
                    <strong>Sign in</strong>
                    <span>
                      With your TwoCode account. What you bought and your Founder status come with
                      you to every PC.
                    </span>
                  </div>
                </div>
              </div>

              <div className="account-form-stack">
                <input
                  type="email"
                  className="settings-input full"
                  placeholder="you@example.com"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                />
                <div className="account-pass-row">
                  <input
                    type="password"
                    className="settings-input full"
                    placeholder="Password"
                    value={accountPass}
                    onChange={(e) => setAccountPass(e.target.value)}
                  />
                  <button type="button" className="white-pill-btn">
                    Sign in
                  </button>
                </div>
                <div className="account-sub-links">
                  <button type="button" className="dark-pill-btn sm">
                    No account yet? Create one
                  </button>
                  <button type="button" className="dark-pill-btn sm">
                    Forgot password?
                  </button>
                </div>
              </div>
            </div>

            <button type="button" className="dark-pill-btn sm" style={{ marginTop: 14 }}>
              Got a code from us?
            </button>
          </div>
        )}

        {/* ============================================================
            PAGE 8: GENERAL
            ============================================================ */}
        {activePage === 'general' && (
          <div className="settings-page-body narrow-body">
            <span className="section-eyebrow">KEYBOARD SHORTCUTS</span>
            <div className="settings-card">
              {[
                { label: 'Open the island', keys: 'Ctrl + Alt + T' },
                { label: 'Tuck the island away / back', keys: 'Ctrl + Alt + H' },
                { label: 'Talk to Robo', keys: 'Ctrl + Alt + Space' },
                { label: 'Home', keys: 'Ctrl + Alt + Shift + 1' },
                { label: 'Music', keys: 'Ctrl + Alt + Shift + 2' },
                { label: 'Claude Code', keys: 'Ctrl + Alt + Shift + 3' },
                { label: 'Focus timer', keys: 'Ctrl + Alt + Shift + 4' },
                { label: 'Clipboard', keys: 'Ctrl + Alt + Shift + 5' },
                { label: 'Note', keys: 'Ctrl + Alt + Shift + 6' },
              ].map((sc) => (
                <div key={sc.label} className="settings-row">
                  <strong>{sc.label}</strong>
                  <kbd className="shortcut-kbd-pill">{sc.keys}</kbd>
                </div>
              ))}
              <div className="settings-row">
                <strong>Put all shortcuts back</strong>
                <button type="button" className="dark-pill-btn sm">
                  Reset
                </button>
              </div>
            </div>

            <span className="section-eyebrow" style={{ marginTop: 20 }}>
              LANGUAGE
            </span>
            <div className="settings-card">
              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Language · Taal</strong>
                  <span>The language of the island</span>
                </div>
                <div className="seg-btn-group">
                  {['Nederlands', 'English'].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      className={`seg-choice-btn ${settings.language === lang ? 'active' : ''}`}
                      onClick={() => updateSetting({ language: lang })}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <span className="section-eyebrow" style={{ marginTop: 20 }}>
              BEHAVIOUR
            </span>
            <div className="settings-card">
              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Start with Windows</strong>
                  <span>Open TwoCode automatically when you sign in to your PC</span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.startWithWindows !== false ? 'on' : ''}`}
                  onClick={() =>
                    updateSetting({ startWithWindows: settings.startWithWindows === false })
                  }
                >
                  <i />
                </button>
              </div>
              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Sound effects</strong>
                  <span>Subtle chimes when tasks finish or timers end</span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.soundEffects !== false ? 'on' : ''}`}
                  onClick={() => updateSetting({ soundEffects: settings.soundEffects === false })}
                >
                  <i />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            PAGE 9: NOTIFICATIONS
            ============================================================ */}
        {activePage === 'notifications' && (
          <div className="notifications-split-layout">
            <div className="notif-left-list">
              <div className="notif-top-toggles">
                <div className="notif-toggle-line">
                  <strong>Windows notifications</strong>
                  <button
                    type="button"
                    className={`settings-switch ${settings.windowsNotifications ? 'on' : ''}`}
                    onClick={() =>
                      updateSetting({ windowsNotifications: !settings.windowsNotifications })
                    }
                  >
                    <i />
                  </button>
                </div>
                <div className="notif-toggle-line">
                  <strong>Do not disturb</strong>
                  <button
                    type="button"
                    className={`settings-switch ${settings.doNotDisturb ? 'on' : ''}`}
                    onClick={() => updateSetting({ doNotDisturb: !settings.doNotDisturb })}
                  >
                    <i />
                  </button>
                </div>
              </div>

              {NOTIFICATION_ITEMS.map((grp) => (
                <div key={grp.group} className="notif-group-block">
                  <span className="notif-group-title">{grp.group}</span>
                  {grp.items.map((it) => (
                    <button
                      key={it}
                      type="button"
                      className={`notif-item-btn ${selectedNotifItem === it ? 'active' : ''}`}
                      onClick={() => setSelectedNotifItem(it)}
                    >
                      {it}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="notif-right-detail">
              <div
                className="notif-preview-stage"
                style={{
                  background: `radial-gradient(ellipse 80% 75% at 50% 100%, ${settings.notifColor}55 0%, #090d1a 75%)`,
                }}
              >
                <div className="notif-preview-island">
                  <span
                    className="notif-preview-check"
                    style={{ background: settings.notifColor }}
                  >
                    <Check size={14} strokeWidth={3} color="#fff" />
                  </span>
                  <div className="notif-preview-copy">
                    <strong>{selectedNotifItem}</strong>
                    <span>checkout: Fixed the checkout total</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="white-pill-btn try-it-btn"
                  onClick={triggerTestNotificationOnIsland}
                >
                  Try it
                </button>
              </div>

              <div className="notif-options-table">
                <div className="settings-row">
                  <strong>Show it</strong>
                  <div className="seg-btn-group">
                    {['In the island', 'Own card', 'Windows', 'Off'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`seg-choice-btn ${
                          settings.notifShowWhere === opt ? 'active' : ''
                        }`}
                        onClick={() => updateSetting({ notifShowWhere: opt })}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <strong>Size</strong>
                  <div className="seg-btn-group">
                    {['Small', 'Big'].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        className={`seg-choice-btn ${settings.notifSize === sz ? 'active' : ''}`}
                        onClick={() => updateSetting({ notifSize: sz })}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <strong>Stay for</strong>
                  <div className="slider-with-val">
                    <input
                      type="range"
                      min="2"
                      max="15"
                      value={settings.notifDurationSec}
                      onChange={(e) =>
                        updateSetting({ notifDurationSec: parseInt(e.target.value, 10) })
                      }
                    />
                    <span>{settings.notifDurationSec} s</span>
                  </div>
                </div>

                <div className="settings-row">
                  <strong>Sound</strong>
                  <div className="seg-btn-group">
                    {['Ding', 'Pling', 'Pop', 'Warning', 'Party', 'None'].map((snd) => (
                      <button
                        key={snd}
                        type="button"
                        className={`seg-choice-btn ${settings.notifSound === snd ? 'active' : ''}`}
                        onClick={() => {
                          updateSetting({ notifSound: snd });
                          playNotifSound(snd, settings.soundEffects !== false);
                        }}
                      >
                        {snd}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <strong>Colour</strong>
                  <div className="swatch-group">
                    <button
                      type="button"
                      className={`color-dot-btn rainbow-dot ${
                        settings.notifColor === '#3b82f6' ? 'selected' : ''
                      }`}
                      onClick={() => updateSetting({ notifColor: '#3b82f6' })}
                      title="Custom colour"
                    />
                    {['#f97316', '#ef4444', '#8b5cf6', '#3b82f6', '#22c55e', '#ffffff'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`color-dot-btn ${settings.notifColor === c ? 'selected' : ''}`}
                        style={{ background: c }}
                        onClick={() => updateSetting({ notifColor: c })}
                      />
                    ))}
                  </div>
                </div>

                <div
                  className={`settings-row ${
                    settings.notifShowWhere !== 'Own card' ? 'row-dimmed' : ''
                  }`}
                >
                  <strong>Place</strong>
                  <div className="notif-place-grid">
                    {['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'].map(
                      (pos) => (
                        <button
                          key={pos}
                          type="button"
                          className={`notif-place-cell ${
                            (settings.notifPlace || 'top-center') === pos ? 'active' : ''
                          }`}
                          onClick={() => updateSetting({ notifPlace: pos })}
                        />
                      )
                    )}
                  </div>
                </div>

                <div className="settings-row">
                  <strong>Your text</strong>
                  <div className="seg-btn-group">
                    {['Show', 'Hide'].map((tx) => (
                      <button
                        key={tx}
                        type="button"
                        className={`seg-choice-btn ${
                          settings.notifShowText === tx ? 'active' : ''
                        }`}
                        onClick={() => updateSetting({ notifShowText: tx })}
                      >
                        {tx}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-row">
                  <strong>Also during</strong>
                  <div className="row-right-group">
                    <span className="inline-toggle-label">Focus</span>
                    <button
                      type="button"
                      className={`settings-switch ${settings.notifDuringFocus ? 'on' : ''}`}
                      onClick={() =>
                        updateSetting({ notifDuringFocus: !settings.notifDuringFocus })
                      }
                    >
                      <i />
                    </button>
                    <span className="inline-toggle-label" style={{ marginLeft: 10 }}>
                      Games
                    </span>
                    <button
                      type="button"
                      className={`settings-switch ${settings.notifDuringGames ? 'on' : ''}`}
                      onClick={() =>
                        updateSetting({ notifDuringGames: !settings.notifDuringGames })
                      }
                    >
                      <i />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            PAGE 10: ISLAND
            ============================================================ */}
        {activePage === 'island' && (
          <div className="settings-page-body narrow-body">
            <span className="section-eyebrow">LOOK</span>
            <div className="settings-card">
              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Size</strong>
                  <span>How big the island is</span>
                </div>
                <div className="seg-btn-group">
                  {['Compact', 'Normal', 'Large'].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      className={`seg-choice-btn ${settings.islandSize === sz ? 'active' : ''}`}
                      onClick={() => updateSetting({ islandSize: sz })}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Style</strong>
                  <span>
                    Attached to the top edge like a laptop&apos;s notch, or floating just below it
                    like on an iPhone
                  </span>
                </div>
                <div className="seg-btn-group">
                  {['Attached', 'Floating'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`seg-choice-btn ${settings.islandStyle === st ? 'active' : ''}`}
                      onClick={() => updateSetting({ islandStyle: st })}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>See-through</strong>
                  <span>How much you see through the island</span>
                </div>
                <div className="slider-with-val">
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={settings.islandSeeThrough}
                    onChange={(e) =>
                      updateSetting({ islandSeeThrough: parseInt(e.target.value, 10) })
                    }
                  />
                  <span>{settings.islandSeeThrough}%</span>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Music colour</strong>
                  <span>
                    When the island is see-through, it takes on the colour of the album cover that
                    is playing
                  </span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.islandMusicColour ? 'on' : ''}`}
                  onClick={() => updateSetting({ islandMusicColour: !settings.islandMusicColour })}
                >
                  <i />
                </button>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Open</strong>
                  <span>
                    Opens the island when your mouse moves over it, or only when you click it
                  </span>
                </div>
                <div className="seg-btn-group">
                  {['On hover', 'On click'].map((op) => (
                    <button
                      key={op}
                      type="button"
                      className={`seg-choice-btn ${settings.islandOpenMode === op ? 'active' : ''}`}
                      onClick={() => updateSetting({ islandOpenMode: op })}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <span className="section-eyebrow" style={{ marginTop: 20 }}>
              RESTING ISLAND
            </span>
            <div className="settings-card">
              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Left of Robo</strong>
                  <span>What it shows when nothing is going on</span>
                </div>
                <div className="seg-btn-group">
                  {['Nothing', 'Time', 'Battery', 'CPU', 'RAM', 'Wi-Fi', 'Bluetooth'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`seg-choice-btn ${settings.leftOfRobo === opt ? 'active' : ''}`}
                      onClick={() => updateSetting({ leftOfRobo: opt })}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Robo&apos;s eyes</strong>
                  <span>In the middle, where your laptop&apos;s camera is</span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.roboEyesVisible ? 'on' : ''}`}
                  onClick={() => updateSetting({ roboEyesVisible: !settings.roboEyesVisible })}
                >
                  <i />
                </button>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Right of Robo</strong>
                  <span>What it shows when nothing is going on</span>
                </div>
                <div className="seg-btn-group">
                  {['Nothing', 'Time', 'Battery', 'CPU', 'RAM', 'Wi-Fi', 'Bluetooth'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`seg-choice-btn ${settings.rightOfRobo === opt ? 'active' : ''}`}
                      onClick={() => updateSetting({ rightOfRobo: opt })}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Clock</strong>
                  <span>How the time looks, in the island and on Home</span>
                </div>
                <div className="seg-btn-group">
                  {['Automatic', '12-hour · 6:30 PM', '24-hour · 18:30'].map((cf) => (
                    <button
                      key={cf}
                      type="button"
                      className={`seg-choice-btn ${settings.clockFormat === cf ? 'active' : ''}`}
                      onClick={() => updateSetting({ clockFormat: cf })}
                    >
                      {cf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <span className="section-eyebrow" style={{ marginTop: 20 }}>
              ON THE ISLAND
            </span>
            <div className="settings-card">
              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Lyrics</strong>
                  <span>
                    The line that is sung, in the island. From lrclib.net or NetEase (only the
                    song&apos;s name goes there)
                  </span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.lyricsEnabled ? 'on' : ''}`}
                  onClick={() => updateSetting({ lyricsEnabled: !settings.lyricsEnabled })}
                >
                  <i />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            PAGE 11: FOCUS GUARD
            ============================================================ */}
        {activePage === 'focusguard' && (
          <div className="settings-page-body narrow-body">
            <span className="section-eyebrow">FOCUS GUARD</span>
            <div className="settings-card">
              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Focus guard</strong>
                  <span>
                    Open something that distracts you and Robo stops you for a moment: breathe
                    first, then you choose. Like &quot;one sec&quot; on your phone.
                  </span>
                </div>
                <button
                  type="button"
                  className={`settings-switch ${settings.focusGuardEnabled ? 'on' : ''}`}
                  onClick={() => updateSetting({ focusGuardEnabled: !settings.focusGuardEnabled })}
                >
                  <i />
                </button>
              </div>

              <div className="settings-row align-top">
                <div className="row-text-col">
                  <strong>Apps and sites</strong>
                  <span>Pick what distracts you</span>
                </div>
                <div className="seg-btn-group wrap-right">
                  {[
                    'YouTube',
                    'TikTok',
                    'Instagram',
                    'X',
                    'Reddit',
                    'Facebook',
                    'Netflix',
                    'Twitch',
                    'Discord',
                  ].map((site) => {
                    const active = (settings.focusGuardApps || []).includes(site);
                    return (
                      <button
                        key={site}
                        type="button"
                        className={`seg-choice-btn ${active ? 'active' : ''}`}
                        onClick={() => {
                          const curr = settings.focusGuardApps || [];
                          const next = active ? curr.filter((x) => x !== site) : [...curr, site];
                          updateSetting({ focusGuardApps: next });
                        }}
                      >
                        {site}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Your own app or site</strong>
                  <span>Words from its name, with commas in between (e.g. roblox, fortnite)</span>
                </div>
                <div className="row-right-group">
                  <input
                    type="text"
                    className="settings-input w-200"
                    placeholder="roblox, fortnite"
                    value={settings.focusGuardCustom || ''}
                    onChange={(e) => updateSetting({ focusGuardCustom: e.target.value })}
                  />
                  <button type="button" className="dark-pill-btn sm">
                    Save
                  </button>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Wait</strong>
                  <span>How long you breathe in and out first</span>
                </div>
                <div className="seg-btn-group">
                  {[3, 5, 10].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`seg-choice-btn ${
                        settings.focusGuardWaitSec === s ? 'active' : ''
                      }`}
                      onClick={() => updateSetting({ focusGuardWaitSec: s })}
                    >
                      {s} sec
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Then leave you alone for</strong>
                  <span>How long Robo lets you be when you open it anyway</span>
                </div>
                <div className="seg-btn-group">
                  {[5, 15, 30].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`seg-choice-btn ${
                        settings.focusGuardLeaveMin === m ? 'active' : ''
                      }`}
                      onClick={() => updateSetting({ focusGuardLeaveMin: m })}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Today</strong>
                  <span>You went back 0× · opened it anyway 0×</span>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-text-col">
                  <strong>Privacy</strong>
                  <span>
                    TwoCode only looks at the name of the window in front, on your own PC. Nothing
                    is stored or sent.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            PAGE 12: NEWS
            ============================================================ */}
        {activePage === 'news' && (
          <div className="settings-page-body narrow-body">
            <div className="settings-card">
              <div className="settings-row">
                <div className="row-left-with-icon">
                  <div className="stat-icon-sq green">
                    <Check size={16} strokeWidth={2.5} />
                  </div>
                  <div className="row-text-col">
                    <strong>You have TwoCode 1.2.0-beta.93</strong>
                    <span>You are up to date · Newest version: v1.2.0-beta.93</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="dark-pill-btn"
                  onClick={() => window.twocode?.openExternal('https://twocode.nl/')}
                >
                  <Download size={13} style={{ marginRight: 6 }} /> Download
                </button>
              </div>
            </div>

            <div className="news-timeline">
              {[
                {
                  ver: 'TwoCode 1.2.0-beta.93',
                  newest: true,
                  date: '6 November 2026',
                  desc: "Other apps' notifications always name their app, and Discord messages show who and where without the channel",
                },
                {
                  ver: 'TwoCode 1.2.0-beta.92',
                  date: '6 November 2026',
                  desc: 'Song line and lyrics centred, the sound wave also moves on soft music and any speaker, notifications from other apps are not lost when unreadable and come faster, own card fades out and is see-through, Settings shows the last notification',
                },
                {
                  ver: 'TwoCode 1.2.0-beta.91',
                  date: '6 November 2026',
                  desc: "A real gear icon in the menu, and Settings now shows whether other apps' notifications are working.",
                },
                {
                  ver: 'TwoCode 1.2.0-beta.90',
                  date: '6 November 2026',
                  desc: 'Sign in with Google: your calendar in the island, add events, see how many new mails you have, and drag a file onto the island to mail it.',
                },
                {
                  ver: 'TwoCode 1.2.0-beta.89',
                  date: '6 November 2026',
                  desc: "Pick your own font, thickness and colour for the clock, add apps under music and Claude, the sound wave is back, the menu's bar is your PC's volume, and other apps' notifications can show in the island.",
                },
                {
                  ver: 'TwoCode 1.2.0-beta.88',
                  date: '6 November 2026',
                  desc: 'Faster startup, smoother island hover animation, and improved Spotify and browser media detection.',
                },
              ].map((rel) => (
                <div key={rel.ver} className="news-item">
                  <div className="news-dot-col">
                    <span className={`news-dot ${rel.newest ? 'bright' : ''}`} />
                    <span className="news-line" />
                  </div>
                  <div className="news-content-col">
                    <div className="news-meta-row">
                      <strong>{rel.ver}</strong>
                      {rel.newest && <span className="news-tag">Newest</span>}
                      <span className="news-tag amber">beta</span>
                      <span className="news-date">{rel.date}</span>
                    </div>
                    <div className="settings-card news-body-card">
                      <p>{rel.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================
            PAGE 13: SUPPORT TWOCODE
            ============================================================ */}
        {activePage === 'support' && (
          <div className="settings-page-body narrow-body">
            <div className="settings-card support-hero-card">
              <div className="stat-icon-sq pink">
                <Heart size={18} />
              </div>
              <h3>Enjoying TwoCode?</h3>
              <p>
                TwoCode is made by one person in the Netherlands. Everything is free during the
                beta, and it stays that way whether you donate or not. If TwoCode saves you time, a
                small donation helps me keep building it.
              </p>
              <div className="support-donate-row">
                <button
                  type="button"
                  className="white-pill-btn"
                  onClick={() => window.twocode?.openExternal('https://twocode.nl/')}
                >
                  ♡ Donate ↗
                </button>
                <span>You choose the amount · secure payment by Stripe</span>
              </div>
            </div>

            <span className="section-eyebrow" style={{ marginTop: 22 }}>
              OTHER WAYS TO HELP
            </span>
            <div className="settings-card">
              <div className="settings-row">
                <div className="row-left-with-icon">
                  <div className="stat-icon-sq blue">
                    <Sparkles size={15} />
                  </div>
                  <div className="row-text-col">
                    <strong>Tell a friend about TwoCode</strong>
                    <span>twocode.nl</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="dark-pill-btn"
                  onClick={() => {
                    window.twocode?.copyText('https://twocode.nl/');
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 1500);
                  }}
                >
                  {copiedLink ? '✓ Copied' : 'Copy link'}
                </button>
              </div>

              <div className="settings-row">
                <div className="row-left-with-icon">
                  <div className="stat-icon-sq green">
                    <MessageSquare size={15} />
                  </div>
                  <div className="row-text-col">
                    <strong>An idea, or found a bug?</strong>
                    <span>Let me know, I read everything</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="dark-pill-btn"
                  onClick={() => window.twocode?.openExternal('https://twocode.nl/')}
                >
                  Contact ↗
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
