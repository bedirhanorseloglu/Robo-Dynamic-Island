# Agenda Daily View Design

## Intent

Make the Agenda screen feel calmer, clearer, and more current in the compact Dynamic Island while keeping the daily schedule as its primary view.

## Goals

- Keep the weekly date strip, day/month switch, quick add, event deletion, and local event data.
- Improve visual hierarchy across the month heading, selected date, event rows, and empty state.
- Use the project's restrained dark surfaces and blue-grey accents for consistency with Home and notification history.

## Non-goals

- Change calendar behavior, date calculations, event storage, or notification behavior.
- Remove or substantially redesign the existing month view.

## Approaches

- **Daily agenda first (selected):** retain the week strip and event list, then refine their spacing, typography, selected-date treatment, and empty state. This fits the compact panel and keeps upcoming events immediately readable.
- **Month grid first:** make the month grid the main surface and move events into a secondary view. This uses the limited panel height less effectively and adds navigation steps for the common daily task.

## Implementation notes

Prefer CSS changes in `src/styles.css`; make only small markup changes in `src/AgendaCalendar.jsx` if needed for accessible labels or clearer visual grouping. Keep keyboard focus, reduced-motion behavior, and all existing interactions intact.
