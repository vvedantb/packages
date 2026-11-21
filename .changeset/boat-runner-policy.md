---
"@vvedantb/config": minor
---

`ci-runner` now matches the new Boat runner policy. Check jobs use `boat` (or `boat-small`). `boat-large` is only for Android release builds: the `release-android-apk.yml` and `release-gallery-android.yml` workflows, or a workflow file with `android` in its name. A `boat-large` runner on a `ci-app.yml` job fails. An unknown `boat*` label such as `boat-medium` fails and the message lists the valid labels.
