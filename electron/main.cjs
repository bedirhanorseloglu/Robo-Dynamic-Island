const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  clipboard,
  shell,
  desktopCapturer,
  Tray,
  Menu,
  nativeImage,
  dialog,
  globalShortcut,
  session,
  net,
  safeStorage,
} = require('electron');
const path = require('path');
const { execFile, spawn } = require('child_process');
const http = require('http');
const https = require('https');
const os = require('os');
const fs = require('fs');

app.commandLine.appendSwitch('no-sandbox');

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 320;

const MODE_DIMENSIONS = {
  idle: { bodyWidth: 130, height: 20, earRadius: 8, bottomRadius: 10, droplet: 0 },
  'mini-progress': { bodyWidth: 268, height: 12, earRadius: 7, bottomRadius: 6, droplet: 0 },
  hud: { bodyWidth: 288, height: 32, earRadius: 10, bottomRadius: 16, droplet: 0 },
  battery: { bodyWidth: 356, height: 58, earRadius: 14, bottomRadius: 24, droplet: 0 },
  'notif-toast': { bodyWidth: 384, height: 60, earRadius: 14, bottomRadius: 24, droplet: 0 },
  'music-bar': { bodyWidth: 350, height: 26, earRadius: 9, bottomRadius: 13, droplet: 0 },
  'focus-bar': { bodyWidth: 110, height: 26, earRadius: 8, bottomRadius: 13, droplet: 0 },
  'focus-bar-media': { bodyWidth: 104, height: 26, earRadius: 8, bottomRadius: 13, droplet: 1 },
  expanded: { bodyWidth: 620, height: 256, earRadius: 0, bottomRadius: 24, droplet: 0 },
};

let mainWindow = null;
let settingsWindow = null;
let tray = null;
let trayContextMenu = null;
let lastMediaTitle = '';
let lastMediaArtist = '';
let cachedThumbnail = '';
let cachedLyrics = [];
let lyricsCacheMap = new Map();
let lyricsRequestId = 0;
let lyricsLookupKey = '';
let coverCacheMap = new Map();

async function fetchAlbumCover(title, artist) {
  if (!title) return '';
  const cleanTitle = (title || '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\b(official|music|video|audio|lyric|lyrics|live|performance|hd|4k|klip|akustik)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const cleanArtist = (artist || '')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/VEVO$/i, '')
    .trim();

  const cacheKey = `${cleanArtist}__${cleanTitle}`.toLowerCase();
  if (coverCacheMap.has(cacheKey)) {
    return coverCacheMap.get(cacheKey);
  }

  const queryTerms = [
    cleanArtist && cleanTitle ? `${cleanArtist} ${cleanTitle}` : cleanTitle,
    cleanTitle,
  ];

  for (const q of queryTerms) {
    if (!q) continue;
    // 1. Try iTunes Search API (very fast, high quality 600x600 cover)
    try {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=1`;
      const coverUrl = await new Promise((resolve) => {
        const req = https.get(
          itunesUrl,
          { headers: { 'User-Agent': 'TwoCode-DynamicIsland/1.0' }, timeout: 3500 },
          (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                if (parsed.results && parsed.results.length > 0 && parsed.results[0].artworkUrl100) {
                  return resolve(parsed.results[0].artworkUrl100.replace('100x100bb', '600x600bb'));
                }
              } catch {}
              resolve('');
            });
          }
        );
        req.on('error', () => resolve(''));
        req.on('timeout', () => {
          req.destroy();
          resolve('');
        });
      });
      if (coverUrl) {
        coverCacheMap.set(cacheKey, coverUrl);
        return coverUrl;
      }
    } catch {}

    // 2. Fallback Deezer
    try {
      const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`;
      const coverUrl = await new Promise((resolve) => {
        const req = https.get(
          deezerUrl,
          { headers: { 'User-Agent': 'TwoCode-DynamicIsland/1.0' }, timeout: 3500 },
          (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                if (parsed.data && parsed.data.length > 0 && parsed.data[0].album && parsed.data[0].album.cover_big) {
                  return resolve(parsed.data[0].album.cover_big);
                }
              } catch {}
              resolve('');
            });
          }
        );
        req.on('error', () => resolve(''));
        req.on('timeout', () => {
          req.destroy();
          resolve('');
        });
      });
      if (coverUrl) {
        coverCacheMap.set(cacheKey, coverUrl);
        return coverUrl;
      }
    } catch {}
  }

  return '';
}
let lastMediaState = {
  hasSession: false,
  title: '',
  artist: '',
  album: '',
  isPlaying: false,
  position: 0,
  duration: 0,
  thumbnail: '',
  lyrics: [],
};

let clipboardHistory = [];
let lastClipboardText = '';
const pendingApprovals = new Map();

let currentModeKey = 'idle';
let isHoveringNotch = false;
let leaveTimer = null;

// Current animated shape state for 60fps morphing
let currentShape = { ...MODE_DIMENSIONS.idle };
let animStartShape = { ...MODE_DIMENSIONS.idle };
let animTargetShape = { ...MODE_DIMENSIONS.idle };
let animStartTime = 0;
let animDuration = 260;
let animTimer = null;

// Persistent settings state shared between Dynamic Island & TwoCode Settings window
let userSettings = {
  userName: os.userInfo().username || 'User',
  googleConnected: false,
  googleEmail: '',
  apps: [],
  islandOpenMode: 'On hover',
  outfit: 'Best',
  eyeColorHex: '#ffffff',
};

function getSettingsFilePath() {
  return path.join(app.getPath('userData'), 'twocode-settings.json');
}

const API_KEY_SETTING_NAMES = [
  'claudeApiKey',
  'codexApiKey',
  'openaiApiKey',
  'geminiApiKey',
  'antigravityApiKey',
];

function settingsForDisk(settings) {
  const stored = { ...settings };
  const encryptedApiKeys = [];
  if (safeStorage.isEncryptionAvailable()) {
    for (const name of API_KEY_SETTING_NAMES) {
      if (typeof stored[name] !== 'string' || !stored[name]) continue;
      stored[name] = safeStorage.encryptString(stored[name]).toString('base64');
      encryptedApiKeys.push(name);
    }
  }
  stored.encryptedApiKeys = encryptedApiKeys;
  return stored;
}

function restoreApiKeysFromDisk(settings) {
  const restored = { ...settings };
  const encryptedApiKeys = Array.isArray(restored.encryptedApiKeys)
    ? restored.encryptedApiKeys
    : [];
  for (const name of encryptedApiKeys) {
    if (!API_KEY_SETTING_NAMES.includes(name)) continue;
    if (!safeStorage.isEncryptionAvailable()) {
      delete restored[name];
      continue;
    }
    try {
      restored[name] = safeStorage.decryptString(Buffer.from(restored[name], 'base64'));
    } catch {
      delete restored[name];
    }
  }
  delete restored.encryptedApiKeys;
  return restored;
}

function loadSettingsFromDisk() {
  try {
    const p = getSettingsFilePath();
    if (fs.existsSync(p)) {
      const parsed = restoreApiKeysFromDisk(JSON.parse(fs.readFileSync(p, 'utf8')));
      if (Array.isArray(parsed.apps)) {
        parsed.apps = parsed.apps
          .filter((a) => !['yt', 'ghlp', 'gm'].includes(a.id))
          .map((a) => {
            if (a.url && (/^[a-zA-Z]:\\/i.test(a.url) || /\.(exe|lnk)$/i.test(a.url))) {
              return { ...a, path: a.url, type: 'native-app' };
            }
            return a;
          });
      }
      userSettings = { ...userSettings, ...parsed };
      fs.writeFileSync(p, JSON.stringify(settingsForDisk(userSettings), null, 2), 'utf8');
    }
  } catch {}
  return userSettings;
}

function saveSettingsToDisk(nextSettings) {
  userSettings = { ...userSettings, ...(nextSettings || {}) };
  if (Object.prototype.hasOwnProperty.call(nextSettings || {}, 'startWithWindows')) {
    applyStartWithWindows(userSettings.startWithWindows !== false);
  }
  try {
    fs.writeFileSync(
      getSettingsFilePath(),
      JSON.stringify(settingsForDisk(userSettings), null, 2),
      'utf8'
    );
  } catch {}
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings-updated', userSettings);
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('settings-updated', userSettings);
  }
  const startupMenuItem = trayContextMenu?.getMenuItemById('start-with-windows');
  if (startupMenuItem) startupMenuItem.checked = userSettings.startWithWindows !== false;
  return userSettings;
}

function applyStartWithWindows(enabled) {
  try {
    const options = { openAtLogin: Boolean(enabled), enabled: Boolean(enabled) };
    if (process.platform === 'win32') {
      options.path = process.execPath;
      options.args = app.isPackaged ? [] : [`"${app.getAppPath()}"`];
    }
    app.setLoginItemSettings(options);
    return true;
  } catch (error) {
    console.warn('Could not update Windows startup setting:', error?.message || error);
    return false;
  }
}

// Real local AI history state (Codex, Claude Code, Gemini CLI & Antigravity)
let localAgentHistory = {
  codexJobs: [],
  claudeJobs: [],
  geminiJobs: [],
  antigravityJobs: [],
  jobsToday: 2,
};

// Local-First Google Integration state (Zero hardcoded credentials, production ready)
let localGoogleState = {
  connected: false,
  account: '',
  calendarSync: true,
  newMailSync: true,
  mailAFile: true,
  mailCounts: {
    primary: 0,
    updates: 0,
    promotions: 0,
    unreadTotal: 0,
  },
  agenda: [],
  lastUpdated: 0,
};

function getGoogleSessionPath() {
  return path.join(app.getPath('userData'), 'google_session.json');
}

function loadGoogleSessionFromDisk() {
  try {
    const p = getGoogleSessionPath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (data && data.connected && data.account) {
        localGoogleState = { ...localGoogleState, ...data };
      }
    }
  } catch {}
  return localGoogleState;
}

function saveGoogleSessionToDisk(nextState) {
  localGoogleState = { ...localGoogleState, ...(nextState || {}) };
  try {
    fs.writeFileSync(getGoogleSessionPath(), JSON.stringify(localGoogleState, null, 2), 'utf8');
  } catch {}
  return localGoogleState;
}

function formatHHMMFromDate(d) {
  if (!d || isNaN(d.getTime())) return '02:49';
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function readLastBytesSync(filePath, maxBytes = 49152) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const stat = fs.fstatSync(fd);
    const length = Math.min(stat.size, maxBytes);
    const position = Math.max(0, stat.size - length);
    const buf = Buffer.alloc(length);
    fs.readSync(fd, buf, 0, length, position);
    fs.closeSync(fd);
    return buf.toString('utf8');
  } catch {
    return '';
  }
}

