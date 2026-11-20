---
"@vvedantb/native-ui": minor
---

Add `UpdateChecker` and `UpdatePrompt`: an "Update available" prompt for apps that ship their Android APK as GitHub releases. `UpdateChecker` looks for a newer release once at start (`source={{ repo, tagPrefix }}`, or your own `check`) and offers it with Later, Download and "Install from V Store". "Install from V Store" only opens V Store (`vstore://updates` by default, set `vStoreUrl` to change it); when V Store is not installed the button is replaced by a notice and Download stays. `showDownload` and `showVStore` choose which of the two is offered. Later is remembered through the `storage` you pass. Also exports `fetchGitHubUpdate`, `newerGitHubRelease`, `isNewerVersion` and `V_STORE_UPDATES_URL`.
