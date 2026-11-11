const matchesGHelper = (value) => /^(?:g-?helper)$/i.test(String(value || '').trim());

export function shouldPersistNotification(notification) {
  if (!notification || notification.isAgentActivity) return false;

  const appId = String(notification.appId || '');
  if (/^twocode-agent-/i.test(appId)) return false;
  if (matchesGHelper(notification.app) || matchesGHelper(appId)) return false;

  return true;
}
