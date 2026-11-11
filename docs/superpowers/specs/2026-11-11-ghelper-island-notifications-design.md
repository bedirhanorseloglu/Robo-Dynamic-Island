# GHelper Notifications in Dynamic Island

## Intent

Show every GHelper OSD message in TwoCode's existing Dynamic Island notification surface, including performance mode, keyboard lighting, brightness, microphone, Fn lock, battery/charger, and other messages emitted by GHelper's shared toast component.

## Goals

- Capture full GHelper OSD message text and identify it as GHelper.
- Display messages through the existing notification renderer, history, sound, and app accent handling.
- Hide GHelper's centered OSD promptly so the Island is the visible feedback surface.
- Tint GHelper feedback with both selected Aura swatch colors for a matching Island ambient glow.
- Keep the integration in a separate module and avoid changing GHelper configuration automatically.
- Read `aura_color` and `aura_color2` from GHelper's config only as color sources; when no second color is configured, reuse the first. Fall back to the existing GHelper brand teal when the color config is unavailable.
- Leave other Windows app notifications on their current listener path.

## Non-goals

- Control GHelper modes, Aura, or hardware settings from TwoCode.
- Replace GHelper's internal toast implementation or modify its installed binaries.
- Capture messages that GHelper does not emit through its OSD/notification component.

## Approaches

- Poll `config.json` for known state changes: rejected because it cannot capture arbitrary GHelper messages. GHelper's `disable_osd` option also returns before its UI Automation notification is raised.
- Capture GHelper UI Automation notification events and watch for its OSD window being shown: selected because the upstream `ToastForm.RunToast` emits the complete message text as an automation notification. A Windows event hook plus a periodic top-level window scan hides the matching transient OSD; the OSD's UIA text is a fallback if the event is missed.
- Patch or inject into GHelper: rejected because it couples TwoCode to a third-party binary and update internals.

## Interaction and implementation

- Add an isolated GHelper bridge module to the Electron/Windows notification flow.
- Filter UI Automation events by the GHelper process, normalize each message into the existing `windows-notification` payload, and let the current Island notification handler render and store it.
- Use a separate window-show hook and a low-cost top-level window scan to hide only GHelper's short-lived OSD window. Read visible text from that window's UIA tree as a fallback notification source. Do not alter GHelper's config file or terminate/restart its process.
- Deduplicate UI Automation events and ignore TwoCode's own windows. If GHelper is absent or UI Automation is unavailable, keep the rest of the notification system running unchanged.
- Verify multiple OSD categories on a machine running GHelper; document any platform-dependent OSD flash if the external window cannot be hidden before its first frame.

## Source notes

- GHelper's shared [`ToastForm.RunToast`](https://github.com/seerge/g-helper/blob/main/app/Helpers/ToastForm.cs) carries the text and raises a UI Automation notification.
- GHelper's [power user settings](https://github.com/seerge/g-helper/wiki/power-user-settings#disable-osd) document that `disable_osd` disables its OSD.

## Implementation verification

- The PowerShell UI Automation listener and WinEvent OSD hook live in the reusable `electron/ghelper-notification-bridge.psm1` module, imported by the existing `-STA` `electron/win-system-watcher.ps1` process and connected to the existing `windows-notification` IPC route. This avoids a second resident PowerShell process.
- JavaScript syntax, PowerShell parsing, `git diff --check`, and the Vite production build passed. The listener remained running for two seconds with GHelper absent.
- GHelper was not running or available in this session, so real OSD capture, deduplication, hide latency, and any first-frame flash still need a live-device check.
- GHelper feedback bypasses the Work mode Claude-only app filter; global notification disable and Do Not Disturb still apply.
- GHelper positions its 100 px OSD 300 px above the monitor bottom; the matcher uses this upstream geometry with tolerance and accepts titled toast windows.
- Match GHelper's `FloatingNativeWindow` class directly and never surface that class name as notification content; use `DisplayString` from the UIA event for the Island title.
- The bridge reads GHelper's configured `aura_color` and `aura_color2` for each OSD event without writing to the config. Both validated swatches are forwarded to the Island; its glow and ambient gradient use both values, so changing GHelper's palette is reflected in the next keyboard-light notification.
- On 2026-11-11, the live GHelper config reported Gradient mode (`aura_mode: 24`), `aura_color: -5308416` (`#AF0000`), and `aura_color2: -32768` (`#FF8000`). TwoCode was restarted after the update and the `-STA` PowerShell bridge was confirmed running. A physical keyboard-light change was not triggered during verification.