function loadLocalAiHistory() {
  const codexJobs = [];
  const claudeJobs = [];
  const geminiJobs = [];
  const antigravityJobs = [];
  let todayCount = 0;
  const todayStr = new Date().toDateString();

  // 1. Read ~/.codex/.codex-global-state.json for exact recent prompts
  try {
    const codexStatePath = path.join(os.homedir(), '.codex', '.codex-global-state.json');
    if (fs.existsSync(codexStatePath)) {
      const raw = JSON.parse(fs.readFileSync(codexStatePath, 'utf8'));
      const atomState = raw['electron-persisted-atom-state'] || {};
      const promptHist = atomState['prompt-history'] || {};
      const activityTimes = atomState['thread-user-activity-times-v1'] || {};

      const seenPrompts = new Set();
      const threadEntries = Object.entries(promptHist).filter(([k]) => k !== 'global');
      for (const [threadId, items] of threadEntries.reverse()) {
        if (!Array.isArray(items)) continue;
        const tsKey = Object.keys(activityTimes).find((k) => k.includes(threadId));
        const tsMs = tsKey ? activityTimes[tsKey] : Date.now();
        const timeStr = formatHHMMFromDate(new Date(tsMs));
        for (let i = items.length - 1; i >= 0; i--) {
          const text = (items[i]?.markdown || '').trim();
          if (text && !seenPrompts.has(text)) {
            seenPrompts.add(text);
            codexJobs.push({
              id: `codex_${threadId}_${i}`,
              agent: 'Codex',
              title: text,
              time: timeStr,
              status: 'done',
            });
          }
        }
      }
    }
  } catch {}

  // 2. Also read ~/.codex/session_index.jsonl (fast tail read)
  try {
    const sessionIdxPath = path.join(os.homedir(), '.codex', 'session_index.jsonl');
    if (fs.existsSync(sessionIdxPath)) {
      const lines = readLastBytesSync(sessionIdxPath, 16384)
        .split(/\r?\n/)
        .filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const item = JSON.parse(lines[i]);
          const dt = item.updated_at ? new Date(item.updated_at) : new Date();
          if (dt.toDateString() === todayStr) todayCount++;
          if (item.thread_name && codexJobs.length < 8) {
            const exists = codexJobs.some((j) => j.title === item.thread_name);
            if (!exists) {
              codexJobs.push({
                id: `codex_idx_${item.id || i}`,
                agent: 'Codex',
                title: item.thread_name,
                time: formatHHMMFromDate(dt),
                status: 'done',
              });
            }
          }
        } catch {}
      }
    }
  } catch {}

  // 3. Read ~/.claude/history.jsonl for real Claude Code prompts (fast tail read)
  try {
    const claudeHistPath = path.join(os.homedir(), '.claude', 'history.jsonl');
    if (fs.existsSync(claudeHistPath)) {
      const lines = readLastBytesSync(claudeHistPath, 32768)
        .split(/\r?\n/)
        .filter(Boolean);
      const seenClaude = new Set();
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]);
          const text = (entry.display || '').trim();
          if (!text || text.startsWith('/')) continue;
          const dt = entry.timestamp ? new Date(entry.timestamp) : new Date();
          if (dt.toDateString() === todayStr) todayCount++;
          if (!seenClaude.has(text) && claudeJobs.length < 10) {
            seenClaude.add(text);
            claudeJobs.push({
              id: `claude_${entry.timestamp || i}`,
              agent: 'Claude',
              title: text,
              time: formatHHMMFromDate(dt),
              status: 'done',
            });
          }
        } catch {}
      }
    }
  } catch {}

  // 4. Read Antigravity brain transcripts (~/.gemini/antigravity/brain/*/transcript.jsonl)
  try {
    const brainDir = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
    if (fs.existsSync(brainDir)) {
      const dirs = fs.readdirSync(brainDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .slice(-3);

      const seenAg = new Set();
      for (const d of dirs.reverse()) {
        const tPath = path.join(brainDir, d.name, '.system_generated', 'logs', 'transcript.jsonl');
        if (fs.existsSync(tPath)) {
          try {
            const lines = readLastBytesSync(tPath, 32768).split(/\r?\n/).filter(Boolean);
            for (let i = lines.length - 1; i >= 0; i--) {
              const line = lines[i];
              if (line.includes('USER_REQUEST')) {
                const parsed = JSON.parse(line);
                const content = parsed.content || '';
                const m = content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
                const reqText = (m ? m[1] : content).trim().replace(/\r?\n/g, ' ').slice(0, 120);
                if (reqText && !seenAg.has(reqText)) {
                  seenAg.add(reqText);
                  const dt = parsed.created_at ? new Date(parsed.created_at) : new Date();
                  if (dt.toDateString() === todayStr) todayCount++;
                  antigravityJobs.push({
                    id: `ag_${d.name}_${antigravityJobs.length}`,
                    agent: 'Antigravity',
                    title: reqText,
                    time: formatHHMMFromDate(dt),
                    status: 'done',
                  });
                  break;
                }
              }
            }
          } catch {}
        }
      }
    }
  } catch {}

  // 5. Read Gemini CLI history / sessions
  try {
    const geminiHistDir = path.join(os.homedir(), '.gemini', 'history');
    if (fs.existsSync(geminiHistDir)) {
      const entries = fs.readdirSync(geminiHistDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => ({
          name: e.name,
          time: fs.statSync(path.join(geminiHistDir, e.name)).mtimeMs,
        }))
        .sort((a, b) => b.time - a.time)
        .slice(0, 8);

      for (const e of entries) {
        const dt = new Date(e.time);
        if (dt.toDateString() === todayStr) todayCount++;
        geminiJobs.push({
          id: `gemini_${e.name}`,
          agent: 'Gemini',
          title: `Gemini CLI Session: ${e.name.length > 16 ? e.name.slice(0, 14) + '...' : e.name}`,
          time: formatHHMMFromDate(dt),
          status: 'done',
        });
      }
    }
  } catch {}

  localAgentHistory = {
    codexJobs: codexJobs.slice(0, 10),
    claudeJobs: claudeJobs.slice(0, 10),
    geminiJobs: geminiJobs.slice(0, 10),
    antigravityJobs: antigravityJobs.slice(0, 10),
    jobsToday: todayCount || (codexJobs.length + claudeJobs.length + geminiJobs.length + antigravityJobs.length),
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('ai-history-update', localAgentHistory);
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('ai-history-update', localAgentHistory);
  }
  return localAgentHistory;
}

function parseLrc(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return [];
  const lines = lrcText.split(/\r?\n/);
  const parsed = [];
  const offsetMatch = lrcText.match(/^\[offset:([+-]?\d+)\]/im);
  const offset = offsetMatch ? Number(offsetMatch[1]) / 1000 : 0;
  const timeRegex = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  for (const line of lines) {
    const text = line.replace(/\[[^\]]*\]/g, '').trim();
    if (!text) continue;
    let match;
    timeRegex.lastIndex = 0;
    while ((match = timeRegex.exec(line)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      const time = Math.max(0, min * 60 + sec + ms / 1000 + offset);
      parsed.push({
        time,
        text,
      });
    }
  }
  return parsed.sort((a, b) => a.time - b.time).filter((line, i, all) =>
    i === 0 || line.time > all[i - 1].time || line.text !== all[i - 1].text
  );
}

function normalizeLyricsMatch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(feat(?:uring)?|ft)\.?\b.*$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function queryLrclibGet(trackName, artistName) {
  return new Promise((resolve) => {
    if (!trackName) return resolve([]);
    const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName || '')}`;
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'TwoCode-DynamicIsland/1.0' }, timeout: 4000 },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data && data.syncedLyrics) {
              return resolve(parseLrc(data.syncedLyrics));
            }
          } catch {}
          resolve([]);
        });
      }
    );
    req.on('error', () => resolve([]));
    req.on('timeout', () => {
      req.destroy();
      resolve([]);
    });
  });
}

function queryLrclibSearch(q, expectedTitle, expectedArtist) {
  return new Promise((resolve) => {
    if (!q || !q.trim()) return resolve([]);
    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(q.trim())}`;
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'TwoCode-DynamicIsland/1.0' }, timeout: 4500 },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const arr = JSON.parse(body);
            if (Array.isArray(arr) && arr.length > 0) {
              const wantedTitle = normalizeLyricsMatch(expectedTitle);
              const wantedWords = new Set(wantedTitle.split(' ').filter((word) => word.length > 1));
              const wantedArtist = normalizeLyricsMatch(expectedArtist);
              const candidates = arr
                .filter((item) => item.syncedLyrics && item.trackName)
                .map((item) => {
                  const title = normalizeLyricsMatch(item.trackName);
                  const artist = normalizeLyricsMatch(item.artistName);
                  const titleWords = title.split(' ').filter((word) => word.length > 1);
                  const overlap = titleWords.filter((word) => wantedWords.has(word)).length;
                  const titleScore = wantedWords.size ? overlap / wantedWords.size : 0;
                  const artistMatch = !wantedArtist || !artist || artist === wantedArtist || artist.includes(wantedArtist) || wantedArtist.includes(artist);
                  return { item, titleScore, artistMatch, score: titleScore + (artistMatch ? 0.25 : -1) };
                })
                .filter(({ titleScore, artistMatch }) => titleScore >= 0.75 && artistMatch)
                .sort((a, b) => b.score - a.score);
              const selected = candidates[0]?.item;
              if (selected?.syncedLyrics) return resolve(parseLrc(selected.syncedLyrics));
            }
          } catch {}
          resolve([]);
        });
      }
    );
    req.on('error', () => resolve([]));
    req.on('timeout', () => {
      req.destroy();
      resolve([]);
    });
  });
}

async function fetchLyricsFromLrclib(title, artist) {
  if (!title) return [];
  const cleanTitle = (title || '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\b(official|music|video|audio|lyric|lyrics|live|performance|hd|4k|klip|akustik)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanArtist = (artist || '')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/VEVO$/i, '')
    .trim();

  const cacheKey = `${cleanArtist}__${cleanTitle}`.toLowerCase();
  if (lyricsCacheMap.has(cacheKey)) {
    return lyricsCacheMap.get(cacheKey);
  }

  // 1. Direct GET endpoint (fastest, most accurate)
  if (cleanTitle) {
    const directRes = await queryLrclibGet(cleanTitle, cleanArtist);
    if (directRes && directRes.length > 0) {
      lyricsCacheMap.set(cacheKey, directRes);
      return directRes;
    }
  }

  // 2. Candidate queries from most specific to broadest
  const candidates = [];
  const noFt = cleanTitle.replace(/\b(ft\.?|feat\.?|featuring)\s+[^-]+/gi, ' ').replace(/\s+/g, ' ').trim();

  if (noFt.includes(' - ')) {
    const parts = noFt.split(' - ').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      candidates.push(`${parts[0]} ${parts[parts.length - 1]}`);
      candidates.push(parts[parts.length - 1]);
    }
  }
  if (cleanArtist && !noFt.toLowerCase().includes(cleanArtist.toLowerCase())) {
    candidates.push(`${cleanArtist} ${noFt}`);
  }
  if (cleanArtist && noFt) candidates.push(`${cleanArtist} ${noFt}`);

  const seen = new Set();
  for (const cand of candidates) {
    const key = cand.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const res = await queryLrclibSearch(cand, cleanTitle, cleanArtist);
    if (res && res.length > 0) {
      lyricsCacheMap.set(cacheKey, res);
      return res;
    }
  }
  return [];
}

