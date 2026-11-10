# Agenda Daily View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the daily Agenda view into a clearer, calmer modern calendar while preserving its existing behavior.

**Architecture:** Keep `AgendaCalendar` as the owner of selection, day/month navigation, and event form state. Restyle the existing compact week strip, event list, empty state, and month grid in the existing stylesheet; make only small JSX changes for accessible state if needed.

**Tech Stack:** React 19, Vite 6, plain CSS, lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-10-agenda-daily-design.md`

## Global Constraints

- Keep the weekly date strip, day/month switch, quick add, event deletion, and local event data.
- Preserve calendar behavior, date calculations, event storage, and notification behavior.
- Keep the existing month view available.
- Retain keyboard focus, reduced-motion behavior, and all current interactions.

## Review Focus

- **No events on the selected day:** the empty state stays centered and readable.
- **Many events:** the list remains scrollable without covering the local-storage footer.
- **Long event titles:** titles truncate cleanly while remaining available to assistive technology.
- **Quick-add open:** title/time inputs and submit action remain visible and usable.
- **Month view with four, five, or six week rows:** the grid remains inside the compact panel.

---

### Task 1: Refine the daily Agenda visual system

**Files:**
- Modify: `src/styles.css` (Agenda selectors around `.agenda-tab-view` through `.agenda-local-label`)
- Modify only if needed: `src/AgendaCalendar.jsx` (Agenda structure and selected-state accessibility)

**Interfaces:**
- Consumes: `AgendaCalendar({ events, onAddEvent, onDeleteEvent })`
- Produces: the same component API and behavior, with clearer selected-date semantics if markup changes are needed.

- [ ] Update the Agenda layout styles for a clearer heading, restrained blue-grey accents, comfortable date cells, calm event rows, and a centered empty state. Keep the compact dark panel and current visual density.
- [ ] If changing JSX, add `aria-pressed` to day/month and date-selection buttons without changing their click behavior.
- [ ] Inspect empty, populated, quick-add, and month states; check long titles, six-row months, keyboard focus, and reduced-motion behavior.
- [ ] Run `npm.cmd run build` and resolve any build errors.
- [ ] Run `21st review src/AgendaCalendar.jsx src/styles.css` if the CLI is available; apply only deterministic UI fixes.
