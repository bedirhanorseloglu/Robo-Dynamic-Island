const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const CHROMIUM_HISTORY_PATHS = () => {
  const local = process.env.LOCALAPPDATA || '';
  const roaming = process.env.APPDATA || '';
  const results = [
    path.join(roaming, 'Opera Software', 'Opera Stable', 'History'),
    path.join(roaming, 'Opera Software', 'Opera GX Stable', 'History'),
  ];
  const userDataRoots = [
    path.join(local, 'Google', 'Chrome', 'User Data'),
    path.join(local, 'Microsoft', 'Edge', 'User Data'),
    path.join(local, 'Perplexity', 'Comet', 'User Data'),
    path.join(local, 'BraveSoftware', 'Brave-Browser', 'User Data'),
    path.join(local, 'Vivaldi', 'User Data'),
    path.join(local, 'Chromium', 'User Data'),
  ];
  for (const root of userDataRoots) {
    try {
      if (!fs.existsSync(root)) continue;
      for (const entry of fs.readdirSync(root)) {
        if (entry === 'Default' || /^Profile\s+\d+$/i.test(entry)) {
          results.push(path.join(root, entry, 'History'));
        }
      }
    } catch {}
  }
  return results;
};

function getLatestMtime(basePath) {
  let latest = 0;
  for (const ext of ['', '-journal', '-wal']) {
    try {
      const p = basePath + ext;
      if (fs.existsSync(p)) {
        const m = fs.statSync(p).mtimeMs;
        if (m > latest) latest = m;
      }
    } catch {}
  }
  return latest;
}

function lookupChromiumTotalBytes(partialName, cleanName, callback) {
  try {
    const candidates = CHROMIUM_HISTORY_PATHS()
      .filter((p) => fs.existsSync(p))
      .map((p) => ({ path: p, mtime: getLatestMtime(p) }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 4)
      .map((x) => x.path);

    if (candidates.length === 0) return callback(null);

    const pyCode = [
      'import sys, os, shutil, sqlite3, tempfile',
      'partial, clean = sys.argv[1].lower(), sys.argv[2].lower()',
      'for src in sys.argv[3:]:',
      '    tmp = os.path.join(tempfile.gettempdir(), f"tc_hist_{os.getpid()}.db")',
      '    try:',
      '        shutil.copy2(src, tmp)',
      '        for ext in ("-wal", "-shm"):',
      '            if os.path.exists(src + ext):',
      '                try: shutil.copy2(src + ext, tmp + ext)',
      '                except Exception: pass',
      '        conn = sqlite3.connect(tmp)',
      '        rows = conn.execute("SELECT current_path, target_path, total_bytes, state FROM downloads WHERE total_bytes > 0 ORDER BY start_time DESC LIMIT 15").fetchall()',
      '        conn.close()',
      '        for cur, tgt, tb, st in rows:',
      '            c = (cur or "").lower()',
      '            t = (tgt or "").lower()',
      '            if partial in c or clean in t or clean in c:',
      '                print(int(tb))',
      '                sys.exit(0)',
      '        for cur, tgt, tb, st in rows:',
      '            if st == 0 and tb > 0:',
      '                print(int(tb))',
      '                sys.exit(0)',
      '    except Exception:',
      '        pass',
      '    finally:',
      '        for ext in ("", "-wal", "-shm"):',
      '            try: os.remove(tmp + ext)',
      '            except Exception: pass',
    ].join('\n');

    execFile(
      'python',
      ['-c', pyCode, partialName, cleanName, ...candidates],
      { timeout: 4500, windowsHide: true },
      (err, stdout) => {
        if (err || !stdout) return callback(null);
        const val = parseInt(String(stdout).trim(), 10);
        callback(Number.isFinite(val) && val > 0 ? val : null);
      }
    );
  } catch {
    callback(null);
  }
}

function getSteamLibraryPaths() {
  const candidates = new Set([
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Steam'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Steam'),
  ]);
  const steamAppsDirs = new Set();
  for (const base of candidates) {
    const sa = path.join(base, 'steamapps');
    if (fs.existsSync(sa)) {
      steamAppsDirs.add(sa);
      const vdfPath = path.join(sa, 'libraryfolders.vdf');
      try {
        if (fs.existsSync(vdfPath)) {
          const raw = fs.readFileSync(vdfPath, 'utf8');
          const matches = raw.matchAll(/"path"\s+"([^"]+)"/g);
          for (const m of matches) {
            const libPath = m[1].replace(/\\\\/g, '\\');
            const libSteamApps = path.join(libPath, 'steamapps');
            if (fs.existsSync(libSteamApps)) steamAppsDirs.add(libSteamApps);
          }
        }
      } catch {}
    }
  }
  return Array.from(steamAppsDirs);
}

