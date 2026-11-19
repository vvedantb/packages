---
"@vvedantb/config": minor
---

The oxlint base now loads `eslint-plugin-react-you-might-not-need-an-effect` 1.0.2 as the `no-effect` JS plugin and sets its 9 rules to `error`. A repo that extends `oxlint/base.json` gets the rules with no change of its own. `@vvedantb/config/oxlint/no-effect.mjs` exports the plugin for a repo that does not extend the base.
