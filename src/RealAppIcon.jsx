import React, { useState, useEffect } from 'react';

export default function RealAppIcon({ sc, size = 18 }) {
  const [nativeIcon, setNativeIcon] = useState(sc?.iconUrl || null);
  const type = (sc?.type || '').toLowerCase();
  const name = (sc?.name || '').toLowerCase();
  const url = (sc?.url || '').toLowerCase();
  const targetPath = sc?.path || (sc?.url && /^[a-zA-Z]:\\/i.test(sc.url) ? sc.url : '');

  useEffect(() => {
    let cancelled = false;
    if (targetPath && window.twocode?.getFileIcon && !nativeIcon) {
      window.twocode.getFileIcon(targetPath).then((dataUri) => {
        if (!cancelled && dataUri) setNativeIcon(dataUri);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [targetPath, nativeIcon]);

  if (nativeIcon) {
    return (
      <img
        src={nativeIcon}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    );
  }

  if (sc?.iconUrl) {
    return (
      <img
        src={sc.iconUrl}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    );
  }

  // Local executable fallback while icon extracts
  if (targetPath && /\.(exe|lnk)$/i.test(targetPath)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="#3b82f6" />
        <path d="M8 8l8 8M16 8l-8 8" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  // Google
  if ((type === 'google' || name.includes('google') || url.includes('google.com')) && !targetPath) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
    );
  }

  // YouTube
  if (type === 'youtube' || name.includes('youtube') || url.includes('youtube.com') || url.includes('youtu.be')) {
    return (
      <svg width={size + 2} height={Math.round(size * 0.75)} viewBox="0 0 24 18">
        <path fill="#FF0000" d="M23.498 2.61a3.016 3.016 0 0 0-2.122-2.136C19.505 0 12 0 12 0S4.495 0 2.622.474A3.016 3.016 0 0 0 .5 2.61 31.528 31.528 0 0 0 0 9.006a31.528 31.528 0 0 0 .5 6.396 3.016 3.016 0 0 0 2.122 2.136C4.495 18 12 18 12 18s7.505 0 9.378-.464a3.016 3.016 0 0 0 2.122-2.136 31.528 31.528 0 0 0 .5-6.396 31.528 31.528 0 0 0-.5-6.396z"/>
        <polygon fill="#FFFFFF" points="9.6 12.6 15.6 9 9.6 5.4"/>
      </svg>
    );
  }

  // Gemini
  if (type === 'gemini' || name.includes('gemini') || url.includes('gemini.google.com')) {
    return (
      <img
        src={`${import.meta.env.BASE_URL}gemini-logo.png`}
        alt="Gemini"
        width={size}
        height={size}
        draggable={false}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
        }}
      />
    );
  }

  // GitHub
  if (type === 'github' || name.includes('github') || url.includes('github.com')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#ffffff">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    );
  }

  // Spotify
  if (type === 'spotify' || name.includes('spotify') || url.includes('spotify.com')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#1DB954">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.306c-.216.353-.675.466-1.028.25-2.815-1.72-6.358-2.109-10.533-1.155-.403.092-.807-.159-.9-.562-.092-.403.159-.807.562-.9 4.568-1.044 8.49-.606 11.649 1.339.353.216.466.675.25 1.028zm1.467-3.262c-.272.443-.852.584-1.295.312-3.222-1.98-8.134-2.553-11.945-1.396-.5.152-1.032-.132-1.184-.632-.152-.5.132-1.032.632-1.184 4.364-1.324 9.775-.688 13.48 1.595.443.272.584.852.312 1.305zm.126-3.41c-3.864-2.294-10.244-2.506-13.934-1.385-.592.18-1.218-.163-1.398-.755-.18-.592.163-1.218.755-1.398 4.243-1.288 11.289-1.042 15.727 1.593.533.316.708 1.009.392 1.542-.316.533-1.009.708-1.542.392z"/>
      </svg>
    );
  }

  // WhatsApp
  if (type === 'whatsapp' || name.includes('whatsapp') || url.includes('whatsapp.com')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#25D366" />
        <path
          d="M16.9 14.8c-.24.68-1.4 1.29-1.95 1.37-.5.08-1.14.11-1.84-.11-.43-.14-.98-.32-1.68-.62-2.96-1.28-4.89-4.26-5.04-4.46-.15-.2-1.2-1.59-1.2-3.03s.76-2.15 1.03-2.44c.27-.29.59-.36.79-.36.2 0 .4 0 .57.01.18.01.42-.07.66.5.24.58.82 2.02.89 2.17.07.15.12.32.02.52s-.15.33-.3.5c-.15.17-.31.39-.45.53-.15.15-.31.31-.13.61.18.3.79 1.3 1.7 2.11 1.17 1.04 2.15 1.37 2.45 1.52.3.15.48.12.66-.09.18-.21.77-.9.98-1.2.21-.3.41-.25.69-.15.28.1 1.77.84 2.07.99.3.15.5.22.57.35.07.13.07.74-.49 1.28z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Antigravity
  if (type === 'antigravity' || name.includes('antigravity')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 22h20L12 2zm0 5l6.5 13h-13L12 7z" fill="#00E5FF"/>
        <circle cx="12" cy="14" r="2.5" fill="#7C4DFF"/>
      </svg>
    );
  }

  // Fallback to domain favicon if web link
  if (sc?.url && /^https?:\/\//i.test(sc.url)) {
    try {
      const hostname = new URL(sc.url).hostname;
      return (
        <img
          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
          alt=""
          style={{ width: size, height: size, borderRadius: 3, objectFit: 'contain' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    } catch {}
  }

  return (
    <span style={{ fontSize: Math.max(10, Math.round(size * 0.7)), fontWeight: 700, color: '#fff' }}>
      {sc?.name?.[0]?.toUpperCase() || 'A'}
    </span>
  );
}
