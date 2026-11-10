# Typography System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize TwoCode font roles and expose persistent text and numeric font choices in Settings.

**Architecture:** A shared typography registry owns font families and clock options. It initializes CSS role variables before React renders; the selected UI and numeric families persist locally and synchronize between Electron windows. Main and Settings CSS consume the same semantic role tokens.

**Tech Stack:** React, CSS custom properties, Vite, Electron localStorage.

**Spec:** `docs/superpowers/specs/2026-11-11-typography-system-design.md`

## Global Constraints

- UI text defaults to Inter, code to JetBrains Mono, and numbers to the chosen Home clock font.
- Settings offers the five existing clock font choices for both UI text and numeric values.
- Numeric font choice continues to update the Home clock and all numeric displays.
- Preferences persist locally and synchronize across the app and Settings window.
- Do not change component layout, color, or spacing; do not add dependencies or tests.

## Review Focus

- Older clock preferences without a text font must retain the Inter default.
- Invalid stored font indices must fall back to the existing safe default.
- A font choice changed in Settings must update the main window and vice versa.
- Code snippets must retain the monospace role after family declarations are migrated.
- Clock font preview chips must keep showing their respective font faces.

---

### Task 1: Central typography registry and initialization

**Files:**
- Create: `src/typography.js`
- Create: `src/typography.css`
- Modify: `src/main.jsx`, `index.html`, `src/HeroClock.jsx`

**Interfaces:**
- `FONT_ROLES` provides UI, code, display, and clock font family values.
- `CLOCK_FONT_OPTIONS` provides five `{ name, family, previewClass }` records.
- `initializeTypography()` sets CSS role variables, restores saved font choices, loads the required Google font stylesheet, and listens for cross-window clock preference changes.

- [ ] Define the font role registry and five shared clock font options.
- [ ] Initialize role variables before the React root mounts; move Google Fonts URL generation out of `index.html`.
- [ ] Make `HeroClock` and its preview options consume `CLOCK_FONT_OPTIONS`.
- [ ] Confirm `index.html` no longer holds a separate font list and the central module owns the available families.

### Task 2: Migrate application typography to semantic roles

**Files:**
- Modify: `src/styles.css`, `src/settings.css`, `src/App.jsx`

**Interfaces:**
- `typography.css` defines family aliases and semantic type roles: display, heading, body, supporting, label, code, and numeric.
- App numeric readouts consume `--font-family-number`; UI text consumes `--font-family-ui`; technical content consumes `--font-family-code`.

- [ ] Replace literal UI and monospace family declarations with role tokens in both stylesheets.
- [ ] Keep numeric readouts, date/time values, and the clock-customizer preview connected to the selected numeric family.
- [ ] Remove per-window duplicate numeric-family declarations where the root token now applies globally.
- [ ] Confirm only the central registry contains font family names outside intentional SVG/error fallbacks.

### Task 3: Add persistent font selectors in Settings

**Files:**
- Modify: `src/SettingsApp.jsx`, `src/settings.css`, `src/App.jsx`, `src/typography.js`

**Interfaces:**
- Add a `typography` Settings page with separate text-font and numeric-font selectors.
- Store UI family as `textFontIndex` in `twocode-typography-preferences`.
- Continue storing numeric family in `twocode-clock-preferences.fontIndex` for backward compatibility.
- Main App listens for preference changes from the Settings window; Settings listens for main-window changes.

- [ ] Add a Typography navigation entry and a compact two-section selector page using shared options.
- [ ] Persist text-font changes and apply the family token across main and Settings UI.
- [ ] Persist numeric selection in the existing clock preference and synchronize the Home clock, numeric readouts, and Settings preview.
- [ ] Confirm previous preferences load safely and selections remain after reopening the app.

### Task 4: Build and audit the font migration

**Files:**
- Review: `src/typography.js`, `src/typography.css`, `src/styles.css`, `src/settings.css`, `src/App.jsx`, `src/SettingsApp.jsx`, `src/HeroClock.jsx`, `src/main.jsx`, `index.html`

- [ ] Run `git diff --check`.
- [ ] Run `npm.cmd run build` and confirm Vite completes successfully.
- [ ] Search CSS and JSX for remaining hard-coded font families; verify each remaining occurrence is an intentional fallback or SVG font.
- [ ] Review the final diff for unchanged layout and properly scoped font role usage.
