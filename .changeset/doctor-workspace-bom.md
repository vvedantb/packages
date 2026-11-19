---
"@vvedantb/config": patch
---

`vvedantb-doctor` now reads a `pnpm-workspace.yaml` that starts with a byte-order mark. Before, it found no workspace packages in such a file and checked only the root `package.json`, so drift in the workspaces passed.
