---
"@vvedantb/native-ui": minor
---

Ships compiled code: `dist/` is built with React Compiler (target 19), so apps get memoised components without compiling `node_modules` (Expo never does). TypeScript is stripped; JSX stays JSX, so the app's NativeWind JSX transform still handles `className`. Types still come from `src`, and Tailwind still scans `src`. A `source` export condition serves `src` to dev tools that ask for it (the gallery dev server). Eight components the compiler skips (Rules of React breaks) ship unmemoised, as before; `compiler-baseline.json` lists them and a new skip fails the build.
