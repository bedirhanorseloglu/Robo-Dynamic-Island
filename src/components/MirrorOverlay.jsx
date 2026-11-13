import React, { useEffect, useRef, useState } from 'react';
import { Sun } from 'lucide-react';

export default function MirrorOverlay({ onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ringLight, setRingLight] = useState(false);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 480, height: 360 }, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {});

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`mirror-overlay-view ${ringLight ? 'has-ring-light' : ''}`}>
      <video ref={videoRef} autoPlay playsInline muted className="mirror-video-feed" />
      <div className="mirror-controls-bar">
        <button
          type="button"
          className={`mirror-action-pill ${ringLight ? 'is-active' : ''}`}
          onClick={() => setRingLight((v) => !v)}
          title="Ekran ışığını aç/kapat"
        >
          <Sun size={12} /> Işık
        </button>
        <button type="button" className="mirror-close-pill" onClick={onClose}>
          Kapat
        </button>
      </div>
    </div>
  );
}

