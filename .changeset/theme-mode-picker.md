---
"@vvedantb/ui": minor
---

Add `ThemeModePicker` (and `THEME_MODES`, `ThemeMode`): Light, Neutral, Dark and System tiles for an Appearance settings section.

`SidebarAccountMenu` `themeToggle` also takes `{ theme, onToggle }`. The item then cycles light, neutral, dark. `nextThemeInCycle(theme)` gives the next theme. `{ isDark, onToggle }` works as before.
