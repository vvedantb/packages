---
"@vvedantb/native-ui": patch
---

Gallery, Maestro CI, and Android hand-sweep fixes. No breaking change, no removed or renamed export, no new dependency.

### Fixed

- `DropdownMenu`: `DROPDOWN_MENU.itemPaddingY` is 12 (was 8) so rows are a full 44-point target from padding and one `text-sm` line. `minHeight` stays 44 (56 with larger text).
- `Select` options (`SelectItem`): `min-h-[44px]` / `min-h-[56px]` with larger text.
- `SelectContent` on Android: options are hosted in a transparent RN `Modal` with a full-size `box-none` host (`SelectHost`), matching `DropdownMenuContent`. Nesting Portal **and** Modal left the Modal empty (host only, no options). Android now skips Portal; `SelectHost` mounts the Modal only when `open` is true.
- `BottomSheetContainer`: uses controlled gorhom `BottomSheet` (default export, `index={0}`, unmount when closed) instead of `BottomSheetModal.present()`, which did not show content after RN Modal dismiss on Android; `BottomSheetView` padding uses `style`; explicit `snapPoints`; solid sheet background on Android (glass stays on iOS). Gallery mounts the sheet outside `GlassBlurTarget`.
- `AmbientBackground` fallback uses `StyleSheet.absoluteFill` (RN 0.86 dropped `absoluteFillObject`).
- Types for expo-router 57 (`useRouter` instead of the renamed `Router`) and RN 0.86 (`Message` layout `style`).

### Added

- `PromptInput`: with a `testID`, the field gets `<testID>-input` for UI tests.
- Expo gallery app `apps/native-gallery` (private, not published) covering every entry point, with layering and keyboard stress screens, mocked Clerk, a registry test, Maestro flows, and the `native-ui-gallery-android` CI job.
