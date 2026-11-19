---
"@vvedantb/config": minor
---

The oxlint base now loads the 9 rules of `eslint-plugin-react-you-might-not-need-an-effect` 1.0.2 as the `no-effect` JS plugin and sets them to `error`. A repo that extends `oxlint/base.json` gets the rules with no change of its own. The plugin is bundled into `@vvedantb/config/oxlint/no-effect.mjs`, so the package adds no dependency and no app installs ESLint. A repo that does not extend the base can name that file as its `jsPlugins` specifier.
