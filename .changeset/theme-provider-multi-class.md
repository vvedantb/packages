---
"@vvedantb/ui": patch
---

`createThemeProvider`: with `attribute="class"`, a `value` entry can now hold more than one class. For the Neutral theme pass `themes={["light", "dark", "neutral"]}` and `value={{ light: "light", dark: "dark", neutral: "dark neutral" }}`. A theme whose classes include `dark` sets `color-scheme: dark` and gives `isDark: true`.
