import type { Plugin, Rule } from "@oxlint/plugins";

// `@oxlint/plugins` ships `defineRule` and `definePlugin` as identity functions. They are
// inlined so this package keeps no runtime dependency; the types come from a dev dependency.
export const defineRule = (rule: Rule): Rule => rule;
export const definePlugin = (plugin: Plugin): Plugin => plugin;
