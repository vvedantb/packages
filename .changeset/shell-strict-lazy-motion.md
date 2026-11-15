---
"@vvedantb/ui": patch
---

The app shell drawer (`Sidebar.Aside`) and its backdrop (`Sidebar.Backdrop`) render `m.*` components in their own `LazyMotion`, so the shell works inside an app's strict `LazyMotion`. Before, every page threw "You have rendered a `motion` component within a `LazyMotion` component".
