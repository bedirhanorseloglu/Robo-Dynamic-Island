const fs = require('fs');
const path = require('path');

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
              onUpdate({
                active: true,
                kind: 'download',
                id: `dl-${cleanName}`,
                title: cleanName,
                downloadedMB: Math.round((stat.size / (1024 * 1024)) * 10) / 10,
                speedMBps: Math.round(speedMBps * 10) / 10,
                percent: null,
                done: false,
              });
              if (!downloadTrackTimer) {
                downloadTrackTimer = setInterval(checkDownloads, 1000);
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

        watchers.push(
          fs.watch(downloadsDir, (_ev, filename) => {
            if ((filename && /\.(crdownload|part|tmp)$/i.test(filename)) || lastDownloadSample) {
              checkDownloads();
            }
          })
        );
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

