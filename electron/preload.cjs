const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('twocode', {
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore),
  setExpanded: (expanded) => ipcRenderer.send('set-expanded', expanded),
  setIslandMode: (mode, customWidth) => ipcRenderer.send('set-island-mode', mode, customWidth),
  onNotchHoverChange: (cb) => {
    const listener = (_event, hovering) => cb(hovering);
    ipcRenderer.on('notch-hover-change', listener);
    return () => ipcRenderer.removeListener('notch-hover-change', listener);
  },
  onGameModeChange: (cb) => {
    const listener = (_event, active) => cb(Boolean(active));
    ipcRenderer.on('game-mode-change', listener);
    return () => ipcRenderer.removeListener('game-mode-change', listener);
  },
  isGameModeActive: () => ipcRenderer.invoke('is-game-mode-active'),
  openSettingsWindow: (tab) => ipcRenderer.invoke('open-settings-window', tab),
  settingsWindowControl: (action) => ipcRenderer.send('settings-window-control', action),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  onSettingsUpdated: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('settings-updated', listener);
    return () => ipcRenderer.removeListener('settings-updated', listener);
  },
  onNavigateSettingsTab: (cb) => {
    const listener = (_event, tab) => cb(tab);
    ipcRenderer.on('navigate-settings-tab', listener);
    return () => ipcRenderer.removeListener('navigate-settings-tab', listener);
  },
  pickProgramFile: () => ipcRenderer.invoke('pick-program-file'),
  triggerIslandEmotion: (emotion) => ipcRenderer.send('trigger-island-emotion', emotion),
  onIslandEmotion: (cb) => {
    const listener = (_event, emotion) => cb(emotion);
    ipcRenderer.on('island-emotion', listener);
    return () => ipcRenderer.removeListener('island-emotion', listener);
  },
  triggerTestNotification: (notif) => ipcRenderer.send('trigger-test-notification', notif),
  getAiHistory: () => ipcRenderer.invoke('get-ai-history'),
  getAgentIntegrationStatus: () => ipcRenderer.invoke('get-agent-integration-status'),
  connectAgentIntegrations: () => ipcRenderer.invoke('connect-agent-integrations'),
  testAgentIntegration: (agent) => ipcRenderer.invoke('test-agent-integration', agent),
  getGHelperBridgeStatus: () => ipcRenderer.invoke('get-ghelper-bridge-status'),
  installGHelperBridge: () => ipcRenderer.invoke('install-ghelper-bridge'),
  startGHelperBridge: () => ipcRenderer.invoke('start-ghelper-bridge'),
  testGHelperHud: (sampleText) => ipcRenderer.invoke('test-ghelper-hud', sampleText),
  getGHelperStatus: () => ipcRenderer.invoke('get-ghelper-status'),
  onGHelperStatusUpdate: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('ghelper-status-update', listener);
    return () => ipcRenderer.removeListener('ghelper-status-update', listener);
  },
  onAiHistoryUpdate: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('ai-history-update', listener);
    return () => ipcRenderer.removeListener('ai-history-update', listener);
  },
  mediaControl: (action, value) => ipcRenderer.invoke('media-control', action, value),
  openGHelper: () => ipcRenderer.invoke('open-ghelper'),
  launchMusicService: (service) => ipcRenderer.invoke('launch-music-service', service),
  getMediaStatus: () => ipcRenderer.invoke('get-media-status'),
  onMediaUpdate: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('media-update', listener);
    return () => ipcRenderer.removeListener('media-update', listener);
  },
  onClipboardUpdate: (cb) => {
    const listener = (_event, list) => cb(list);
    ipcRenderer.on('clipboard-update', listener);
    return () => ipcRenderer.removeListener('clipboard-update', listener);
  },
  copyText: (text) => ipcRenderer.invoke('copy-text', text),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openApp: (target) => ipcRenderer.invoke('open-app', target),
  openNotificationTarget: (target) => ipcRenderer.invoke('open-notification-target', target),
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  getPerfMetrics: () => ipcRenderer.invoke('get-perf-metrics'),
  openTaskMgrPerf: (section) => ipcRenderer.invoke('open-taskmgr-perf', section),
  onAgentEvent: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('agent-event', listener);
    return () => ipcRenderer.removeListener('agent-event', listener);
  },
  resolveAgentApproval: (id, approved) => ipcRenderer.invoke('resolve-agent-approval', { id, approved }),
  simulateAgentTask: (type) => ipcRenderer.invoke('simulate-agent-task', type),
  adjustVolume: (direction) => ipcRenderer.invoke('adjust-volume', direction),
  setVolume: (percent) => ipcRenderer.invoke('set-volume', percent),
  onSystemHud: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('system-hud', listener);
    return () => ipcRenderer.removeListener('system-hud', listener);
  },
  onWindowsNotification: (cb) => {
    const listener = (_event, notif) => cb(notif);
    ipcRenderer.on('windows-notification', listener);
    return () => ipcRenderer.removeListener('windows-notification', listener);
  },
  getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),
  getRadioStates: () => ipcRenderer.invoke('get-radio-states'),
  toggleRadio: (kind) => ipcRenderer.invoke('toggle-radio', kind),
  scanWifiNetworks: () => ipcRenderer.invoke('scan-wifi-networks'),
  scanBluetoothDevices: () => ipcRenderer.invoke('scan-bluetooth-devices'),
  pairBluetoothDevice: (deviceId) => ipcRenderer.invoke('pair-bluetooth-device', deviceId),
  addAgendaEvent: (evt) => ipcRenderer.invoke('add-agenda-event', evt),
  getAgendaEvents: () => ipcRenderer.invoke('get-agenda-events'),
  deleteAgendaEvent: (eventId) => ipcRenderer.invoke('delete-agenda-event', eventId),
  onAgendaEventsUpdate: (cb) => {
    const listener = (_event, agenda) => cb(agenda);
    ipcRenderer.on('local-agenda-update', listener);
    return () => ipcRenderer.removeListener('local-agenda-update', listener);
  },
  getFileIcon: (filePath) => ipcRenderer.invoke('get-file-icon', filePath),
  resolveAppLogo: (payload) => ipcRenderer.invoke('resolve-app-logo', payload),
  testMailNotif: () => ipcRenderer.invoke('test-mail-notif'),
  testAgendaNotif: () => ipcRenderer.invoke('test-agenda-notif'),
  connectGoogle: (opts) => ipcRenderer.invoke('connect-google', opts),
  disconnectGoogle: () => ipcRenderer.invoke('disconnect-google'),
  getGoogleData: () => ipcRenderer.invoke('get-google-data'),
  onGoogleDataUpdate: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('google-data-update', listener);
    return () => ipcRenderer.removeListener('google-data-update', listener);
  },
  askRobo: (payload) => ipcRenderer.invoke('ask-robo', payload),
  onAppContext: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('app-context', listener);
    return () => ipcRenderer.removeListener('app-context', listener);
  },
  onLiveActivity: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('live-activity', listener);
    return () => ipcRenderer.removeListener('live-activity', listener);
  },
  quitApp: () => ipcRenderer.send('quit-app'),
});
