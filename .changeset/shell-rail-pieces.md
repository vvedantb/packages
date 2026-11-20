---
"@vvedantb/ui": minor
---

Rail-variant pieces. In `AppShell variant="rail"` the sidebar panel shrinks into `RailCollapseTile` on hide and grows back out on show, and the main content slides with the sidebar width; `panelMotion="none"` (rail only) turns it off, and `"floating"` is unchanged. New exports: `toggleShellPanel`, `popOutShellPanel`, `popInShellPanelNextFrame`, `shellDockTileProps`; the dock motion functions `dockPopIn`, `dockNudge`, `dockPopOut`, `slideWith`, `slideNextResize`, `dockMotionOff`, `DOCK_MOTION_EVENT`, `DockMotionEvent`; `ButtonTrack` and `buttonTrackClass` (a trough for header or rail buttons); `SidePanelTabs` (tabs on a rail beside a content card, with `popOutSidePanel` and the rail width constants). All new motion stops with `MotionProvider reducedMotion` and `PageMotionProvider disabled`. Also exports `useAppShellVariant` and `AppShellVariant` from the root and client entries, which the `variant` release left out.
