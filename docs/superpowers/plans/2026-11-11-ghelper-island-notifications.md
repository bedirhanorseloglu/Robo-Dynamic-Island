# GHelper Notifications in Dynamic Island Implementation Plan

> **For agentic workers:** Implement this plan task-by-task in the current session, following `superpowers:executing-plans`.

**Goal:** Route every GHelper OSD message into the existing TwoCode notification Island and hide GHelper's centered OSD promptly.

**Architecture:** A dedicated PowerShell listener subscribes to Windows UI Automation notification events, watches for GHelper's small centered OSD window using WinEvent plus periodic top-level window scans, and reads OSD text from the window's UIA tree as a fallback. A small Electron module supervises that listener and forwards normalized events to `main.cjs`, which reuses the existing `windows-notification` IPC path. GHelper configuration remains untouched.

**Tech Stack:** Electron CommonJS, PowerShell 5.1, Windows UI Automation, Win32 `SetWinEventHook`, existing React notification surfaces.

**Spec:** `docs/superpowers/specs/2026-11-11-ghelper-island-notifications-design.md`

## Global Constraints

- Capture messages emitted through GHelper's `ToastForm.RunToast` UI Automation notification event.
- Do not modify GHelper's config, binaries, or running process lifecycle.
- Only hide a transient window after confirming it belongs to GHelper and matches the centered OSD geometry.
- Keep all unrelated Windows app notification behavior intact.
- Keep the bridge in separate Electron and PowerShell modules.

## Review Focus

- GHelper is not running when the listener starts: the listener must still catch it when it starts later.
- UI Automation raises the same message more than once: one user action must produce one Island notification.
- Similar small windows from other processes: none may be hidden.
- GHelper window is missing or accessibility event subscription fails: existing notification and system watcher remain alive.
- GHelper process exits while the bridge is active: shutdown must dispose hooks and not leave a child process.

## File Map

- Create `electron/ghelper-notification-bridge.psm1`: UIA subscription, GHelper process filtering, event dedupe, and targeted OSD hide hook.
- Modify `electron/win-system-watcher.ps1`: import the GHelper module and pump WinEvent messages in the existing watcher.
- Modify `electron/main.cjs`: start the system watcher with STA and forward normalized GHelper events to existing notification IPC.
- Modify `src/App.jsx`: recognize GHelper identity and show a local GHelper brand mark.
- Modify this plan and GHelper spec with verification outcome.

### Task 1: Build the modular Windows bridge

**Files:** Create the PowerShell module and integrate it with the existing system watcher.

**Interfaces:** `startGHelperNotificationBridge({ scriptPath, onNotification }) -> { stop() }`; listener emits one-line JSON objects with `event: "ghelper-notification"`, a stable notification ID, GHelper identity, and the UIA `DisplayString` as its title.

- [x] Subscribe to `AutomationElement.NotificationEvent` at `RootElement` with `TreeScope.Descendants` and filter event senders by the GHelper executable process name.
- [x] Dedupe by activity ID, falling back to process ID plus display text within a short time window.
- [x] Use `SetWinEventHook(EVENT_OBJECT_SHOW)` to handle only GHelper-owned small windows centered horizontally and approximately 300 px from the monitor bottom; read visible text from UIA as a fallback notification source.
- [x] Keep stdout machine-readable, preserve callback delegates, and pump WinEvent messages in the system watcher.
- [x] Remove the GHelper-specific child process and 35 ms top-level window scan.
- [x] Run PowerShell parser validation for the module and watcher.

### Task 2: Connect the bridge to the existing notification flow

**Files:** Modify `electron/main.cjs`, `src/App.jsx`.

**Interfaces:** Main process receives normalized bridge events and sends `windows-notification` with `app: "GHelper"`, `appId: "ghelper"`, and the GHelper display string as the title.

- [x] Start the module inside the system watcher and forward valid notifications through the existing IPC channel.
- [x] Stop the system watcher on `will-quit`; module load failure must not interrupt normal app startup.
- [x] Add a GHelper brand color and local mark to the notification presentation.
- [x] Run `node --check electron/main.cjs` and `git diff --check`.

### Task 3: Verify delivery and record limitations

**Files:** Update the plan and spec with observed verification.

- [x] Run `npm.cmd run build` and confirm it completes successfully.
- [x] Confirm the listener starts when GHelper is absent; the UIA subscription is global and does not require a restart when GHelper appears.
- [ ] If GHelper is available, exercise mode, keyboard backlight, and brightness OSD messages and confirm one Island notification per OSD plus prompt OSD hiding.
- [x] Record unavailable live GHelper verification and the first-frame OSD flash as a platform limitation.

## Verification outcome (2026-11-11)

- `node --check` passed for both Electron bridge and main process; `git diff --check` passed.
- PowerShell parser and module smoke checks passed after the listener was consolidated into the existing system watcher.
- `npm.cmd run build` passed (Vite 6.4.5, 2,088 modules).
- A physical keyboard-light OSD was not triggered in the latest verification. GHelper capture remains event-based through UIA and WinEvent.
- GHelper notifications bypass the Work mode Claude-only filter. The 35 ms full-window scan was removed in the resource optimization pass.
- Geometry correction: GHelper sets the OSD Y coordinate to monitor height minus 400 px (100 px toast height plus 300 px bottom offset). The bridge now matches that source geometry with DPI/position tolerance and accepts titled toast windows.
- Floating window correction: accept GHelper-owned `FloatingNativeWindow` OSDs by exact window class, exclude that class name from notification text, and use the UIA notification's actual display string.
- Ambient palette: read GHelper's saved `aura_color` and `aura_color2` for every OSD event without modifying its config; validate and forward both swatches through notification IPC. The Island uses both colors in its ambient gradient. Verified the live Gradient config as `#AF0000` + `#FF8000`, production build passed, then restarted TwoCode. Resource follow-up consolidated GHelper into the existing `-STA` system watcher and removed the standalone supervisor; see `2026-11-11-background-resource-budget.md`.
