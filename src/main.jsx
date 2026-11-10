import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import SettingsApp from './SettingsApp';
import './styles.css';
import './typography.css';
import { initializeTypography } from './typography';

initializeTypography();

window.addEventListener('error', (event) => {
  console.error('[CRITICAL WINDOW ERROR]', event.message, event.filename, event.lineno, event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UNHANDLED PROMISE REJECTION]', event.reason?.stack || event.reason);
});

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[REACT RENDER CRASH]', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          padding: '16px 20px',
          background: '#0d0d12',
          color: '#ff6b6b',
          fontFamily: 'monospace',
          fontSize: '12px',
          overflow: 'auto',
          boxSizing: 'border-box'
        }}>
          <strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
            ⚠️ Dynamic Island Render Hatası
          </strong>
          <div style={{ whiteSpace: 'pre-wrap', color: '#ffb4b4', marginBottom: '12px' }}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#2b2b36',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '6px 14px',
              cursor: 'pointer'
            }}
          >
            Yeniden Başlat
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const isSettingsWindow =
  window.location.search.includes('window=settings') ||
  window.location.hash.includes('settings');

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      {isSettingsWindow ? <SettingsApp /> : <App />}
    </GlobalErrorBoundary>
  </React.StrictMode>
);