let isPollingMedia = false;
function pollWindowsMedia(action = 'status') {
  return new Promise((resolve) => {
    if (isPollingMedia && action === 'status') {
      return resolve(lastMediaState);
    }
    isPollingMedia = true;
    const scriptPath = path.join(__dirname, 'win-media.ps1');
    const args = [
      '-WindowStyle',
      'Hidden',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      '-Action',
      action,
      '-LastTitle',
      cachedThumbnail ? lastMediaTitle || '' : '',
    ];

    execFile('powershell.exe', args, { timeout: 4000, windowsHide: true }, async (err, stdout) => {
      isPollingMedia = false;
      if (err || !stdout) {
        return resolve(lastMediaState);
      }
      try {
        const line = stdout.trim().split(/\r?\n/).pop();
        const data = JSON.parse(line);
        if (data && data.hasSession) {
          const titleChanged = data.title !== lastMediaTitle || data.artist !== lastMediaArtist;
          if (titleChanged) {
            lastMediaTitle = data.title;
            lastMediaArtist = data.artist || '';
            cachedLyrics = [];
            lyricsLookupKey = `${data.artist || ''}__${data.title || ''}`.toLowerCase();
            lyricsRequestId += 1;
            lastMediaState = { ...lastMediaState, lyrics: [] };
          }

          // 1. Resolve Cover Art (Windows SMTC or iTunes/Deezer fallback)
          if (data.thumbnail && data.thumbnail.startsWith('data:image/')) {
            cachedThumbnail = data.thumbnail;
          } else if (titleChanged || !cachedThumbnail) {
            fetchAlbumCover(data.title, data.artist).then((coverUrl) => {
              if (coverUrl && (!lastMediaState.thumbnail || lastMediaState.thumbnail !== coverUrl)) {
                cachedThumbnail = coverUrl;
                lastMediaState.thumbnail = coverUrl;
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('media-update', lastMediaState);
                }
                if (settingsWindow && !settingsWindow.isDestroyed()) {
                  settingsWindow.webContents.send('media-update', lastMediaState);
                }
              }
            });
          }

          // 2. Resolve Lyrics
          if (titleChanged || (!lyricsLookupKey && data.title)) {
            const requestId = lyricsRequestId;
            const requestedTitle = data.title;
            const requestedArtist = data.artist || '';
            fetchLyricsFromLrclib(requestedTitle, requestedArtist).then((lrc) => {
              if (
                requestId !== lyricsRequestId ||
                requestedTitle !== lastMediaTitle ||
                requestedArtist !== lastMediaArtist
              ) return;
              cachedLyrics = lrc || [];
              lastMediaState = { ...lastMediaState, lyrics: cachedLyrics };
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('media-update', lastMediaState);
              }
              if (settingsWindow && !settingsWindow.isDestroyed()) {
                settingsWindow.webContents.send('media-update', lastMediaState);
              }
            });
          }

          lastMediaState = {
            ...data,
            thumbnail: cachedThumbnail || data.thumbnail || '',
            lyrics: cachedLyrics,
          };
        } else {
          lastMediaState = { ...lastMediaState, hasSession: false, isPlaying: false };
        }
      } catch {}
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-update', lastMediaState);
      }
      if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.webContents.send('media-update', lastMediaState);
      }
      resolve(lastMediaState);
    });
  });
}

function handleIncomingHookPayload(payload, res) {
  const id = payload.id || 'req_' + Date.now();
  const hookEventName = payload.hook_event_name || payload.event || '';

  let mappedType = payload.type || 'working';
  if (hookEventName === 'PermissionRequest') mappedType = 'approval';
  else if (hookEventName === 'Stop' || hookEventName === 'SessionEnd' || payload.type === 'done') {
    mappedType = 'done';
    localAgentHistory.jobsToday++;
  }

  const promptTitle =
    payload.prompt ||
    payload.title ||
    payload.tool_name ||
    (payload.tool_input && (payload.tool_input.command || payload.tool_input.file_path)) ||
    hookEventName ||
    'Processing task...';

  const eventObj = {
    id,
    agent: payload.agent || (hookEventName ? 'Claude' : 'Codex'),
    type: mappedType,
    title: String(promptTitle).slice(0, 140),
    detail: payload.detail || '',
    command:
      payload.command ||
      (payload.tool_input && payload.tool_input.command) ||
      '',
    file:
      payload.file ||
      (payload.tool_input && payload.tool_input.file_path) ||
      '',
    timestamp: Date.now(),
    jobsToday: localAgentHistory.jobsToday,
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('agent-event', eventObj);
  }

  if (mappedType === 'approval' && (payload.wait || hookEventName === 'PermissionRequest')) {
    pendingApprovals.set(id, (approved) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id,
          approved,
          decision: approved ? 'approve' : 'block',
        })
      );
    });
    setTimeout(() => {
      if (pendingApprovals.has(id)) {
        pendingApprovals.delete(id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id, approved: false, timeout: true }));
      }
    }, 60000);
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, id }));
  }
}

function createAgentHttpListener(port) {
  const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    if (req.method === 'GET' && (req.url === '/api/status' || req.url.startsWith('/twocode-hook'))) {
      const remoteAddress = req.socket.remoteAddress || '';
      const isLoopback =
        remoteAddress === '127.0.0.1' ||
        remoteAddress === '::1' ||
        remoteAddress.startsWith('::ffff:127.');
      if (!isLoopback) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Local connections only' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, jobsToday: localAgentHistory.jobsToday }));
    }

    if (req.method === 'POST' && (req.url === '/api/agent' || req.url.startsWith('/twocode-hook'))) {
      const remoteAddress = req.socket.remoteAddress || '';
      const isLoopback =
        remoteAddress === '127.0.0.1' ||
        remoteAddress === '::1' ||
        remoteAddress.startsWith('::ffff:127.');
      if (!isLoopback) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Local connections only' }));
      }
      let body = '';
      let receivedBytes = 0;
      let requestTooLarge = false;
      req.on('data', (chunk) => {
        receivedBytes += chunk.length;
        if (receivedBytes > 1024 * 1024) {
          requestTooLarge = true;
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Request too large' }));
          req.destroy();
          return;
        }
        body += chunk;
      });
      req.on('end', () => {
        if (requestTooLarge) return;
        try {
          const payload = JSON.parse(body || '{}');
          handleIncomingHookPayload(payload, res);
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
        }
      });
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });

  server.on('error', () => {});
  server.listen(port, '0.0.0.0');
}

function startLocalAgentServers() {
  createAgentHttpListener(4242);
  createAgentHttpListener(47823);
}

