# Background Resource Budget Plan

**Goal:** Reduce TwoCode's idle RAM and polling overhead without removing GHelper or agent notifications.

**Architecture:** Fold GHelper UI Automation and its OSD show hook into the existing Windows system watcher, eliminating one resident PowerShell process and its 35 ms full-window scan. Start the single required local agent HTTP listener only when Codex or Antigravity hooks are configured.

**Files:** `electron/win-system-watcher.ps1`, `electron/ghelper-notification-bridge.ps1`, `electron/main.cjs`; this plan records the change.

**Approaches:** Keep the dedicated GHelper process but reduce its scan rate (lower CPU, same extra process and RAM); remove GHelper integration (lower RAM, loses requested notifications); merge it into the existing watcher (recommended: preserves behavior and removes redundant process).

## Steps

- [x] Convert the GHelper PowerShell script from a standalone loop into a reusable PowerShell module.
- [x] Start GHelper UIA and WinEvent hooks in the existing `-STA` system watcher, pump messages there, and remove the separate Electron child-process supervisor.
- [x] Remove the 35 ms `EnumWindows` scan and retain only targeted GHelper `EVENT_OBJECT_SHOW` handling.
- [x] Start the local agent listener on port 4242 only when either configured agent integration is connected; remove the unused 47823 listener and close the active listener on app quit.
- [x] Verify JavaScript and PowerShell parsing, `git diff --check`, production build, module start/stop smoke, Agent listener ports, and process inventory/RAM after restart.

## Review Focus

- GHelper starts after TwoCode: global UIA/WinEvent listeners must continue to capture it.
- GHelper OSD class or accessibility event differs: retain existing class, geometry and UIA text checks.
- Agent hooks are absent: no local agent server should listen; newly connecting agents must activate the port.
- Game-mode stop/resume: the unified system watcher must preserve existing watcher behavior.

## Verification (2026-11-11)

- JavaScript and both PowerShell files parsed; the GHelper module started and stopped its UIA/WinEvent hooks in a disposable STA PowerShell session.
- `npm.cmd run build` and `git diff --check` passed.
- Before consolidation, the two resident watcher processes used 168.7 MB private memory / 219.3 MB working set combined. After restart, one system watcher remained at 92.7 MB / 129.4 MB; the dedicated GHelper process was gone. This is a measured reduction of about 76 MB private memory and 90 MB working set for the watcher pair.
- Only the configured agent listener on port 4242 was active; the unused 47823 listener was absent.
- The separate media query PowerShell process appeared transiently during measurement; it is a one-shot query, not a persistent service. A physical GHelper OSD was not triggered for this resource check.
