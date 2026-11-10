const { ipcRenderer } = require('electron');

// Keep Calendar in a genuine background state so Chromium can throttle its renderer.
// Forward notification events through the existing TwoCode notification path.
try {
  window.Notification = function (title, options = {}) {
    try {
      ipcRenderer.send('google-bg-push-notification', {
        title: title || 'Google Calendar',
        body: options.body || '',
        icon: options.icon || '',
        tag: options.tag || '',
        origin: window.location.hostname,
      });
    } catch {}
    return {
      title: title || '',
      body: options.body || '',
      close: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  };
  window.Notification.permission = 'granted';
  window.Notification.requestPermission = () => Promise.resolve('granted');
} catch {}

try {
  const registrationPrototype = window.ServiceWorkerRegistration?.prototype;
  if (registrationPrototype?.showNotification) {
    registrationPrototype.showNotification = function (title, options = {}) {
      try {
        ipcRenderer.send('google-bg-push-notification', {
          title: title || 'Google Calendar',
          body: options.body || '',
          icon: options.icon || '',
          tag: options.tag || '',
          origin: window.location.hostname,
        });
      } catch {}
      return Promise.resolve();
    };
  }
} catch {}
