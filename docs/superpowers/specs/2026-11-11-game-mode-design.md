# Automatic Game Mode

## Goal

Keep TwoCode from covering a fullscreen game and reduce background work while a fullscreen application is active, while preserving fast system volume and brightness detection.

## Behavior

- Detect a foreground window that covers its display only when the owning process runs from a recognized game-install location; exclude browsers and media players even if they happen to be installed under such a directory.
- Reuse the existing Windows system watcher; do not start a second polling process.
- When fullscreen begins, keep the Dynamic Island visible as Robo's idle eyes and disable hover-based expansion.
- While Game Mode is active, video media sessions must not replace the idle eyes with a music or focus-media bar.
- Allow a click to expand the island while fullscreen; keep it expanded until game mode ends or the user selects another section.
- Pause the recurring media-status, local-agent-history, and clipboard polling timers while game mode is active.
- Keep the existing volume/brightness watcher running so system change detection remains responsive.
- When fullscreen ends, restore normal hover behavior and the regular collapsed display, then refresh media and history once and resume the regular timers.
- Emit state changes only; avoid repeated IPC messages while fullscreen state is unchanged.

## Constraints

- Do not change settings defaults or add a required user setup step.
- Do not pause local calendar reminders or system volume/brightness monitoring.
- Work with borderless fullscreen windows on the monitor containing the foreground window.
- Do not activate for fullscreen browser video, including YouTube, even when the browser is installed under a game-like directory.
- Do not steal focus when restoring the settings window.

## Validation

- Confirm the watcher reports enter/exit only on transitions, ignores TwoCode and browsers/media players, and recognizes game-install locations.
- Confirm Robo remains visible, hover does not open the island, and click opens it without stealing focus from the game.
- Confirm paused polling resumes and requests one fresh media/history snapshot after the game.
- Run the production build; no test suite is requested.
