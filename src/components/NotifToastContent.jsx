import React from 'react';
import NotificationText from '../NotificationText';

export default function NotifToastContent({
  avatarNode,
  presentation,
}) {
  const hasSubtitle = Boolean(
    presentation.subtitle &&
      presentation.subtitle.trim() &&
      presentation.subtitle !== presentation.title &&
      presentation.subtitle !== presentation.app
  );

  return (
    <>
      <div className="notif-toast-ambient" aria-hidden="true" />
      <div className="notif-toast-sheen" aria-hidden="true" />
      <div className="notif-toast-hero">{avatarNode}</div>

      <div className="notif-kinetic-body">
        <div className="notif-kinetic-title">
          <NotificationText text={presentation.title} />
        </div>
        {hasSubtitle && (
          <div className="notif-kinetic-sub">
            <NotificationText text={presentation.subtitle} />
          </div>
        )}
      </div>

      <div className="notif-toast-countdown-track" aria-hidden="true">
        <div className="notif-toast-countdown-bar" />
      </div>
    </>
  );
}
