const { ipcRenderer } = require('electron');

// 1. Force foreground visibility so Gmail's real-time push connection never sleeps
try {
  Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
  Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
  Object.defineProperty(document, 'webkitHidden', { get: () => false, configurable: true });
  Object.defineProperty(document, 'webkitVisibilityState', { get: () => 'visible', configurable: true });
} catch (e) {}

try {
  window.addEventListener('focus', () => {}, true);
  window.dispatchEvent(new Event('focus'));
} catch (e) {}

// 2. Intercept Web Notification API for Gmail & Google Calendar
try {
  window.Notification = function (title, options) {
    try {
      ipcRenderer.send('google-bg-push-notification', {
        title: title || 'Yeni E-posta',
        body: options?.body || '',
        icon: options?.icon || '',
        tag: options?.tag || '',
        origin: window.location.hostname,
      });
    } catch (e) {}
    // This worker is hidden; never create a second native Windows toast.
    return {
      title: title || '',
      body: options?.body || '',
      close: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  };
  window.Notification.permission = 'granted';
  window.Notification.requestPermission = () => Promise.resolve('granted');
} catch (e) {}

// Google may also toast through a service worker. Route it through TwoCode and
// prevent a duplicate native Windows notification from this hidden worker.
try {
  const registrationPrototype = window.ServiceWorkerRegistration?.prototype;
  if (registrationPrototype?.showNotification) {
    registrationPrototype.showNotification = function (title, options = {}) {
      try {
        ipcRenderer.send('google-bg-push-notification', {
          title: title || 'Google notification',
          body: options.body || '',
          icon: options.icon || '',
          tag: options.tag || '',
          origin: window.location.hostname,
        });
      } catch (e) {}
      return Promise.resolve();
    };
  }
} catch (e) {}

// 3. Gmail DOM & Title Poller with Active Refresh
let lastTitle = '';
let lastPrimaryCount = -1;
let knownMailKeys = new Set();
let hasCompletedInitialSync = false;
let initialSyncTimer = null;

function parseTabCount(tabSelector) {
  try {
    const el = document.querySelector(tabSelector);
    if (!el) return 0;
    const combined = (el.getAttribute('aria-label') || '') + ' ' + (el.innerText || '');
    const m = combined.match(/(\d+)\s*(?:yeni|new)/i) || combined.match(/\((\d+)\)/);
    return m ? parseInt(m[1], 10) : 0;
  } catch {
    return 0;
  }
}

function scanGmailPage() {
  try {
    const url = window.location.href;
    const title = document.title || '';

    // If on Google Account Chooser, auto-select account
    if (url.includes('accounts.google.com') && (url.includes('AccountChooser') || url.includes('identifier') || url.includes('signin'))) {
      const accountCards = document.querySelectorAll('[data-identifier], [data-email], li[data-authuser]');
      if (accountCards.length > 0) {
        accountCards[0].click();
      }
      return;
    }

    if (!url.includes('mail.google.com')) return;

    // 1. Detect unread count from document.title (e.g. "Gelen Kutusu (2) - ...")
    let countFromTitle = 0;
    const titleMatch = title.match(/\((\d+)\)/);
    if (titleMatch) {
      countFromTitle = parseInt(titleMatch[1], 10);
    }

    // 2. Detect unread count from Gmail sidebar element (div.bsU) or inbox link
    let countFromBadge = 0;
    const badgeEl = document.querySelector('div.bsU, a[href*="#inbox"] .bsU');
    if (badgeEl && badgeEl.textContent) {
      const parsed = parseInt(badgeEl.textContent.trim().replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed)) countFromBadge = parsed;
    }

    // 3. Scan unread rows in Gmail inbox
    const unreadRows = document.querySelectorAll('tr.zA.zE, tr.zE, tr[role="row"].zE');
    
    // Tab category counts
    const primaryTabCount = Math.max(
      parseTabCount('div[role="tab"][aria-label*="Birincil"], div[role="tab"][aria-label*="Primary"]'),
      unreadRows.length
    );
    const updatesTabCount = parseTabCount('div[role="tab"][aria-label*="Güncellemeler"], div[role="tab"][aria-label*="Updates"]');
    const promotionsTabCount = parseTabCount('div[role="tab"][aria-label*="Tanıtımlar"], div[role="tab"][aria-label*="Promotions"]');

    const currentPrimaryCount = Math.max(countFromTitle, countFromBadge, primaryTabCount, unreadRows.length);
    let newestMail = null;

    if (unreadRows.length > 0) {
      for (let i = 0; i < Math.min(unreadRows.length, 10); i++) {
        const row = unreadRows[i];
        const rowId = row.getAttribute('data-legacy-thread-id') || row.getAttribute('id') || `row_${i}`;

        // Extract sender
        const senderEl = row.querySelector('.yX .yW span, .zF, span[email], .bqc');
        const sender = senderEl ? senderEl.textContent.trim() : 'Google Mail';
        const senderAvatar = row.querySelector('.yW img, .gD img, [email] img, img[data-hovercard-id]');
        const senderPhoto = senderAvatar?.currentSrc || senderAvatar?.src || '';

        // Extract subject
        const subjectEl = row.querySelector('.y6 span, .bog, .bqe, .bog span');
        const subject = subjectEl ? subjectEl.textContent.trim() : 'Yeni e-posta';

        // Extract snippet
        const snippetEl = row.querySelector('.y2');
        const snippet = snippetEl ? snippetEl.textContent.trim().replace(/^[-–—\s]+/, '') : '';

        // Extract time
        const dateEl = row.querySelector('.xW span, .y2 + span');
        const timeStr = dateEl ? dateEl.textContent.trim() : '';

        const mailKey = `${rowId}__${sender}__${subject}`;

        if (i === 0) {
          newestMail = { id: rowId, sender, senderPhoto, subject, snippet, time: timeStr };
        }

        if (!hasCompletedInitialSync) {
          knownMailKeys.add(mailKey);
        } else if (!knownMailKeys.has(mailKey)) {
          // BRAND NEW INCOMING EMAIL DETECTED!
          knownMailKeys.add(mailKey);
          console.log('[Gmail Preload] DISPATCHING NEW MAIL:', sender, subject);
          ipcRenderer.send('google-bg-new-mail', {
            id: rowId,
            sender,
            senderPhoto,
            subject,
            snippet,
            time: timeStr || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            unreadCount: currentPrimaryCount,
            counts: {
              primary: currentPrimaryCount,
              updates: updatesTabCount,
              promotions: promotionsTabCount,
              unreadTotal: currentPrimaryCount + updatesTabCount + promotionsTabCount,
            },
          });
        }
      }
    }

    // If unread count increased but row wasn't immediately in DOM (e.g. category tabs)
    if (hasCompletedInitialSync && lastPrimaryCount !== -1 && currentPrimaryCount > lastPrimaryCount) {
      const diff = currentPrimaryCount - lastPrimaryCount;
      const fallbackKey = `bump_${currentPrimaryCount}`;
      if (!newestMail && !knownMailKeys.has(fallbackKey)) {
        knownMailKeys.add(fallbackKey);
        ipcRenderer.send('google-bg-new-mail', {
          id: 'mail_count_bump_' + Date.now(),
          sender: 'Google Mail',
          subject: `${diff} yeni e-posta alındı`,
          snippet: '',
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          unreadCount: currentPrimaryCount,
          counts: {
            primary: currentPrimaryCount,
            updates: updatesTabCount,
            promotions: promotionsTabCount,
            unreadTotal: currentPrimaryCount + updatesTabCount + promotionsTabCount,
          },
        });
      }
    }

    // Always keep counts in sync
    lastPrimaryCount = currentPrimaryCount;
    ipcRenderer.send('google-bg-count-update', {
      counts: {
        primary: currentPrimaryCount,
        updates: updatesTabCount,
        promotions: promotionsTabCount,
        unreadTotal: currentPrimaryCount + updatesTabCount + promotionsTabCount,
      },
      latestMail: newestMail,
    });

    // Wait until inbox content is loaded before marking initial sync complete
    const isInboxReady = document.querySelector('div[role="main"], table.F, tr.zA') !== null;
    if (!hasCompletedInitialSync && isInboxReady && !initialSyncTimer) {
      initialSyncTimer = setTimeout(() => {
        hasCompletedInitialSync = true;
        console.log('[Gmail Preload] Initial sync complete. Watching for NEW incoming emails. Baseline count:', knownMailKeys.size);
      }, 1500);
    }

    lastTitle = title;
  } catch (err) {
    console.error('[Gmail Preload Error]', err);
  }
}

// Gmail also emits native Web Notifications; poll the inbox DOM at a lower rate to limit background CPU.
setInterval(scanGmailPage, 4000);
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(scanGmailPage, 1000);
});