function openOrFocusSettingsWindow(tabId = 'home') {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    if (tabId) {
      settingsWindow.webContents.send('navigate-settings-tab', tabId);
    }
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 940,
    minHeight: 620,
    center: true,
    show: true,
    frame: false,
    backgroundColor: '#060608',
    title: 'TwoCode Settings',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const distHtml = path.join(__dirname, '../dist/index.html');
  if (process.env.VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?window=settings`);
  } else if (fs.existsSync(distHtml)) {
    settingsWindow.loadFile(distHtml, { query: { window: 'settings' } });
  } else {
    settingsWindow.loadURL('http://localhost:5173/?window=settings');
  }

  settingsWindow.webContents.on('did-finish-load', () => {
    if (tabId) {
      settingsWindow.webContents.send('navigate-settings-tab', tabId);
    }
    settingsWindow.webContents.send('settings-updated', userSettings);
    settingsWindow.webContents.send('ai-history-update', localAgentHistory);
    settingsWindow.webContents.send('media-update', lastMediaState);
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createTray() {
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const isEyeLeft = x >= 4 && x <= 6 && y >= 5 && y <= 10;
      const isEyeRight = x >= 9 && x <= 11 && y >= 5 && y <= 10;
      if (isEyeLeft || isEyeRight) {
        buf[idx] = 255;
        buf[idx + 1] = 255;
        buf[idx + 2] = 255;
        buf[idx + 3] = 255;
      } else {
        buf[idx] = 15;
        buf[idx + 1] = 15;
        buf[idx + 2] = 18;
        buf[idx + 3] = 255;
      }
    }
  }
  const icon = nativeImage.createFromBuffer(buf, { width: size, height: size });
  tray = new Tray(icon);
  tray.setToolTip('TwoCode');
  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.webContents.send('notch-hover-change', true);
    }
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'TwoCode',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Open the island\tAlt+Ctrl+T',
      accelerator: 'Alt+CommandOrControl+T',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.show();
        mainWindow.webContents.send('notch-hover-change', true);
      },
    },
    {
      label: 'Tuck the island away / back\tAlt+Ctrl+H',
      accelerator: 'Alt+CommandOrControl+H',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.webContents.send('notch-hover-change', false);
      },
    },
    {
      label: 'Settings',
      click: () => openOrFocusSettingsWindow('home'),
    },
    {
      label: 'Set up TwoCode...',
      click: () => openOrFocusSettingsWindow('connections'),
    },
    { type: 'separator' },
    {
      label: 'Start with Windows',
      id: 'start-with-windows',
      type: 'checkbox',
      checked: userSettings.startWithWindows !== false,
      click: (item) => {
        saveSettingsToDisk({ startWithWindows: item.checked });
      },
    },
    {
      label: 'Safe graphics (fixes a black box)',
      type: 'checkbox',
      checked: true,
    },
    {
      label: 'Graphics card',
      submenu: [
        { label: 'Default', type: 'radio', checked: true },
        { label: 'Discrete GPU (NVIDIA / AMD)', type: 'radio', checked: false },
        { label: 'Integrated GPU', type: 'radio', checked: false },
      ],
    },
    { type: 'separator' },
    {
      label: 'Restart',
      click: () => {
        app.relaunch();
        app.exit(0);
      },
    },
    {
      label: 'Quit TwoCode',
      click: () => app.quit(),
    },
  ]);
  trayContextMenu = contextMenu;
  tray.setContextMenu(contextMenu);
}

function addSingleNotchRects(rects, offsetX, bodyWidth, height, earRadius, bottomRadius) {
  const bW = Math.round(bodyWidth);
  const h = Math.round(height);
  const eR = Math.round(earRadius);
  const bR = Math.round(bottomRadius);
  const totalWidth = bW + eR * 2;
  const rTop = Math.min(eR, Math.floor(h / 2));
  const rBot = Math.min(bR, Math.floor(bW / 2), Math.floor(h / 2));

  for (let y = 0; y < rTop; y++) {
    const dy = rTop - (y + 0.5);
    const leftX = Math.round(Math.sqrt(Math.max(0, rTop * rTop - dy * dy)));
    const rowWidth = Math.max(0, totalWidth - leftX * 2);
    if (rowWidth > 0) {
      rects.push({ x: offsetX + leftX, y, width: rowWidth, height: 1 });
    }
  }

  const midHeight = h - rBot - rTop;
  if (midHeight > 0) {
    rects.push({ x: offsetX + eR, y: rTop, width: bW, height: midHeight });
  }

  for (let dy = 0; dy < rBot; dy++) {
    const y = h - rBot + dy;
    const distY = dy + 0.5;
    const inset = Math.round(rBot - Math.sqrt(Math.max(0, rBot * rBot - distY * distY)));
    const leftX = offsetX + eR + inset;
    const rowWidth = Math.max(0, bW - inset * 2);
    if (rowWidth > 0) {
      rects.push({ x: leftX, y, width: rowWidth, height: 1 });
    }
  }
}

function buildNotchShapeRects(bodyWidth, height, earRadius, bottomRadius, droplet = 0) {
  const bW = Math.round(bodyWidth);
  const h = Math.round(height);
  const eR = Math.round(earRadius);
  const bR = Math.round(bottomRadius);
  const totalWidth = bW + eR * 2;
  const offsetX = Math.round((CANVAS_WIDTH - totalWidth) / 2);
  const rects = [];

  addSingleNotchRects(rects, offsetX, bW, h, eR, bR);

  // Detached top-bezel circular media droplet to the right when Focus timer + Media are both active
  if (droplet > 0.05) {
    const dBW = Math.round(32 * droplet);
    const dH = Math.round(26 * droplet);
    const dER = Math.round(8 * droplet);
    const dBR = Math.round(13 * droplet);
    const dropletOffsetX = offsetX + totalWidth + 8;
    addSingleNotchRects(rects, dropletOffsetX, dBW, dH, dER, dBR);
  }

  return { rects, totalWidth, height: h, offsetX };
}

function applyShapeImmediate(shapeObj) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const { rects } = buildNotchShapeRects(
    shapeObj.bodyWidth,
    shapeObj.height,
    shapeObj.earRadius,
    shapeObj.bottomRadius,
    shapeObj.droplet || 0
  );
  try {
    mainWindow.setShape(rects);
  } catch {}
}

function animateWindowShapeToMode(modeOrExpanded, customBodyWidth) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const modeKey =
    typeof modeOrExpanded === 'string' && MODE_DIMENSIONS[modeOrExpanded]
      ? modeOrExpanded
      : modeOrExpanded
      ? 'expanded'
      : 'idle';

  currentModeKey = modeKey;
  const baseTarget = MODE_DIMENSIONS[modeKey];
  const target = {
    ...baseTarget,
    bodyWidth:
      modeKey === 'music-bar' && typeof customBodyWidth === 'number' && customBodyWidth >= 200
        ? Math.min(322, Math.max(222, Math.round(customBodyWidth)))
        : baseTarget.bodyWidth,
  };

  animStartShape = { ...currentShape };
  animTargetShape = { ...target };
  animStartTime = Date.now();
  animDuration = modeKey === 'expanded' ? 270 : 240;

  if (animTimer) clearInterval(animTimer);

  animTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      clearInterval(animTimer);
      animTimer = null;
      return;
    }
    const elapsed = Date.now() - animStartTime;
    const t = Math.min(1, elapsed / animDuration);
    const ease = 1 - Math.pow(1 - t, 3.2);

    currentShape = {
      bodyWidth: animStartShape.bodyWidth + (animTargetShape.bodyWidth - animStartShape.bodyWidth) * ease,
      height: animStartShape.height + (animTargetShape.height - animStartShape.height) * ease,
      earRadius: animStartShape.earRadius + (animTargetShape.earRadius - animStartShape.earRadius) * ease,
      bottomRadius:
        animStartShape.bottomRadius + (animTargetShape.bottomRadius - animStartShape.bottomRadius) * ease,
      droplet:
        (animStartShape.droplet || 0) + ((animTargetShape.droplet || 0) - (animStartShape.droplet || 0)) * ease,
    };

    applyShapeImmediate(currentShape);

    if (t >= 1) {
      clearInterval(animTimer);
      animTimer = null;
    }
  }, 16);
}

function startCursorHoverWatcher() {
  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) return;
    if (userSettings.islandOpenMode === 'On click' && currentModeKey !== 'expanded') return;
    try {
      const pt = screen.getCursorScreenPoint();
      const winBounds = mainWindow.getBounds();
      const relX = pt.x - winBounds.x;
      const relY = pt.y - winBounds.y;

      const activeTotalWidth = currentShape.bodyWidth + currentShape.earRadius * 2;
      const leftEdge = (CANVAS_WIDTH - activeTotalWidth) / 2;
      const rightEdge = leftEdge + activeTotalWidth;

      const padX = currentModeKey === 'expanded' ? 14 : 6;
      const padY = currentModeKey === 'expanded' ? 14 : 6;

      const dropletExtra = currentShape.droplet > 0.05 ? 56 : 0;
      const insideActiveNotch =
        relY >= -4 &&
        relY <= currentShape.height + padY &&
        relX >= leftEdge - padX &&
        relX <= rightEdge + dropletExtra + padX;

      if (insideActiveNotch && !isHoveringNotch) {
        isHoveringNotch = true;
        if (leaveTimer) {
          clearTimeout(leaveTimer);
          leaveTimer = null;
        }
        mainWindow.webContents.send('notch-hover-change', true);
      } else if (!insideActiveNotch && isHoveringNotch) {
        isHoveringNotch = false;
        if (leaveTimer) clearTimeout(leaveTimer);
        leaveTimer = setTimeout(() => {
          if (!isHoveringNotch && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('notch-hover-change', false);
          }
        }, 180);
      }
    } catch {}
  }, 60);
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.bounds;
  const x = Math.round((screenWidth - CANVAS_WIDTH) / 2);

  mainWindow = new BrowserWindow({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    x,
    y: 0,
    show: true,
    frame: false,
    thickFrame: false,
    transparent: false,
    backgroundColor: '#000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  applyShapeImmediate(currentShape);

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.moveTop();
    mainWindow.webContents.send('ai-history-update', localAgentHistory);
    mainWindow.webContents.send('settings-updated', userSettings);
    console.log(
      '✓ TwoCode Dynamic Island yüklendi ve ekranda gösteriliyor! Bounds:',
      JSON.stringify(mainWindow.getBounds())
    );
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[RENDERER ${level}] ${message} (${sourceId}:${line})`);
  });

  const distHtml = path.join(__dirname, '../dist/index.html');
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (fs.existsSync(distHtml)) {
    mainWindow.loadFile(distHtml);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }
}

function registerGlobalShortcuts() {
  try {
    globalShortcut.register('CommandOrControl+Alt+T', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.webContents.send('notch-hover-change', true);
      }
    });
    globalShortcut.register('CommandOrControl+Alt+H', () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (mainWindow.isVisible()) mainWindow.hide();
      else mainWindow.showInactive();
    });
  } catch {}
}

let systemWatcherProc = null;

function startSystemWatcher() {
  try {
    const watcherScript = path.join(__dirname, 'win-system-watcher.ps1');
    systemWatcherProc = spawn(
      'powershell.exe',
      ['-WindowStyle', 'Hidden', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', watcherScript],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }
    );
    let buffer = '';
    const watcherStartedAt = Date.now();
    systemWatcherProc.stdout.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;
        try {
          const ev = JSON.parse(trimmed);
          if (!mainWindow || mainWindow.isDestroyed()) continue;
          // Suppress any volume HUD popup during startup grace period (first 4.5 seconds)
          const isStartupGrace = Date.now() - watcherStartedAt < 4500;
          if (ev.event === 'init-audio') {
            mainWindow.webContents.send('system-hud', {
              type: 'init-audio',
              value: typeof ev.volume === 'number' ? ev.volume : ev.value,
              muted: Boolean(ev.muted),
              isInit: true,
            });
          } else if (ev.event === 'volume') {
            if (!isStartupGrace) {
              mainWindow.webContents.send('system-hud', {
                type: 'volume',
                value: ev.value,
                muted: Boolean(ev.muted),
                isInit: false,
              });
            }
          } else if (ev.event === 'brightness') {
            if (!isStartupGrace) {
              mainWindow.webContents.send('system-hud', {
                type: 'brightness',
                value: ev.value,
                isInit: false,
              });
            }
          } else if (ev.event === 'notification') {
            const isEmail = /gmail|outlook|mail|posta/i.test(`${ev.app || ''} ${ev.appId || ''} ${ev.title || ''}`);
            if (isEmail && localGoogleState.connected) {
              localGoogleState.mailCounts.primary = (localGoogleState.mailCounts.primary || 0) + 1;
              localGoogleState.mailCounts.unreadTotal = (localGoogleState.mailCounts.unreadTotal || 0) + 1;
              localGoogleState.latestMails = [
                {
                  id: 'm_' + Date.now(),
                  from: ev.title || 'Google Mail',
                  subject: ev.body || 'Yeni e-posta alındı',
                  time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                },
                ...(localGoogleState.latestMails || []),
              ].slice(0, 10);
              mainWindow.webContents.send('google-data-update', localGoogleState);
            }
            mainWindow.webContents.send('windows-notification', {
              id: ev.id,
              app: isEmail ? 'Gmail' : ev.app || 'Windows',
              appId: ev.appId || '',
              logo: ev.logo || '',
              sender: ev.sender || '',
              profileImage: ev.profileImage || ev.avatar || '',
              notificationKind: ev.notificationKind || '',
              callKind: ev.callKind || '',
              targetUrl: ev.targetUrl || '',
              title: ev.title || ev.app || 'Notification',
              body: ev.body || '',
            });
          }
        } catch {}
      }
    });
    systemWatcherProc.on('error', () => {});
  } catch {}
}

app.on('will-quit', () => {
  if (systemWatcherProc) {
    try {
      systemWatcherProc.kill();
    } catch {}
  }
  if (bgGoogleWorker && !bgGoogleWorker.isDestroyed()) {
    try {
      bgGoogleWorker.destroy();
    } catch {}
    bgGoogleWorker = null;
  }
  if (bgCalendarWorker && !bgCalendarWorker.isDestroyed()) {
    try {
      bgCalendarWorker.destroy();
    } catch {}
    bgCalendarWorker = null;
  }
});

app.whenReady().then(() => {
  loadSettingsFromDisk();
  applyStartWithWindows(userSettings.startWithWindows !== false);
  loadSavedGoogleSession();
  createWindow();
  createTray();
  startLocalAgentServers();
  startCursorHoverWatcher();
  startSystemWatcher();
  registerGlobalShortcuts();
  startGoogleMailAndAgendaWatcher();

  setTimeout(() => loadLocalAiHistory(), 100);
  // External CLI histories change occasionally; avoid repeatedly parsing large state files.
  setInterval(() => loadLocalAiHistory(), 15000);

  setTimeout(() => pollWindowsMedia('status'), 600);
  setInterval(() => pollWindowsMedia('status'), 3000);

  try {
    lastClipboardText = clipboard.readText() || '';
  } catch {}

  setInterval(() => {
    try {
      const txt = clipboard.readText();
      if (txt && txt.trim() && txt !== lastClipboardText) {
        lastClipboardText = txt;
        clipboardHistory = [
          {
            id: Date.now(),
            text: txt.slice(0, 600),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          },
          ...clipboardHistory.filter((item) => item.text !== txt),
        ].slice(0, 25);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('clipboard-update', clipboardHistory);
        }
      }
    } catch {}
  }, 1000);
});

ipcMain.on('set-ignore-mouse-events', (_event, _ignore) => {});

ipcMain.on('set-expanded', (_event, expanded) => {
  animateWindowShapeToMode(Boolean(expanded));
});

ipcMain.on('set-island-mode', (_event, mode, customWidth) => {
  animateWindowShapeToMode(mode, customWidth);
});

ipcMain.handle('open-settings-window', (_event, tabId) => {
  openOrFocusSettingsWindow(tabId || 'home');
  return true;
});

ipcMain.on('settings-window-control', (_event, action) => {
  if (!settingsWindow || settingsWindow.isDestroyed()) return;
  if (action === 'minimize') settingsWindow.minimize();
  else if (action === 'maximize') {
    if (settingsWindow.isMaximized()) settingsWindow.unmaximize();
    else settingsWindow.maximize();
  } else if (action === 'close') {
    settingsWindow.close();
  }
});