function parseSteamAcf(content) {
  const getVal = (key) => {
    const m = content.match(new RegExp(`"${key}"\\s+"([^"]*)"`, 'i'));
    return m ? m[1] : '';
  };
  return {
    appid: getVal('appid'),
    name: getVal('name'),
    stateFlags: parseInt(getVal('StateFlags') || '0', 10),
    bytesDownloaded: Number(getVal('BytesDownloaded') || 0),
    bytesToDownload: Number(getVal('BytesToDownload') || 0),
  };
}

/**
 * Watches browser downloads and Steam .acf manifests with zero idle polling.
 */
function createLiveActivityWatcher({ downloadsDir, onUpdate }) {
  const watchers = [];
  let downloadTrackTimer = null;
  let lastDownloadSample = null;
  let lastSteamSample = null;
  let steamClearTimer = null;

  const scanSteamDownloads = (steamAppsDirs) => {
    let activeDownload = null;
    for (const dir of steamAppsDirs) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (!file.startsWith('appmanifest_') || !file.endsWith('.acf')) continue;
          const info = parseSteamAcf(fs.readFileSync(path.join(dir, file), 'utf8'));
          if (info.bytesToDownload > 0 && info.stateFlags !== 4 && info.bytesDownloaded < info.bytesToDownload) {
            activeDownload = info;
            break;
          }
        }
        if (activeDownload) break;
      } catch {}
    }

    if (activeDownload) {
      clearTimeout(steamClearTimer);
      const now = Date.now();
      let speedMBps = 0;
      if (lastSteamSample && lastSteamSample.appid === activeDownload.appid) {
        const dt = Math.max(0.2, (now - lastSteamSample.time) / 1000);
        speedMBps = Math.max(0, activeDownload.bytesDownloaded - lastSteamSample.bytes) / (1024 * 1024) / dt;
      }
      lastSteamSample = {
        appid: activeDownload.appid,
        name: activeDownload.name,
        bytes: activeDownload.bytesDownloaded,
        time: now,
      };
      const percent = Math.min(99.9, Math.max(1, (activeDownload.bytesDownloaded / activeDownload.bytesToDownload) * 100));
      onUpdate({
        active: true,
        kind: 'steam',
        id: `steam-${activeDownload.appid}`,
        title: activeDownload.name || `Steam #${activeDownload.appid}`,
        percent: Math.round(percent * 10) / 10,
        speedMBps: Math.round(speedMBps * 10) / 10,
        downloadedGB: Math.round((activeDownload.bytesDownloaded / 1024 ** 3) * 100) / 100,
        totalGB: Math.round((activeDownload.bytesToDownload / 1024 ** 3) * 100) / 100,
        done: false,
      });
    } else if (lastSteamSample) {
      const finishedName = lastSteamSample.name || 'Steam İndirmesi';
      lastSteamSample = null;
      onUpdate({
        active: true,
        kind: 'steam',
        id: 'steam-done',
        title: finishedName,
        percent: 100,
        speedMBps: 0,
        done: true,
      });
      clearTimeout(steamClearTimer);
      steamClearTimer = setTimeout(() => onUpdate({ active: false, kind: 'steam' }), 3500);
    }
  };

  const start = () => {
    try {
      if (downloadsDir && fs.existsSync(downloadsDir)) {
        let cachedDownloadMeta = { file: null, totalBytes: null, lastHistoryMtime: 0, lookingUp: false };
        const checkDownloads = () => {
          try {
            const files = fs.readdirSync(downloadsDir);
            const partial = files.find((f) => /\.(crdownload|part|tmp)$/i.test(f));
            if (partial) {
              const stat = fs.statSync(path.join(downloadsDir, partial));
              const now = Date.now();
              let speedMBps = 0;
              if (lastDownloadSample && lastDownloadSample.file === partial) {
                const dt = Math.max(0.2, (now - lastDownloadSample.time) / 1000);
                speedMBps = Math.max(0, stat.size - lastDownloadSample.size) / (1024 * 1024) / dt;
              }
              lastDownloadSample = { file: partial, size: stat.size, time: now };
              const cleanName = partial.replace(/\.(crdownload|part|tmp)$/i, '');

              const emitDownloadProgress = (fileSize, totalBytes) => {
                const computedPercent =
                  totalBytes && totalBytes > 0
                    ? Math.min(99.9, Math.max(1, Math.round((fileSize / totalBytes) * 1000) / 10))
                    : null;

                onUpdate({
                  active: true,
                  kind: 'download',
                  id: `dl-${cleanName}`,
                  title: cleanName,
                  downloadedMB: Math.round((fileSize / (1024 * 1024)) * 10) / 10,
                  totalMB: totalBytes ? Math.round((totalBytes / (1024 * 1024)) * 10) / 10 : null,
                  speedMBps: Math.round(speedMBps * 10) / 10,
                  percent: computedPercent,
                  done: false,
                });
              };

              if (cachedDownloadMeta.file !== partial) {
                cachedDownloadMeta = { file: partial, totalBytes: null, lastHistoryMtime: 0, lookingUp: false };
              }
              if (!cachedDownloadMeta.totalBytes && !cachedDownloadMeta.lookingUp) {
                let latestHistoryMtime = 0;
                for (const p of CHROMIUM_HISTORY_PATHS()) {
                  const m = getLatestMtime(p);
                  if (m > latestHistoryMtime) latestHistoryMtime = m;
                }
                if (latestHistoryMtime > cachedDownloadMeta.lastHistoryMtime) {
                  cachedDownloadMeta.lookingUp = true;
                  cachedDownloadMeta.lastHistoryMtime = latestHistoryMtime;
                  const targetFile = partial;
                  const latestSize = stat.size;
                  lookupChromiumTotalBytes(partial, cleanName, (tb) => {
                    if (cachedDownloadMeta.file === targetFile) {
                      cachedDownloadMeta.lookingUp = false;
                      if (tb) {
                        cachedDownloadMeta.totalBytes = tb;
                        emitDownloadProgress(latestSize, tb);
                      }
                    }
                  });
                }
              }

              emitDownloadProgress(stat.size, cachedDownloadMeta.totalBytes);
              if (!downloadTrackTimer) {
                downloadTrackTimer = setInterval(checkDownloads, 750);
              }
            } else {
              if (downloadTrackTimer) {
                clearInterval(downloadTrackTimer);
                downloadTrackTimer = null;
              }
              if (lastDownloadSample) {
                const cleanName = lastDownloadSample.file.replace(/\.(crdownload|part|tmp)$/i, '');
                lastDownloadSample = null;
                onUpdate({
                  active: true,
                  kind: 'download',
                  id: 'dl-done',
                  title: cleanName,
                  percent: 100,
                  speedMBps: 0,
                  done: true,
                });
                setTimeout(() => onUpdate({ active: false, kind: 'download' }), 3500);
              }
            }
          } catch {
            if (downloadTrackTimer) {
              clearInterval(downloadTrackTimer);
              downloadTrackTimer = null;
            }
          }
        };

        let dlWatchDebounce = null;
        watchers.push(
          fs.watch(downloadsDir, () => {
            clearTimeout(dlWatchDebounce);
            dlWatchDebounce = setTimeout(checkDownloads, 120);
          })
        );
        checkDownloads();
      }
    } catch {}

    try {
      const steamDirs = getSteamLibraryPaths();
      if (steamDirs.length > 0) {
        let steamDebounce = null;
        const triggerSteamScan = () => {
          clearTimeout(steamDebounce);
          steamDebounce = setTimeout(() => scanSteamDownloads(steamDirs), 350);
        };
        for (const dir of steamDirs) {
          watchers.push(
            fs.watch(dir, (_ev, filename) => {
              if (!filename || filename.endsWith('.acf')) triggerSteamScan();
            })
          );
        }
        scanSteamDownloads(steamDirs);
      }
    } catch {}
  };

  const stop = () => {
    for (const w of watchers) {
      try { w.close(); } catch {}
    }
    watchers.length = 0;
    if (downloadTrackTimer) {
      clearInterval(downloadTrackTimer);
      downloadTrackTimer = null;
    }
    clearTimeout(steamClearTimer);
  };

  return { start, stop };
}

module.exports = { createLiveActivityWatcher };

