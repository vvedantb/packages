---
"@vvedantb/server": patch
---

`GenerativeUiProps` are declared types (`GenerativeUiPropsMap`), not inferred from the zod schemas. An app that resolved another zod install saw enum props as `unknown`. A compile-time check fails this package's build when a schema and its declared props drift apart.
