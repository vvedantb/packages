---
"@vvedantb/config": patch
---

Register the seven oxlint rules that `@vvedantb/config/oxlint/plugin.mjs` shipped but did not expose: `no-conditional-tests`, `no-inline-object-type-assertion`, `no-inline-zod-schema`, `no-is-record`, `no-ts-nocheck`, `no-unknown-shape-probing` and `prefer-schema-inferred-types`. Configuring them under `vvedantb/*` no longer fails with "Rule not found".
