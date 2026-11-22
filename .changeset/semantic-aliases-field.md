---
"@vvedantb/ui": minor
"@vvedantb/native-ui": minor
---

Add semantic aliases, exported recipes and a `Field` compound. Nothing existing changes.

- `Button` `variant`: `primary` (= `default`), `tertiary` (= `ghost`) and `danger` (= `destructive`). `size`: `md` (= `default`). The omitted-prop defaults stay the same. Native `Button` also gains `success`, `warning` and `flat`.
- `Spinner` `size="default"` equals `md`. `SearchInput` `size="default"` equals `md` (web); its omitted default stays `sm`. `ConfirmDialog` sizes are documented as width caps.
- Web: export `buttonVariants`, `badgeVariants`, `tabsBarVariants` and the `ButtonVariant`, `ButtonSize` and `ButtonShape` types. `UiConfigProvider` overrides do not apply to raw `buttonVariants()` calls.
- `Field`, `FieldLabel`, `FieldControl`, `FieldDescription` and `FieldError` link a label, a control, a hint and an error (`htmlFor`, `id` and `aria-describedby` on web; `nativeID` and `accessibilityLabelledBy` on native). A plain `Input` is unchanged.
- Native `controlStyles` helpers are documented as internal.
