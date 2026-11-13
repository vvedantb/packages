---
"@vvedantb/ui": minor
---

Ships compiled code: `dist/` is built with React Compiler (target 19) and plain JavaScript (JSX compiled to `react/jsx-runtime`), so apps get memoised components without compiling `node_modules`. It covers `src` and the `app`, `shell` and `tokens` sources it imports, at the same paths. Types still come from `src`, and Tailwind `@source` still scans `src`, `app/src` and `shell/src`. A `source` export condition points at `src`. All `"use client"` directives are removed: no consumer uses React Server Components. 21 components the compiler skips (Rules of React breaks) ship unmemoised, as before; `compiler-baseline.json` lists them and a new skip fails the build.
