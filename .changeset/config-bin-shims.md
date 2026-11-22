---
"@vvedantb/config": patch
---

The `vvedantb-*` bins are now small committed files in `bin/` that import the built CLI from `dist`. pnpm links a bin only when its file exists at install: in a workspace `dist` does not exist yet, so no bin was linked and scripts such as `vvedantb-check-shared-ui` failed. The commands and their behaviour do not change.
