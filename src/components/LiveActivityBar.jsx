import React from 'react';
import { ArrowDown, Check, Gamepad2, Video } from 'lucide-react';

export function IdleLiveActivityPill({ liveActivity }) {
  if (!liveActivity?.active) return null;
  const hasPercent = typeof liveActivity.percent === 'number' && Number.isFinite(liveActivity.percent);
  const pct = liveActivity.done ? 100 : hasPercent ? Math.max(0, Math.min(100, Math.round(liveActivity.percent))) : null;
  const isIndeterminate = pct == null && !liveActivity.done;
  const pctWidth = liveActivity.done ? 100 : (pct ?? 42);

  // 16px SVG ring: r=6 -> circumference = 2 * pi * 6 ≈ 37.7
  const radius = 6;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = isIndeterminate
    ? circumference * 0.68
    : circumference * (1 - pctWidth / 100);

  return (
    <div
      className={`idle-live-activity ${liveActivity.done ? 'is-done' : ''} ${isIndeterminate ? 'is-indeterminate' : ''}`}
      title={liveActivity.title}
    >
      <div className="idle-live-ring-wrap" aria-hidden="true">
        <svg className="idle-live-ring-svg" width="16" height="16" viewBox="0 0 16 16">
          <circle
            className="idle-live-ring-bg"
            cx="8"
            cy="8"
            r={radius}
            fill="none"
            strokeWidth="1.75"
          />
          <circle
            className={`idle-live-ring-fg ${isIndeterminate ? 'is-spinning' : ''}`}
            cx="8"
            cy="8"
            r={radius}
            fill="none"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="idle-live-ring-icon">
          {liveActivity.done ? (
            <Check size={8} strokeWidth={3} />
          ) : liveActivity.kind === 'steam' ? (
            <Gamepad2 size={8} strokeWidth={2.4} />
          ) : (
            <ArrowDown size={8} strokeWidth={2.8} />
          )}
        </span>
      </div>

      <span className="idle-live-title">{liveActivity.title}</span>

      <span className="idle-live-pct mono">
        {liveActivity.done
          ? '%100'
          : pct != null
          ? `%${pct}`
          : `${liveActivity.downloadedMB ?? 0} MB`}
      </span>

      <div className="idle-live-bar-track" aria-hidden="true">
        <div
          className={`idle-live-bar-fill ${isIndeterminate ? 'is-indeterminate' : ''}`}
          style={{ width: `${pctWidth}%` }}
        />
      </div>
    </div>
  );
}

export function HomeLiveAndContextStrip({ appContext, onOpenMirror }) {
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

