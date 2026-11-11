import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldPersistNotification } from '../src/notification-history-policy.mjs';

test('GHelper feedback is not retained in notification history', () => {
  assert.equal(shouldPersistNotification({ app: 'GHelper', appId: 'ghelper' }), false);
});

test('agent activity is not retained in notification history', () => {
  assert.equal(shouldPersistNotification({ app: 'Codex', isAgentActivity: true }), false);
  assert.equal(shouldPersistNotification({ appId: 'twocode-agent-codex' }), false);
});

test('ordinary Windows notifications remain in notification history', () => {
  assert.equal(shouldPersistNotification({ app: 'WhatsApp', appId: 'whatsapp' }), true);
});
