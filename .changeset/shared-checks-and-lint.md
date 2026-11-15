---
"@vvedantb/config": minor
---

Add two bins and extend the shared oxlint plugins. `vvedantb-check-shared-ui` checks the shared site header and footer, with flags for the directories, pages and hosts that differ per app. `vvedantb-check-no-source-text` fails when a test reads source text. The `vvedantb` oxlint plugin gains seven rules: `no-conditional-tests`, `no-inline-object-type-assertion`, `no-inline-zod-schema`, `no-ts-nocheck`, `no-unknown-shape-probing`, `no-is-record` and `prefer-schema-inferred-types`. A new `@vvedantb/config/oxlint/anti-slop.js` plugin ships ten anti-slop rules.
