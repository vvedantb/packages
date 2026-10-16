# @vvedantb/ui

Shared React 19 web UI. Source-exported: no build step.

| Import | What it is |
| --- | --- |
| `@vvedantb/ui` | Primitives (Radix-based) and AI elements. |
| `@vvedantb/ui/cn` | `cn` class helper (clsx + tailwind-merge). |
| `@vvedantb/ui/shell` | Router-free `SidebarHeader` and `PillTabs`. |
| `@vvedantb/ui/app` | Alt-click confirm skip, update watcher, settings chrome, `useStableAuth`. See `app/README.md` in the repository. |
| `@vvedantb/ui/tokens` | `tokens.css`: colour, radius, shadow, ease and font tokens for Tailwind v4. |
| `@vvedantb/ui/tokens/css/*.css` | `index`, `base`, `dialog`, `modal`, `tabs`, `tabs-pills`, `utilities`, `scrollbar-thin`, `animations`. |
| `@vvedantb/ui/tokens/tailwind-preset` | Tailwind preset for apps that load a JS config with `@config`. |
| `@vvedantb/ui/tokens/native` | JS colours, radii and spacing. No CSS, no React DOM. |

```css
@import "tailwindcss";
@import "@vvedantb/ui/tokens";
@source "../node_modules/@vvedantb/ui/src/**/*.{ts,tsx}";
```

`@clerk/clerk-react`, `@tanstack/react-hotkeys` and `zod` are optional peers. Install them only if you import `@vvedantb/ui/app`.

Full documentation: the repository `README.md`. Upgrading from `@vvedantb/tokens`, `@vvedantb/shell` or `@vvedantb/app-kit`: `MIGRATION.md`.
