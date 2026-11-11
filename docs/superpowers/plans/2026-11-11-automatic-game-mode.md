# Automatic Game Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Robo visible in fullscreen games, require clicks to open the island, and pause selected background polling.

**Architecture:** Extend the existing PowerShell watcher with a lightweight Win32 foreground-window/display-bounds check and emit only game-mode transitions. Electron keeps the island in its small idle-eye shape, disables hover expansion, and manages polling timers while existing volume and brightness detection remains active.

**Tech Stack:** Electron 35, Node.js, PowerShell, Win32 P/Invoke.

**Spec:** `docs/superpowers/specs/2026-11-11-game-mode-design.md`

## Global Constraints

- Reuse the existing watcher; do not spawn a second detector process.
- Preserve fast volume and brightness monitoring.
- Do not steal foreground focus when restoring the settings window.
- Keep the island visible in idle Robo eyes mode during fullscreen games; only click expands it.
- Do not add or run automated tests; run the production build.

## Review Focus

- TwoCode itself must not trigger game mode.
- Borderless fullscreen on any display should trigger the mode.
- Fullscreen YouTube and other browser video must not trigger the mode.
- Windowed games must not trigger the mode.
- Enter/exit transitions must be sent once each, not every watcher tick.
- Robo eyes remain visible in fullscreen; clicking expands and hover does not.
- Exiting game mode returns the UI to its normal collapsed view and resumes timers with a fresh snapshot.

---

### Task 1: Detect fullscreen foreground windows in the existing watcher

**Files:**
- Modify: `electron/win-system-watcher.ps1`
- Modify: `electron/main.cjs` (pass Electron PID and handle watcher events)

**Interfaces:**
- Watcher input: `-ElectronPid <process id>`.
- Watcher output: one JSON line `{ "event": "game-mode", "active": true|false }` per transition.

- [x] Add a small Win32 helper that reads foreground HWND, owning process ID, window bounds, and nearest monitor bounds.
- [x] Treat a visible non-TwoCode foreground window as a game only when its executable path is under a recognized game-install location; exclude browsers and media players. Require all four window edges within 8 px of monitor bounds, check at 500 ms, and emit transitions only.
- [x] Pass the main Electron PID from `startSystemWatcher()` and process game-mode events in the existing stdout handler.
- [x] Keep existing audio and brightness monitoring active.
- [x] Review windowed, fullscreen, own-process, and multi-monitor conditions by code inspection.

### Task 2: Reduce app work and restore visibility around game mode

**Files:**
- Modify: `electron/main.cjs`

**Interfaces:**
- Main-process handler: `setGameModeActive(active: boolean)`.
- Existing media/history/clipboard timers become managed handles.

- [x] On game-mode entry, retain the island window in idle eyes mode, disable hover opening, remember settings-window visibility, and clear media, local-agent-history, and clipboard polling intervals.
- [x] On exit, restore normal hover behavior, return to the collapsed view, restore settings only if previously visible using `showInactive()`, refresh media/history once, and restart regular polling intervals.
- [x] Keep agenda reminders and the Windows system watcher running.
- [x] Run `npm.cmd run build`; expected result is a successful Vite production build.