ipcMain.handle('get-settings', async () => {
  return userSettings;
});

ipcMain.handle('save-settings', async (_event, nextSettings) => {
  return saveSettingsToDisk(nextSettings);
});

ipcMain.handle('pick-program-file', async () => {
  try {
    const res = await dialog.showOpenDialog(settingsWindow || mainWindow, {
      title: 'Choose a program',
      properties: ['openFile'],
      filters: [
        { name: 'Programs & Shortcuts', extensions: ['exe', 'lnk', 'bat', 'cmd'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (!res.canceled && res.filePaths && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
  } catch {}
  return null;
});

ipcMain.on('trigger-island-emotion', (_event, emotion) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('island-emotion', emotion);
  }
});

ipcMain.on('trigger-test-notification', (_event, notif) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('windows-notification', {
      id: 'notif_' + Date.now(),
      app: 'TwoCode',
      title: notif?.title || 'Claude Code is done',
      body: notif?.subtitle || 'checkout: Fixed the checkout total',
    });
  }
});

ipcMain.handle('get-ai-history', async () => {
  return loadLocalAiHistory();
});

ipcMain.handle('media-control', async (_event, action) => {
  return await pollWindowsMedia(action);
});

ipcMain.handle('launch-music-service', async (_event, service) => {
  const appData = process.env.APPDATA || '';
  const localAppData = process.env.LOCALAPPDATA || '';

  if (service === 'spotify') {
    const candidatePaths = [
      path.join(appData, 'Spotify', 'Spotify.exe'),
      path.join(localAppData, 'Microsoft', 'WindowsApps', 'Spotify.exe'),
      path.join(localAppData, 'Spotify', 'Spotify.exe'),
      path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Spotify.lnk'),
    ];
    for (const p of candidatePaths) {
      if (p && fs.existsSync(p)) {
        await shell.openPath(p);
        return { launched: 'app', service: 'spotify' };
      }
    }

    // Also check if Windows Store Spotify or spotify: URI handler is installed
    return await new Promise((resolve) => {
      execFile(
        'powershell.exe',
        [
          '-WindowStyle',
          'Hidden',
          '-NoProfile',
          '-Command',
          'if ((Test-Path "HKCU:\\Software\\Classes\\spotify") -or (Test-Path "HKCR:\\spotify") -or (Get-AppxPackage -Name "*Spotify*" -ErrorAction SilentlyContinue)) { Write-Output "INSTALLED" } else { Write-Output "NONE" }',
        ],
        { windowsHide: true, timeout: 2500 },
        (_err, stdout) => {
          if ((stdout || '').includes('INSTALLED')) {
            shell.openExternal('spotify:');
            resolve({ launched: 'app', service: 'spotify' });
          } else {
            shell.openExternal('https://open.spotify.com');
            resolve({ launched: 'web', service: 'spotify' });
          }
        }
      );
    });
  }

  if (service === 'ytmusic') {
    const candidatePaths = [
      path.join(localAppData, 'Programs', 'youtube-music', 'YouTube Music.exe'),
      path.join(localAppData, 'YouTube Music', 'YouTube Music.exe'),
      path.join(localAppData, 'Programs', 'YouTube Music Desktop App', 'YouTube Music Desktop App.exe'),
      path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Chrome Apps', 'YouTube Music.lnk'),
      path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Edge Apps', 'YouTube Music.lnk'),
      path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'YouTube Music.lnk'),
    ];
    for (const p of candidatePaths) {
      if (p && fs.existsSync(p)) {
        await shell.openPath(p);
        return { launched: 'app', service: 'ytmusic' };
      }
    }
    await shell.openExternal('https://music.youtube.com');
    return { launched: 'web', service: 'ytmusic' };
  }

  return { launched: 'none' };
});

ipcMain.handle('get-media-status', async () => {
  return lastMediaState;
});

ipcMain.handle('copy-text', (_event, text) => {
  lastClipboardText = text || '';
  clipboard.writeText(text || '');
  return true;
});

ipcMain.handle('open-external', (_event, url) => {
  if (url && /^https?:\/\//i.test(url)) {
    shell.openExternal(url);
  } else if (url) {
    shell.openPath(url);
  }
  return true;
});

ipcMain.handle('open-notification-target', async (_event, target = {}) => {
  try {
    if (typeof target.url === 'string' && target.url) {
      const parsed = new URL(target.url);
      if (!['https:', 'http:'].includes(parsed.protocol)) return false;
      await shell.openExternal(parsed.toString());
      return true;
    }
    if (typeof target.appId === 'string' && /^[\w.!-]+$/.test(target.appId)) {
      const { execFile } = require('node:child_process');
      await new Promise((resolve, reject) => execFile('explorer.exe', [`shell:AppsFolder\\${target.appId}`], (error) => error ? reject(error) : resolve()));
      return true;
    }
  } catch (error) {
    console.warn('Could not open notification target:', error.message);
  }
  return false;
});

ipcMain.handle('capture-screen', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 960, height: 540 },
    });
    if (sources && sources.length > 0) {
      return sources[0].thumbnail.toDataURL();
    }
  } catch {}
  return null;
});

ipcMain.handle('get-system-stats', async () => {
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const memUsagePercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
  return {
    memUsagePercent,
    uptimeSeconds: Math.floor(os.uptime()),
    jobsToday: localAgentHistory.jobsToday,
  };
});

ipcMain.handle('resolve-agent-approval', (_event, { id, approved }) => {
  if (pendingApprovals.has(id)) {
    const resolver = pendingApprovals.get(id);
    pendingApprovals.delete(id);
    resolver(Boolean(approved));
  }
  if (approved) {
    localAgentHistory.jobsToday++;
  }
  return { ok: true, jobsToday: localAgentHistory.jobsToday };
});

ipcMain.handle('simulate-agent-task', (_event, type) => {
  if (type === 'done') {
    localAgentHistory.jobsToday++;
  }
  return { jobsToday: localAgentHistory.jobsToday };
});

ipcMain.handle('adjust-volume', (_event, direction) => {
  const keyChar = direction === 'up' ? '[char]175' : direction === 'down' ? '[char]174' : '[char]173';
  execFile(
    'powershell.exe',
    ['-WindowStyle', 'Hidden', '-NoProfile', '-Command', `(New-Object -ComObject WScript.Shell).SendKeys(${keyChar})`],
    { windowsHide: true },
    () => {}
  );
  return true;
});

ipcMain.handle('toggle-radio', async (_event, kind) => {
  if (kind !== 'Wifi' && kind !== 'Bluetooth') {
    return { success: false, error: 'Unknown radio type.' };
  }
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'win-radio.ps1');
    execFile(
      'powershell.exe',
      ['-WindowStyle', 'Hidden', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Action', 'Toggle', '-Kind', kind],
      { windowsHide: true, timeout: 12000 },
      (err, stdout) => {
        try {
          const result = JSON.parse((stdout || '').trim().split(/\r?\n/).pop());
          if (err && result.success) return resolve({ success: false, error: err.message });
          resolve(result);
        } catch {
          resolve({ success: false, error: err?.message || 'Windows radio control returned no status.' });
        }
      }
    );
  });
});

ipcMain.handle('get-radio-states', async () => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'win-radio.ps1');
    const readState = (kind) => new Promise((done) => {
      execFile(
        'powershell.exe',
        ['-WindowStyle', 'Hidden', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Action', 'Status', '-Kind', kind],
        { windowsHide: true, timeout: 9000 },
        (_err, stdout) => {
          try { done(JSON.parse((stdout || '').trim().split(/\r?\n/).pop())); }
          catch { done({ success: false, kind, error: 'Could not read radio state.' }); }
        }
      );
    });
    Promise.all([readState('Wifi'), readState('Bluetooth')]).then(([wifi, bluetooth]) => {
      resolve({
        wifiState: wifi.success ? wifi.state : null,
        bluetoothState: bluetooth.success ? bluetooth.state : null,
        error: wifi.error || bluetooth.error || null,
      });
    });
  });
});

ipcMain.handle('scan-wifi-networks', async () => {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-WindowStyle', 'Hidden', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'win-wifi-scan.ps1'), '-Action', 'Scan'],
      { windowsHide: true, timeout: 12000 },
      (err, stdout) => {
        try {
          const result = JSON.parse((stdout || '').trim().split(/\r?\n/).pop());
          if (err && result.success) return resolve({ success: false, networks: [], error: err.message });
          if (result.error === 'WLAN_ACCESS_DENIED') {
            result.error = 'Windows bu uygulamanın Wi-Fi ağ taramasına erişmesine izin vermedi. WLAN hizmetini ve uygulama izinlerini kontrol edin.';
          } else if (result.error === 'WIFI_SCAN_FAILED') {
            result.error = 'Wi-Fi ağları taranamadı. Kablosuz ağ hizmetinin çalıştığını kontrol edip yeniden deneyin.';
          }
          resolve(result);
        } catch {
          resolve({ success: false, networks: [], error: err?.message || 'Wi-Fi ağ taraması başarısız oldu.' });
        }
      }
    );
  });
});

ipcMain.handle('scan-bluetooth-devices', async () => {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-WindowStyle', 'Hidden', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'win-bluetooth.ps1'), '-Action', 'Scan'],
      { windowsHide: true, timeout: 15000 },
      (err, stdout) => {
        try {
          const result = JSON.parse((stdout || '').trim().split(/\r?\n/).pop());
          if (err && result.success) return resolve({ success: false, devices: [], error: err.message });
          resolve(result);
        } catch {
          resolve({ success: false, devices: [], error: err?.message || 'Bluetooth cihaz taraması başarısız oldu.' });
        }
      }
    );
  });
});

ipcMain.handle('pair-bluetooth-device', async (_event, deviceId) => {
  if (typeof deviceId !== 'string' || !deviceId || deviceId.length > 2048) {
    return { success: false, error: 'Geçersiz Bluetooth cihazı.' };
  }
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-WindowStyle', 'Hidden', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'win-bluetooth.ps1'), '-Action', 'Pair', '-DeviceId', deviceId],
      { windowsHide: true, timeout: 16000 },
      (err, stdout) => {
        try {
          const result = JSON.parse((stdout || '').trim().split(/\r?\n/).pop());
          if (err && result.success) return resolve({ success: false, error: err.message });
          resolve(result);
        } catch {
          resolve({ success: false, error: err?.message || 'Bluetooth eşleştirme başarısız oldu.' });
        }
      }
    );
  });
});

