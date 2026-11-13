---
"@vvedantb/native-ui": patch
---

Gallery, Maestro CI, and Android hand-sweep fixes. No breaking change, no removed or renamed export, no new dependency.

### Fixed

- `DropdownMenu`: `DROPDOWN_MENU.itemPaddingY` is 12 (was 8) so rows are a full 44-point target from padding and one `text-sm` line. `minHeight` stays 44 (56 with larger text).
- `Select` options (`SelectItem`): `min-h-[44px]` / `min-h-[56px]` with larger text.
- `SelectContent` on Android: options now show. Root cause: `SelectHost` put an RN `Modal` inside the primitive's Portal, and the Modal mounted as an empty window (host view only, no options). Android now skips the Portal and `SelectHost` renders a transparent `Modal` directly, as `DropdownMenuContent` does. Because the Portal's `open` gate no longer applies, `SelectHost` mounts the Modal only while the Select is open, and its `animationType` is `none` with reduce motion. iOS keeps the Portal and `FullWindowOverlay`. Web is unchanged.
- `BottomSheetContainer`: the sheet now opens on Android. Root cause: `BottomSheetModal.present()` did nothing after an RN `Modal` had been dismissed, and the named `BottomSheet` export is undefined. The component now uses the controlled default-export gorhom `BottomSheet` (`index={0}`, rendered only while `visible`), with explicit `snapPoints` (`40%`), `BottomSheetView` padding set by `style`, and a solid background on Android (glass stays on iOS). The public props are unchanged. The gallery mounts the sheet outside `GlassBlurTarget`.
- `AmbientBackground` fallback uses `StyleSheet.absoluteFill` (RN 0.86 dropped `absoluteFillObject`).
- Types for expo-router 57 (`useRouter` instead of the renamed `Router`) and RN 0.86 (`Message` layout `style`).

### Added

- `PromptInput`: with a `testID`, the field gets `<testID>-input` for UI tests.
- Expo gallery app `apps/native-gallery` (private, not published) covering every entry point, with layering and keyboard stress screens, mocked Clerk, a registry test, Maestro flows, and the `native-ui-gallery-android` CI job.
