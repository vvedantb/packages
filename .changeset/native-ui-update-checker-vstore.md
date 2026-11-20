---
"@vvedantb/native-ui": minor
---

`UpdateChecker`: new `vStore` prop. It asks V Store for the app's newest version (`{ packageName }`), so the check also works for an app in a private repository, where `source` cannot read the GitHub releases. Without `vStore.downloadUrl`, Download is hidden and "Install from V Store" is the one action. New exports: `fetchVStoreUpdate`, `V_STORE_SITE_URL` and the `VStoreSource` type. Apps that use `source` or `check` need no change.
