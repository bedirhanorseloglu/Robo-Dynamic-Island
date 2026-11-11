# Agents and Notification Ambient Design

## Intent

Make Agents feel like a calm local activity desk and carry each notification's source-app color through the island, preview, and history surfaces.

## Goals

- Give Codex and Antigravity clear, distinct connection cards and a shared local bridge status.
- Surface live agent lifecycle signals in Dynamic Island: thinking, answer ready, interrupted, and errors.
- Reuse the existing notification brand resolver and dominant-icon color for a restrained ambient glow.
- Make unread notification history easier to scan and keep the preview aligned with the selected notification color.
- Preserve keyboard access, reduced-motion preferences, local-only agent events, and existing notification actions.

## Non-goals

- Add new background polling or external notification services.
- Change how notification events are received, stored, dismissed, or opened.
- Apply the notification accent as a permanent application-wide theme.

## Visual direction

- The Dynamic Island Agents tab is a concise live signal feed: provider mark, current state, and at most a short prompt/response preview.
- Connection setup stays in Settings, where Codex and Antigravity hooks can be installed or refreshed.
- Notification ambient remains attached to each notification's app identity. A live icon dominant color wins when available; otherwise the known app brand or blue fallback is used.
- Ambient light stays low contrast, behind readable content, and does not pulse when reduced motion is enabled.
- Native app logos are rendered when Windows provides them. Per-notification image failures must not poison later notifications; chat notifications keep the sender avatar and still show the source app mark.
- Native logo extraction accepts common raster and SVG image formats within a bounded payload size. Known apps retain a recognizable local fallback mark.
- The Dynamic Island Agents tab stays intentionally compact: a short heading, provider filter chips, and a terse activity list. Omit explanatory copy and secondary metrics that compete with tasks in the limited island area.

## Interaction

- Connect or refresh the local hooks from Agents.
- Send a preview event for either provider.
- Locate or open the standalone Antigravity IDE.
- Read a notification to open its target; unread history rows carry a small accent-colored marker.
