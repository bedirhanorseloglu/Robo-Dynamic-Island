# Agents and Notification Ambient Implementation Plan

**Design:** [Agents and Notification Ambient Design](../specs/2026-11-11-agent-notifications-ambient-design.md)

## Tasks

- [x] Reshape Agents into a local activity hero, connection summary, provider cards, and recent-work list.
- [x] Preserve Codex and Antigravity setup/test actions and the standalone IDE controls.
- [x] Carry app-brand and dominant-icon colors into the island ambient, app avatar, notification preview, and history panel.
- [x] Add unread notification markers and keep preview/test copy aligned with the selected item.
- [x] Respect reduced-motion preferences for ambient and loading animation.
- [x] Reset failed native-logo state per source and keep an app mark visible beside sender avatars.
- [x] Accept bounded SVG app icons from the Windows notification listener and add missing local brand marks.
- [x] Build the Dynamic Island AGENTS tab as a standalone `AgentsView.jsx` module with its own stylesheet, provider filters, activity feed, and permission actions.
- [x] Remove provider filters, task counters, and explanatory copy from the compact island view.
- [x] Replace the Agents tab's job-history focus with a concise live lifecycle feed.
- [x] Install Codex prompt/stop/interrupt hooks and Antigravity invocation/stop hooks; route thinking and answer-ready signals through the Island notification and history flow.
- [x] Build the app and run Electron syntax/diff checks after implementation.