ipcMain.handle('get-network-info', async () => {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      [
        '-WindowStyle',
        'Hidden',
        '-NoProfile',
        '-Command',
        '$ErrorActionPreference = "SilentlyContinue"; $wifiAdapter = Get-NetAdapter -Physical | Where-Object { $_.Status -eq "Up" -and ($_.NdisPhysicalMedium -eq 9 -or $_.InterfaceDescription -match "Wi-Fi|Wireless|802\.11") } | Select-Object -First 1; $wifiProfile = if ($wifiAdapter) { Get-NetConnectionProfile -InterfaceIndex $wifiAdapter.ifIndex | Select-Object -First 1 }; $ssid = ((netsh wlan show interfaces) | Select-String "^\\s*SSID\\s*:\\s*(.+)$" | Select-Object -First 1).Matches.Groups[1].Value.Trim(); $b = ((Get-Service bthserv).Status); @{ wifi = if ($wifiProfile) { $wifiProfile.Name } elseif ($ssid) { $ssid } else { "Bağlı değil" }; wifiConnected = [bool]($wifiAdapter -and $wifiProfile); bluetooth = if ($b -eq "Running") { "On" } else { "Off" } } | ConvertTo-Json -Compress',
      ],
      { windowsHide: true, timeout: 3000 },
      (_err, stdout) => {
        try {
          const res = JSON.parse(stdout.trim());
          resolve(res);
        } catch {
          resolve({ wifi: 'Bağlı değil', wifiConnected: false, bluetooth: 'On' });
        }
      }
    );
  });
});

ipcMain.handle('add-agenda-event', async (_event, evt) => {
  if (!evt || !evt.title) return localGoogleState;
  const now = new Date();
  const defaultTime = new Date(now.getTime() + 15 * 60 * 1000).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const newEvt = {
    id: 'evt_' + Date.now(),
    title: evt.title,
    time: evt.time || defaultTime,
    date: evt.date || 'Bugün',
    notified: false,
  };
  localGoogleState.agenda = [...(localGoogleState.agenda || []), newEvt];
  saveGoogleSessionToDisk(localGoogleState);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('google-data-update', localGoogleState);
    mainWindow.webContents.send('windows-notification', {
      id: 'notif_agenda_' + newEvt.id,
      app: 'Google Calendar',
      appId: 'com.google.calendar',
      logo: '',
      title: 'Ajandaya Eklendi: ' + newEvt.title,
      body: `Etkinlik planlandı (${newEvt.date} · ${newEvt.time})`,
    });
  }
  return localGoogleState;
});

// Google Background Mail & Calendar Worker
let lastCheckedGmailCount = -1;
let agendaNotifiedIds = new Set();
let bgGoogleWorker = null;
let bgCalendarWorker = null;

function startGoogleBackgroundWorker() {
  // Mail is paused; leave the worker implementation below for later.
  return;
  if (!localGoogleState || !localGoogleState.connected) return;

  const FIREFOX_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0';

  const authSession = session.fromPartition('persist:google_account_session');
  try {
    authSession.setUserAgent(FIREFOX_UA);
  } catch (e) {}

  // Strip Chromium headers
  try {
    authSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const reqHeaders = { ...details.requestHeaders };
      delete reqHeaders['sec-ch-ua'];
      delete reqHeaders['sec-ch-ua-mobile'];
      delete reqHeaders['sec-ch-ua-platform'];
      delete reqHeaders['sec-ch-ua-model'];
      delete reqHeaders['sec-ch-ua-platform-version'];
      delete reqHeaders['sec-ch-ua-full-version'];
      delete reqHeaders['sec-ch-ua-full-version-list'];
      reqHeaders['User-Agent'] = FIREFOX_UA;
      callback({ cancel: false, requestHeaders: reqHeaders });
    });
  } catch (e) {}

  // Allow web notifications permission
  try {
    authSession.setPermissionRequestHandler((_wc, permission, callback, details = {}) => {
      let requestingHost = '';
      try {
        requestingHost = new URL(details.requestingUrl || '').hostname;
      } catch {}
      const isGoogleOrigin =
        requestingHost === 'mail.google.com' || requestingHost === 'calendar.google.com';
      callback(permission === 'notifications' && isGoogleOrigin);
    });
  } catch (e) {}

  // 1. Gmail Background Worker Window (Hidden, keeps Gmail live)
  if (!bgGoogleWorker || bgGoogleWorker.isDestroyed()) {
    try {
      bgGoogleWorker = new BrowserWindow({
        show: false,
        width: 1024,
        height: 768,
        webPreferences: {
          partition: 'persist:google_account_session',
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'google-bg-preload.cjs'),
          backgroundThrottling: true,
        },
      });

      bgGoogleWorker.webContents.setUserAgent(FIREFOX_UA);
      bgGoogleWorker.loadURL('https://mail.google.com/mail/u/0/');

      bgGoogleWorker.webContents.on('console-message', (_event, level, message) => {
        console.log(`[Gmail Worker ${level}] ${message}`);
      });

      bgGoogleWorker.webContents.on('did-finish-load', () => {
        if (!bgGoogleWorker || bgGoogleWorker.isDestroyed()) return;
        const cur = bgGoogleWorker.webContents.getURL();
        console.log('✓ Gmail Worker loaded:', cur, '| Title:', bgGoogleWorker.webContents.getTitle());
      });

      bgGoogleWorker.on('closed', () => {
        bgGoogleWorker = null;
      });
    } catch (err) {
      console.error('Failed to start bgGoogleWorker:', err);
    }
  }

  // 2. Google Calendar Background Worker Window (Hidden, catches reminders)
  if (!bgCalendarWorker || bgCalendarWorker.isDestroyed()) {
    try {
      bgCalendarWorker = new BrowserWindow({
        show: false,
        width: 1024,
        height: 768,
        webPreferences: {
          partition: 'persist:google_account_session',
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'google-bg-preload.cjs'),
          backgroundThrottling: true,
        },
      });

      bgCalendarWorker.webContents.setUserAgent(FIREFOX_UA);
      bgCalendarWorker.loadURL('https://calendar.google.com/calendar/u/0/r');

      bgCalendarWorker.webContents.on('console-message', (_event, level, message) => {
        console.log(`[Calendar Worker ${level}] ${message}`);
      });

      bgCalendarWorker.webContents.on('did-finish-load', () => {
        if (!bgCalendarWorker || bgCalendarWorker.isDestroyed()) return;
        const cur = bgCalendarWorker.webContents.getURL();
        console.log('✓ Calendar Worker loaded:', cur, '| Title:', bgCalendarWorker.webContents.getTitle());
      });

      bgCalendarWorker.on('closed', () => {
        bgCalendarWorker = null;
      });
    } catch (err) {
      console.error('Failed to start bgCalendarWorker:', err);
    }
  }
}

let lastDispatchedMailKey = '';
let lastDispatchedMailTime = 0;

ipcMain.on('google-bg-new-mail', (_event, mailData) => {
  if (!mailData) return;
  const dedupKey = `${mailData.sender}__${mailData.subject}`;
  const now = Date.now();
  if (dedupKey === lastDispatchedMailKey && now - lastDispatchedMailTime < 6000) {
    return;
  }
  lastDispatchedMailKey = dedupKey;
  lastDispatchedMailTime = now;

  console.log('✓ LIVE GMAIL RECEIVED:', mailData.sender, mailData.subject);

  if (mailData.counts) {
    localGoogleState.mailCounts = { ...localGoogleState.mailCounts, ...mailData.counts };
  } else {
    localGoogleState.mailCounts.unreadTotal = mailData.unreadCount || (localGoogleState.mailCounts.unreadTotal || 0) + 1;
    localGoogleState.mailCounts.primary = localGoogleState.mailCounts.unreadTotal;
  }

  const mailItem = {
    id: mailData.id || ('m_' + Date.now()),
    from: mailData.sender || 'Google Mail',
    subject: mailData.subject || 'Yeni e-posta alındı',
    snippet: mailData.snippet || '',
    time: mailData.time || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  };
  localGoogleState.latestMails = [mailItem, ...(localGoogleState.latestMails || [])].slice(0, 10);
  saveGoogleSessionToDisk(localGoogleState);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('google-data-update', { ...localGoogleState });
    mainWindow.webContents.send('windows-notification', {
      id: 'notif_mail_' + Date.now(),
      app: 'Gmail',
      appId: 'com.google.gmail',
      logo: '',
      sender: mailData.sender || '',
      profileImage: mailData.senderPhoto || mailData.profileImage || '',
      notificationKind: 'message',
      targetUrl: 'https://mail.google.com/',
      title: `${mailData.sender} (Gmail)`,
      body: mailData.subject + (mailData.snippet ? ' — ' + mailData.snippet : ''),
    });
  }
});

ipcMain.on('google-bg-push-notification', (_event, notif) => {
  if (!notif) return;
  console.log('✓ GOOGLE PUSH NOTIF:', notif.title, notif.body);
  const isCal = /calendar|takvim|ajanda/i.test(`${notif.title} ${notif.body} ${notif.origin || ''}`);
  const appName = isCal ? 'Google Calendar' : 'Gmail';
  const appId = isCal ? 'com.google.calendar' : 'com.google.gmail';

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('windows-notification', {
      id: 'notif_push_' + Date.now(),
      app: appName,
      appId: appId,
      logo: notif.icon || '',
      sender: notif.sender || '',
      profileImage: notif.profileImage || notif.avatar || '',
      notificationKind: isCal ? 'event' : 'message',
      targetUrl: isCal ? 'https://calendar.google.com/' : 'https://mail.google.com/',
      title: notif.title || appName,
      body: notif.body || '',
    });
  }
});

ipcMain.on('google-bg-count-update', (_event, { counts, latestMail }) => {
  if (counts && typeof counts === 'object') {
    localGoogleState.mailCounts = { ...localGoogleState.mailCounts, ...counts };
    if (latestMail && (!localGoogleState.latestMails || localGoogleState.latestMails.length === 0)) {
      localGoogleState.latestMails = [
        {
          id: latestMail.id,
          from: latestMail.sender,
          subject: latestMail.subject,
          snippet: latestMail.snippet,
          time: latestMail.time || 'Bugün',
        },
      ];
    }
    saveGoogleSessionToDisk(localGoogleState);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('google-data-update', { ...localGoogleState });
    }
  }
});

function startGoogleMailAndAgendaWatcher() {
  // Initial worker trigger
  setTimeout(() => {
    if (localGoogleState && localGoogleState.connected) {
      startGoogleBackgroundWorker();
    }
  }, 1000);

  setInterval(() => {
    if (!localGoogleState || !localGoogleState.connected) return;

    // 1. Agenda event time reminder check (every 5 seconds)
    try {
      const now = new Date();
      const currentHHMM = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      if (Array.isArray(localGoogleState.agenda)) {
        for (const evt of localGoogleState.agenda) {
          if (!evt || agendaNotifiedIds.has(evt.id)) continue;
          if (evt.time) {
            const [h, m] = evt.time.split(':').map(Number);
            if (!isNaN(h) && !isNaN(m)) {
              const evtMinutes = h * 60 + m;
              if (Math.abs(currentMinutes - evtMinutes) <= 1 || currentHHMM === evt.time) {
                agendaNotifiedIds.add(evt.id);
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('windows-notification', {
                    id: 'notif_cal_due_' + evt.id,
                    app: 'Google Calendar',
                    appId: 'com.google.calendar',
                    logo: '',
                    title: 'Ajanda Hatırlatıcısı',
                    body: `${evt.title} (${evt.time}) vakti geldi!`,
                  });
                }
              }
            }
          }
        }
      }
    } catch (e) {}

    // 2. Ensure worker is running if connected
    if (localGoogleState.connected) {
      if (!bgGoogleWorker || bgGoogleWorker.isDestroyed()) {
        startGoogleBackgroundWorker();
      }
    }
  }, 5000);
}

