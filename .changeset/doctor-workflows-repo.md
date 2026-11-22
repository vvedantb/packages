---
"@vvedantb/config": patch
---

`vvedantb-doctor` accepts the shared workflow from `vvedantb/workflows`. Before, `ci-reusable-workflow` and `ci-commands` failed for a repo that called `vvedantb/workflows/.github/workflows/ci-app.yml`, because the doctor looked only for the `vvedantb/packages` path. A call to the older path still passes.
