# TwoCode Typography System

## Intent

Give TwoCode a deliberate, consistent type hierarchy that can be changed centrally, while letting the user choose interface text and numeric fonts from Settings.

## Goals

- Use one UI font role for application text and headings.
- Keep code and technical readouts in a dedicated monospace role.
- Let the selected numeric font follow the existing Home clock font choice everywhere numbers appear.
- Add persistent UI text and numeric font selectors to Settings.
- Keep font families and role mappings in one reusable typography module.

## Non-goals

- Redesign component spacing, colors, or layout.
- Remove the five existing Home clock font choices.
- Add new font dependencies or require bundled font files.

## Approaches

- **One family for all text:** simplest, but loses clear code and numeric roles and conflicts with the Home clock font preference.
- **Central role tokens (chosen):** UI text uses the selected text family, code remains JetBrains Mono, and numbers use the selected numeric font. A single font registry supplies the CSS roles and the existing clock choices.

## Behavior and constraints

- Default UI family is Inter; default code family is JetBrains Mono; default numeric family is the existing Home clock choice.
- The text selector offers the existing clock font families as UI choices; the numeric selector uses the same five choices and updates the existing Home clock font preference.
- Preferences persist locally and synchronize between the main app and the Settings window.
- Semantic roles cover display, heading, body, supporting text, labels, code, and numeric values; existing component sizes and layout remain intact.
- Existing Google Fonts loading remains in use and is generated from the central font registry.