ipcMain.handle('test-mail-notif', async () => {
  localGoogleState.mailCounts.unreadTotal = (localGoogleState.mailCounts.unreadTotal || 0) + 1;
  localGoogleState.mailCounts.primary = (localGoogleState.mailCounts.primary || 0) + 1;
  const newMail = {
    id: 'm_' + Date.now(),
    from: 'Google Güvenlik Ekibi',
    subject: 'Yeni e-posta alındı: İki faktörlü güvenlik ve hesap özeti.',
    time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  };
  localGoogleState.latestMails = [newMail, ...(localGoogleState.latestMails || [])].slice(0, 10);
  saveGoogleSessionToDisk(localGoogleState);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('google-data-update', localGoogleState);
    mainWindow.webContents.send('windows-notification', {
      id: 'notif_mail_' + Date.now(),
      app: 'Gmail',
      appId: 'com.google.gmail',
      logo: '',
      title: 'Google Mail (' + (localGoogleState.account || 'Gelen Kutusu') + ')',
      body: newMail.subject,
    });
  }
  return true;
});

ipcMain.handle('test-agenda-notif', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('windows-notification', {
      id: 'notif_agenda_' + Date.now(),
      app: 'Google Calendar',
      appId: 'com.google.calendar',
      logo: '',
      title: 'Ajanda Hatırlatıcısı',
      body: '15 dakika sonra: Haftalık Ekip Senkronizasyonu (14:30)',
    });
  }
  return true;
});

ipcMain.handle('get-file-icon', async (_event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const icon = await app.getFileIcon(filePath, { size: 'normal' });
    return icon ? icon.toDataURL() : null;
  } catch {
    return null;
  }
});

function getGoogleSessionFilePath() {
  return path.join(app.getPath('userData'), 'google_session.json');
}

function loadSavedGoogleSession() {
  try {
    const sPath = getGoogleSessionFilePath();
    if (fs.existsSync(sPath)) {
      const data = JSON.parse(fs.readFileSync(sPath, 'utf8'));
      if (data && data.account) {
        localGoogleState.connected = true;
        localGoogleState.account = data.account;
        localGoogleState.lastUpdated = data.lastUpdated || Date.now();
        if (data.mailCounts) {
          localGoogleState.mailCounts = { ...localGoogleState.mailCounts, ...data.mailCounts };
        }
        if (Array.isArray(data.agenda)) {
          localGoogleState.agenda = data.agenda;
        }
        if (Array.isArray(data.latestMails)) {
          localGoogleState.latestMails = data.latestMails;
        }
        userSettings.googleConnected = true;
        userSettings.googleEmail = data.account;
        setTimeout(() => {
          startGoogleBackgroundWorker();
        }, 800);
      }
    }
  } catch {}
}

function completeGoogleConnection(email) {
  const cleanEmail = (email || '').trim();
  if (!cleanEmail) return localGoogleState;

  localGoogleState.connected = true;
  localGoogleState.account = cleanEmail;
  localGoogleState.lastUpdated = Date.now();
  userSettings.googleConnected = true;
  userSettings.googleEmail = cleanEmail;
  saveUserSettings();

  try {
    fs.writeFileSync(
      getGoogleSessionFilePath(),
      JSON.stringify(
        {
          account: cleanEmail,
          agenda: localGoogleState.agenda,
          mailCounts: localGoogleState.mailCounts,
          lastUpdated: Date.now(),
        },
        null,
        2
      ),
      'utf8'
    );
  } catch {}

  // Trigger background live Gmail & Calendar worker
  setTimeout(() => {
    startGoogleBackgroundWorker();
  }, 300);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('google-data-update', localGoogleState);
    mainWindow.webContents.send('settings-updated', userSettings);
    mainWindow.webContents.send('windows-notification', {
      id: 'notif_g_' + Date.now(),
      app: 'Google',
      title: localGoogleState.account,
      body: 'Google hesabı başarıyla bağlandı. Mail ve Ajanda senkronize edildi.',
    });
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('google-data-update', localGoogleState);
    settingsWindow.webContents.send('settings-updated', userSettings);
  }
  return localGoogleState;
}

let googleAuthWindow = null;

ipcMain.handle('get-google-data', async () => {
  return localGoogleState;
});

ipcMain.handle('connect-google', async (_event, opts) => {
  const expectedEmail = (opts?.email || '').trim().toLowerCase();
  if (expectedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(expectedEmail)) {
    return { connected: false, message: 'INVALID_EMAIL' };
  }

  return new Promise((resolve) => {
    if (googleAuthWindow && !googleAuthWindow.isDestroyed()) {
      googleAuthWindow.focus();
      return resolve({ connected: false, message: 'ALREADY_OPEN' });
    }

    const FIREFOX_UA =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0';

    const authSession = session.fromPartition('persist:google_account_session');
    authSession.setUserAgent(FIREFOX_UA);

    // Strip Chromium client hints so Google sees standard Firefox without embedded Chromium checks
    try {
      authSession.webRequest.onBeforeSendHeaders((details, callback) => {
        const reqHeaders = { ...details.requestHeaders };
        delete reqHeaders['sec-ch-ua'];
        delete reqHeaders['sec-ch-ua-mobile'];
        delete reqHeaders['sec-ch-ua-platform'];
        delete reqHeaders['sec-ch-ua-model'];
        delete reqHeaders['sec-ch-ua-platform-version'];
        delete reqHeaders['sec-ch-ua-full-version'];
        delete reqHeaders['sec-ch-ua-full-version-list'];
        reqHeaders['User-Agent'] = FIREFOX_UA;
        callback({ cancel: false, requestHeaders: reqHeaders });
      });
    } catch (e) {}

    googleAuthWindow = new BrowserWindow({
      width: 520,
      height: 680,
      title: 'Google ile Giriş Yap - TwoCode',
      parent: settingsWindow && !settingsWindow.isDestroyed() ? settingsWindow : undefined,
      modal: false,
      autoHideMenuBar: true,
      backgroundColor: '#ffffff',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: 'persist:google_account_session',
      },
    });

    googleAuthWindow.webContents.setUserAgent(FIREFOX_UA);

    googleAuthWindow.webContents.setWindowOpenHandler(({ url }) => {
      googleAuthWindow.loadURL(url);
      return { action: 'deny' };
    });

    const googleLoginUrl =
      'https://accounts.google.com/ServiceLogin?service=mail&continue=https://mail.google.com/mail/u/0/' +
      (expectedEmail ? `&login_hint=${encodeURIComponent(expectedEmail)}` : '');
    googleAuthWindow.loadURL(googleLoginUrl, { userAgent: FIREFOX_UA });

    let isResolved = false;

    const tryExtractAccountAndComplete = async () => {
      if (isResolved || !googleAuthWindow || googleAuthWindow.isDestroyed()) return;
      try {
        const currentUrl = googleAuthWindow.webContents.getURL() || '';
        if (
          !currentUrl.includes('/ServiceLogin') &&
          !currentUrl.includes('/identifier') &&
          !currentUrl.includes('/challenge')
        ) {
          // If on myaccount, redirect to mail to establish gmail cookies
          if (currentUrl.includes('myaccount.google.com')) {
            googleAuthWindow.loadURL('https://mail.google.com/mail/u/0/');
            return;
          }

          const detectedEmail = await googleAuthWindow.webContents.executeJavaScript(`
            (() => {
              try {
                if (location.hostname !== 'mail.google.com') return null;
                const labels = Array.from(document.querySelectorAll('[aria-label]'))
                  .map((el) => el.getAttribute('aria-label') || '')
                  .filter((label) => /google account|google hesab/i.test(label));
                for (const label of labels) {
                  const m = label.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/);
                  if (m) return m[0];
                }
              } catch (e) {}
              return null;
            })()
          `);

          if (
            detectedEmail &&
            currentUrl.includes('mail.google.com') &&
            (!expectedEmail || detectedEmail.toLowerCase() === expectedEmail)
          ) {
            isResolved = true;
            const res = completeGoogleConnection(detectedEmail);
            setTimeout(() => {
              if (googleAuthWindow && !googleAuthWindow.isDestroyed()) {
                googleAuthWindow.close();
              }
            }, 800);
            return resolve(res);
          } else if (detectedEmail && !currentUrl.includes('mail.google.com')) {
            googleAuthWindow.loadURL('https://mail.google.com/mail/u/0/');
          }
        }
      } catch (err) {}
    };

    const pollInterval = setInterval(tryExtractAccountAndComplete, 500);

    googleAuthWindow.webContents.on('did-finish-load', () => {
      tryExtractAccountAndComplete();
    });

    googleAuthWindow.webContents.on('did-navigate', tryExtractAccountAndComplete);
    googleAuthWindow.webContents.on('did-navigate-in-page', tryExtractAccountAndComplete);

    googleAuthWindow.on('closed', () => {
      clearInterval(pollInterval);
      googleAuthWindow = null;
      if (!isResolved) {
        resolve(localGoogleState);
      }
    });
  });
});

ipcMain.handle('disconnect-google', async () => {
  localGoogleState.connected = false;
  localGoogleState.account = '';
  localGoogleState.lastUpdated = Date.now();
  userSettings.googleConnected = false;
  userSettings.googleEmail = '';
  saveUserSettings();

  try {
    const sPath = getGoogleSessionFilePath();
    if (fs.existsSync(sPath)) fs.unlinkSync(sPath);
  } catch {}

  if (bgGoogleWorker && !bgGoogleWorker.isDestroyed()) {
    try { bgGoogleWorker.destroy(); } catch {}
    bgGoogleWorker = null;
  }
  if (bgCalendarWorker && !bgCalendarWorker.isDestroyed()) {
    try { bgCalendarWorker.destroy(); } catch {}
    bgCalendarWorker = null;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('google-data-update', localGoogleState);
  }
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('google-data-update', localGoogleState);
  }
  return localGoogleState;
});

// Translation helper via MyMemory free API
function translateTextMyMemory(text, from = 'tr', to = 'en') {
  return new Promise((resolve) => {
    if (!text || !text.trim()) return resolve('');
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=${from}|${to}`;
    https
      .get(url, { timeout: 5000 }, (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => {
          try {
            const j = JSON.parse(b);
            if (j?.responseData?.translatedText) {
              return resolve(j.responseData.translatedText);
            }
          } catch {}
          resolve('');
        });
      })
      .on('error', () => resolve(''));
  });
}

// Google Gemini API query
function callGeminiApi(apiKey, prompt) {
  return (async () => {
    // Try the alias used by the app's documented/tested request first, then
    // progressively fall back to fast stable models if a model is busy.
    const models = ['gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    const payload = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Sen TwoCode Robo'sun; masaüstünde çalışan hızlı, yardımsever, akıllı ve arkadaş canlısı bir yapay zeka asistanısın. Türkçe konuş, kısa, net ve doğrudan cevaplar ver.\n\nKullanıcı sorusu: ${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 500,
      },
    });
    const retryableStatuses = new Set([404, 429, 500, 502, 503, 504]);
    for (let index = 0; index < models.length; index += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        // Electron's Chromium network stack follows the user's Windows proxy/PAC settings.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${models[index]}:generateContent`;
        const response = await net.fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: payload,
          signal: controller.signal,
        });
        const body = await response.text();
        let data;
        try { data = JSON.parse(body); } catch { throw new Error(`Gemini yanıtı çözümlenemedi (HTTP ${response.status}).`); }
        if (!response.ok) {
          const message = data?.error?.message || response.statusText || 'Gemini API isteği reddedildi.';
          if (retryableStatuses.has(response.status) && index < models.length - 1) continue;
          throw new Error(`${response.status}: ${message}`);
        }
        const answer = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
        if (!answer && data?.promptFeedback?.blockReason) {
          throw new Error(`İstek güvenlik filtresine takıldı (${data.promptFeedback.blockReason}).`);
        }
        return answer || '';
      } catch (error) {
        if (error?.name === 'AbortError') {
          if (index < models.length - 1) continue;
          throw new Error('TIMEOUT');
        }
        if (/fetch failed|network|proxy|socket|ECONNRESET|ENOTFOUND/i.test(error?.message || '') && index < models.length - 1) {
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }
    return '';
  })();
}

