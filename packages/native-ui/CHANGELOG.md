# Changelog

## 0.3.0

Parity with `@vvedantb/ui` 0.29.0. The full audit is in `docs/native-ui-parity.md` at the repository root.

- New components with the web names: `Textarea`, `Label`, `Badge`, `Checkbox`, `Separator`, `Progress`, `Spinner`, `CenteredSpinner`, `Avatar` (`AvatarImage`, `AvatarFallback`, plus `initials()`), `StatusDot`, `LabeledSwitchRow`, `Tabs` (`TabsList`, `TabsTrigger`, `TabsContent`; `pills`, `segmented` and `soft` variants).
- Overlays on RN `Modal`, with no new dependency: `Dialog` (`DialogTrigger`, `DialogClose`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogBody`, `DialogFooter`), `AlertDialog` (with `AlertDialogAction` and `AlertDialogCancel`), `ConfirmDialog` and `Sheet` (a bottom sheet: `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetHandle`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetBody`, `SheetFooter`). Triggers and closes take `asChild`. Android back closes them; only `AlertDialog` ignores backdrop taps.
- `toast()` and `<Toaster />`: top toasts under the safe area, with the sonner call shape (`toast.success`, `.error`, `.warning`, `.info`, `.loading`, `.dismiss`), replace-by-`id` and one `action`. Mount `<Toaster />` once near the app root.
- Family app marks, ported from `@vvedantb/ui/brand`: `APP_ICONS`, `IconVibot`, `IconVhub`, `IconVmem`, `IconVerve`, `IconVelth`, `IconProjectV`, `AppMark` and `AppWordmark` (Instrument Sans 500, -0.02em). `svg.ts`, `familyApps.ts` and `vProAppBenefits.ts` are byte-identical copies of the web files, so `APP_MARKS`, `APP_NAMES`, `FAMILY_APPS`, `familyApp`, `V_PRO_APP_BENEFITS` and the rest are exported too.
- `UpgradeToProCard` (the web `SidebarUpgradeCard`) and `PricingModal` (the web multi-plan layout as a page sheet, with `onCheckout`).
- `palette` and `withAlpha`: the web semantic colours (`primary`, `danger`, `success`, `warning`, `default`, `overlay`, `segment` and others) in light and dark, converted from `tokens.css`. `fontClass` lists the Instrument Sans classes.
- `Button`: new variants `default` (same as `primary`), `destructive`, `ghost` and `link`; new sizes `sm`, `default`, `lg` (same as `small`, `medium`, `large`) and `icon`; `startContent` and `endContent`; `children` is optional. It now sets `accessibilityState` (`disabled`, `busy`). Fix: with the default shadow, a caller `style` was dropped; it is now applied after the shadow.
- `Card`: new parts `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` and `CardFooter`, and new `description` and `className` props. The `title`, `leftIcon` and `action` props are unchanged.
- `EmptyState`: the props API is unchanged, and `EmptyState.Root`, `.Icon`, `.Title`, `.Description` and `.Actions` compose it as on the web (`default` and `panel` variants).
- `Skeleton` takes `View` props, holds still with Reduce Motion and is hidden from screen readers. `Input`'s default placeholder colour follows the colour scheme (unchanged in light mode).
- New entry `@vvedantb/native-ui/gallery`: `ParityGallery`, a screen that renders the components above for checking on a device.
- New optional peer `react-native-svg`, for the app marks. Apps that meet the existing peers already have it: `lucide-react-native` and `@tabler/icons-react-native` both require it. No new dependencies; the lockfile is unchanged.
- New `typecheck` script. It checks the package against local declarations of the peers (`types/peers.d.ts`, not published), because the React Native peers are not installed in this repository.
- `tokens.ts` values are unchanged. Its header comment no longer claims that every value matches `tokens.css`; the parity doc lists the differences.

## 0.2.1

- `exports` now includes `./package.json`, so tools that read `@vvedantb/native-ui/package.json` (Metro, bundlers, version checks) resolve it instead of failing with `ERR_PACKAGE_PATH_NOT_EXPORTED`. The `.` entry is unchanged.
- Adds the `prepack` entry check to the published `package.json` (it already ran in this repository after 0.2.0).
