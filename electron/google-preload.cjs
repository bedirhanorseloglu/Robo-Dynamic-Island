const { ipcRenderer } = require('electron');

// Remove navigator.userAgentData and WebDriver properties so Google sees authentic Firefox
try {
  delete Object.getPrototypeOf(navigator).userAgentData;
} catch (e) {}

try {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
  });
} catch (e) {}

function checkAndSendEmail() {
  try {
    if (window.location.hostname !== 'mail.google.com') {
      return;
    }
    const labels = Array.from(document.querySelectorAll('[aria-label]'))
      .map((el) => el.getAttribute('aria-label') || '')
      .filter((label) => /google account|google hesab/i.test(label));
    for (const label of labels) {
      const match = label.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) {
        ipcRenderer.send('google-account-detected', match[0]);
        return;
      }
    }
  } catch (e) {}
}

window.addEventListener('DOMContentLoaded', () => {
  checkAndSendEmail();
  setInterval(checkAndSendEmail, 2000);
});