// Anthropic Claude API query
function callClaudeApi(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Sen TwoCode Robo'sun; masaüstünde çalışan hızlı, yardımsever, akıllı bir yapay zeka asistanısın. Türkçe konuş, kısa, net ve doğrudan cevaplar ver.\n\nKullanıcı sorusu: ${prompt}`,
        },
      ],
    });
    const req = https.request(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 10000,
      },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => {
          try {
            const j = JSON.parse(b);
            const text = j?.content?.[0]?.text;
            if (text) return resolve(text.trim());
            if (j?.error?.message) return reject(new Error(j.error.message));
          } catch (e) {
            return reject(e);
          }
          resolve('');
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('TIMEOUT'));
    });
    req.write(payload);
    req.end();
  });
}

// OpenAI API query
function callOpenAiApi(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            "Sen TwoCode Robo'sun; masaüstünde çalışan hızlı, yardımsever, akıllı bir yapay zeka asistanısın. Türkçe konuş, kısa, net ve doğrudan cevaplar ver.",
        },
        { role: 'user', content: prompt },
      ],
    });
    const req = https.request(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 10000,
      },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => {
          try {
            const j = JSON.parse(b);
            const text = j?.choices?.[0]?.message?.content;
            if (text) return resolve(text.trim());
            if (j?.error?.message) return reject(new Error(j.error.message));
          } catch (e) {
            return reject(e);
          }
          resolve('');
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('TIMEOUT'));
    });
    req.write(payload);
    req.end();
  });
}

function getLocalSmartReply(q, mode) {
  const lower = q.toLowerCase().trim();

  // 1. Math expressions (e.g. 15 * 8, 120 / 4)
  if (/^[\d\s\+\-\*\/\(\)\.\^\%]+$/.test(q) && /[\+\-\*\/]/.test(q)) {
    try {
      const sanitized = q.replace(/[^0-9\+\-\*\/\(\)\.\%]/g, '');
      const result = Function(`"use strict"; return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result)) {
        return `${q.trim()} = ${result}`;
      }
    } catch {}
  }

  // 2. Greetings & small talk
  if (lower === 'naber' || lower === 'ne haber' || lower.includes('naber')) {
    return 'İyidir, senden naber? Çalışmalar nasıl gidiyor? Sana bugün kodlama, çeviri veya sorularında yardımcı olabilirim!';
  }
  if (lower === 'nasılsın' || lower === 'nasilsin' || lower.includes('nasıl gidiyor')) {
    return 'Harikayım, teşekkürler! Her şey yolunda. Senin günün nasıl geçiyor?';
  }
  if (
    lower === 'merhaba' ||
    lower === 'selam' ||
    lower === 'slm' ||
    lower === 'hello' ||
    lower === 'hi'
  ) {
    return 'Merhaba! TwoCode Robo hazır. Aklındaki soruyu veya üzerinde çalıştığın konuyu yazabilirsin.';
  }
  if (lower.includes('günaydın') || lower.includes('gunaydin')) {
    return 'Günaydın! Harika ve çok verimli bir gün dilerim ☀️';
  }
  if (lower.includes('iyi akşamlar') || lower.includes('iyi aksamlar')) {
    return 'İyi akşamlar! Günün nasıl geçti? Dinlenirken veya çalışırken buradayım.';
  }
  if (
    lower.includes('kimsin') ||
    lower.includes('sen kimsin') ||
    lower.includes('adın ne') ||
    lower.includes('robo nedir')
  ) {
    return 'Ben TwoCode Robo! Masaüstünde çalışan akıllı yapay zeka asistanınım. Sorularını yanıtlayabilir, kodlama ve yazım hatalarında sana destek olabilirim.';
  }
  if (
    lower.includes('teşekkür') ||
    lower.includes('tesekkur') ||
    lower === 'sağol' ||
    lower === 'eyvallah'
  ) {
    return 'Rica ederim, her zaman buradayım! Kolay gelsin.';
  }

  // 3. Mode: Check my spelling
  if (
    mode === 'Check my spelling' ||
    lower.startsWith('yazımı düzelt') ||
    lower.startsWith('düzelt')
  ) {
    const commonTypos = {
      gelcem: 'geleceğim',
      yapcam: 'yapacağım',
      gidicez: 'gideceğiz',
      gelicez: 'geleceğiz',
      bugeun: 'bugün',
      herşey: 'her şey',
      herkez: 'herkes',
      yanlız: 'yalnız',
      yalnış: 'yanlış',
      tabiki: 'tabii ki',
      farketmez: 'fark etmez',
      saol: 'sağ ol',
      bişey: 'bir şey',
    };
    let corrected = q;
    for (const [wrong, right] of Object.entries(commonTypos)) {
      const reg = new RegExp(`\\b${wrong}\\b`, 'gi');
      corrected = corrected.replace(reg, right);
    }
    if (corrected !== q) {
      return `Düzeltilmiş metin: "${corrected}"`;
    }
    return `Yazım kontrol edildi, metniniz düzgün görünüyor: "${q}"`;
  }

  // 4. Programming knowledge lookup
  if (lower.includes('usestate')) {
    return 'useState, React bileşenlerinde yerel durum (state) tutmayı sağlayan temel bir Hook\'tur. [değer, setDeğer] şeklinde iki elemanlı dizi döner.';
  }
  if (lower.includes('useeffect')) {
    return 'useEffect, React bileşenlerinde yan etkileri (veri çekme, DOM güncelleme, abonelikler) yönetir. Bağımlılık dizisi ile ne zaman çalışacağı kontrol edilir.';
  }
  if (lower.includes('react')) {
    return 'React, Meta tarafından geliştirilen, kullanıcı arayüzleri oluşturmak için kullanılan popüler bir JavaScript kütüphanesidir. Bileşen (component) tabanlı mimariye sahiptir.';
  }
  if (lower.includes('python')) {
    return 'Python, okunabilirliği yüksek, geniş kütüphane ekosistemine sahip çok amaçlı ve popüler bir programlama dilidir. Veri bilimi, yapay zeka ve web geliştirmede yaygın kullanılır.';
  }
  if (lower.includes('docker')) {
    return 'Docker, uygulamaları ve bağımlılıklarını izole konteynerlar (container) içinde paketleyerek her ortamda tutarlı çalışmasını sağlayan bir platformdur.';
  }

  return null;
}

ipcMain.handle('ask-robo', async (_event, payload = {}) => {
  const { question, provider, mode } = payload || {};
  const q = (question || '').trim();
  if (!q) return { text: 'Lütfen bir soru veya metin girin.' };

  // Mode: Translate
  if (
    mode === 'Translate' ||
    q.toLowerCase().startsWith('çevir:') ||
    q.toLowerCase().startsWith('translate:')
  ) {
    const textToTranslate = q.replace(/^(çevir|translate):\s*/i, '');
    const isTurkish =
      /[çğıöşü]/i.test(textToTranslate) ||
      /^(merhaba|naber|nasılsın|bugün|evet|hayır|kitap|masa|gideceğiz|güzel)/i.test(textToTranslate);
    const from = isTurkish ? 'tr' : 'en';
    const to = isTurkish ? 'en' : 'tr';
    const translated = await translateTextMyMemory(textToTranslate, from, to);
    if (translated) {
      return { text: `Çeviri (${from.toUpperCase()} → ${to.toUpperCase()}):\n${translated}` };
    }
  }

  // Route only to the provider selected in Robo. Never disguise API failures as AI answers.
  const selected = String(provider || 'Claude').toLowerCase();
  const providers = {
    claude: {
      label: 'Claude',
      enabled: userSettings.claudeEnabled !== false,
      key: userSettings.claudeApiKey || process.env.ANTHROPIC_API_KEY,
      call: callClaudeApi,
      setup: 'Ayarlar > Connections bölümüne Claude API anahtarınızı ekleyin.',
    },
    codex: {
      label: 'OpenAI',
      enabled: userSettings.codexEnabled !== false,
      key: userSettings.codexApiKey || userSettings.openaiApiKey || process.env.OPENAI_API_KEY,
      call: callOpenAiApi,
      setup: 'Ayarlar > Connections bölümüne OpenAI API anahtarınızı ekleyin. Codex uygulama oturumu API erişimi sağlamaz.',
    },
    gemini: {
      label: 'Gemini',
      enabled: userSettings.geminiEnabled !== false,
      key: userSettings.geminiApiKey || process.env.GEMINI_API_KEY,
      call: callGeminiApi,
      setup: 'Ayarlar > Connections bölümüne Gemini API anahtarınızı ekleyin.',
    },
  };
  const selectedProvider = selected.includes('claude')
    ? providers.claude
    : selected.includes('codex') || selected.includes('openai')
    ? providers.codex
    : selected.includes('gemini')
    ? providers.gemini
    : null;

  if (!selectedProvider) {
    return { error: 'Bu sağlayıcı Robo sohbetinde desteklenmiyor. Claude, Codex veya Gemini seçin.' };
  }
  if (!selectedProvider.enabled) {
    return { error: `${selectedProvider.label} bağlantısı Ayarlar > Connections bölümünde kapalı.` };
  }
  if (!selectedProvider.key) {
    const localReply = getLocalSmartReply(q, mode);
    if (localReply) return { text: localReply, provider: 'Robo' };
    return { error: `${selectedProvider.label} için API anahtarı bulunamadı. ${selectedProvider.setup}` };
  }

  try {
    const reply = await selectedProvider.call(selectedProvider.key, q);
    if (reply) return { text: reply, provider: selectedProvider.label };
    return { error: `${selectedProvider.label} boş yanıt verdi. Tekrar deneyin.` };
  } catch (err) {
    console.error(`${selectedProvider.label} API call failed:`, err.message);
    const reason = /TIMEOUT/i.test(err.message)
      ? `${selectedProvider.label} hızlı model denemeleri 36 saniye içinde yanıt vermedi. İnternet/proxy bağlantınızı kontrol edip yeniden deneyin.`
      : /^(429|500|502|503|504):/.test(err.message)
        ? `${selectedProvider.label} şu anda yoğun. Otomatik yedek modeller de yanıt vermedi; birkaç dakika sonra yeniden deneyin.`
      : /401|403|API.?KEY.?INVALID|invalid API key|unauthorized/i.test(err.message)
        ? 'API anahtarı reddedildi. Sağlayıcı hesabındaki anahtarı kontrol edin.'
        : `API isteği başarısız oldu (${err.message}).`;
    return { error: `${selectedProvider.label}: ${reason}` };
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
