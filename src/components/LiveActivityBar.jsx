import React from 'react';
import { Download, Gamepad2, Video } from 'lucide-react';

export function IdleLiveActivityPill({ liveActivity }) {
  if (!liveActivity?.active) return null;
  return (
    <div className={`idle-live-activity ${liveActivity.done ? 'is-done' : ''}`} title={liveActivity.title}>
      <span className="idle-live-icon">
        {liveActivity.kind === 'steam' ? <Gamepad2 size={12} /> : <Download size={12} />}
      </span>
      <span className="idle-live-title">{liveActivity.title}</span>
      <span className="idle-live-pct mono">
        {liveActivity.done
          ? '✓'
          : liveActivity.percent != null
          ? `${Math.round(liveActivity.percent)}%`
          : `${liveActivity.downloadedMB ?? 0}MB`}
      </span>
      <div className="idle-live-bar-track">
        <div
          className={`idle-live-bar-fill ${liveActivity.percent == null && !liveActivity.done ? 'is-indeterminate' : ''}`}
          style={{ width: `${liveActivity.done ? 100 : (liveActivity.percent ?? 45)}%` }}
        />
      </div>
    </div>
  );
}

const CONTEXT_LABELS = {
  meeting: 'Toplantı Modu',
  code: 'Geliştirme',
  media: 'Medya',
  browser: 'Tarayıcı',
  game: 'Oyun',
};

export function HomeLiveAndContextStrip({ liveActivity, appContext, onOpenMirror }) {
  if (liveActivity?.active) {
    return (
      <div className={`home-live-activity-card ${liveActivity.done ? 'is-done' : ''}`}>
        <div className="home-live-top">
          <span className="home-live-badge">
            {liveActivity.kind === 'steam' ? <Gamepad2 size={13} /> : <Download size={13} />}
            <span>{liveActivity.kind === 'steam' ? 'Steam İndirme' : 'İndirme'}</span>
          </span>
          <span className="home-live-stats mono">
            {liveActivity.done
              ? 'Tamamlandı ✓'
              : `${liveActivity.speedMBps || 0} MB/s • ${
                  liveActivity.percent != null
                    ? `%${liveActivity.percent} (${liveActivity.downloadedGB}/${liveActivity.totalGB} GB)`
                    : `${liveActivity.downloadedMB || 0} MB`
                }`}
          </span>
        </div>
        <div className="home-live-title">{liveActivity.title}</div>
        <div className="home-live-progress-track">
          <div
            className={`home-live-progress-fill ${liveActivity.percent == null && !liveActivity.done ? 'is-indeterminate' : ''}`}
            style={{ width: `${liveActivity.done ? 100 : (liveActivity.percent ?? 45)}%` }}
          />
        </div>
      </div>
    );
  }

  if (!appContext || appContext.category !== 'meeting') return null;

  return (
    <div className="home-context-strip">
      <span className="home-context-label">
        Toplantı Modu{appContext.app ? ` • ${appContext.app}` : ''}
      </span>
      <div className="home-context-actions">
        <button
          type="button"
          className="home-ctx-btn"
          onClick={onOpenMirror}
          title="Hızlı Ayna aç"
        >
          <Video size={12} />
          <span>Ayna</span>
        </button>
      </div>
    </div>
  );
}

