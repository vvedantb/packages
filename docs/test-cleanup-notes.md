# Test cleanup notes

Date: 10 November 2026. Branch: `cursor/test-cleanup-ci-67cb`.

## Why

Tests did not run on pull requests. Only the release workflow ran them. Many
tests read a source, CSS or markdown file as text and matched it with a regex.
They broke on refactors and passed on real bugs. This change deletes those
tests, runs the rest in CI, and adds a check that fails when a new test reads
source text.

## Counts

Counts come from `git ls-files` and the test runner summaries before and after
the change. Vitest and `node --test` cases are counted. The `apps/native-gallery`
workspace and its Maestro flows are not touched.

| Measure | Before | After |
| --- | --- | --- |
| Test files | 215 | 196 (plus 1 new script test) |
| Vitest cases | 4,072 | 3,308 |
| `node --test` cases (ui, server) | 76 | 47 (plus 5 new script tests) |
| Files that read source, CSS or markdown text | 56 | 0 |
| Files deleted whole | | 19 |
| Files trimmed | | 37 |

Case counts are approximate for `node --test` files, which the runner counts
by `test(` calls. The 3 skipped server cases are unchanged.

## What was deleted

- Native parity tests. They read native source and the web source, and matched
  class names, styles or markup. Examples: `controlStyles`, `mobile`,
  `searchInput`, `passwordInput`, `toast`, `tokens` (web CSS values), `markdown`,
  `buttonShape`, `tabBar`.
- Source scans. They walked `src` and matched patterns. Examples: `fontWeight`,
  `iconStroke`, `styleTypes`, `pressableStyle`, `androidShadow`, `hermesCompat`,
  `subpaths`, `exports`, `useDragSensors`, `runtimeVisibility`.
- Source contract tests in `auth`, `turnFold`, `activityStepDetail`, the
  `*.clocks.test.ts` files and `composerSlashMenu.contract.test.ts`.
- CSS text tests in `packages/ui/tokens/test`: `fonts`, `package`, and the
  calendar, keyframe and token-value cases in `tailwind` and `shadcn-alias`.
- Brand-name scans (`noAppNames` in `ui` and `server`, and the artifacts case).
  The scan pattern lived in the test file, so no product code ran.
- `client-graph.test.mjs` and the "imports nothing but react" case in
  `helpers-esm.test.mjs`. Both matched import lines in source.

Mixed files keep their behavioural cases. Unused imports and helpers were removed.

## Kept on purpose

- `helpers-esm.test.mjs` "plain Node ESM imports and renders the helpers". It
  transpiles the helpers, runs them, and fails if `motion` is needed. It carries
  an `allow-source-read` comment because the source feeds the transpiler.
- Tests that read JSON fixtures, built `dist` output, generated brand SVGs, or
  `package.json` (`config`, `server/tests/mcp`, `default-dom`, `legacy-parity`,
  `brand-assets`). They check outputs or data, not source text.
- Tailwind compile tests. They run the compiler and assert on its output.

## For review: guards with no replacement

These guarded something real. Nothing replaces them. Each needs a decision:
a behavioural test, a lint rule, or acceptance of the gap.

1. Native and web token parity (`tokens.test.ts`, `tabBar.test.ts`,
   `controlStyles.test.ts`). Native `palette` and `tokens` values were compared
   with `tokens.css` and web component classes. Drift between native and web
   is now unguarded. A generated tokens file that both sides import would
   remove the need for the check.
2. Hermes compatibility (`hermesCompat.test.ts`). It banned ES2023 array
   methods (`toSorted`, `findLast`, `Object.groupBy`) in native `src`. An oxlint
   `no-restricted-syntax` rule in `packages/native-ui` would cover this.
3. Client import graph (`client-graph.test.mjs`). It checked that the client
   graph of `@vvedantb/ui` imports no server, Convex, Clerk or `node:` module.
   The other `*-esm.test.mjs` files still load real entry points. A bundler
   check on the client entry would be the behavioural replacement.
4. Package exports and subpaths (`subpaths.test.ts`, `exports.test.ts`). They
   matched `package.json` exports to files in `src`. `pnpm build` in `ui`
   runs `check-exports.mjs`. `native-ui` has no equivalent. `pnpm typecheck:consumer`
   covers part of it.
5. Brand-name leakage (`noAppNames`). Shared packages must not name an app.
   An oxlint rule or a repository grep step in CI would cover this.
6. Web font and token CSS structure (`tokens/test/fonts`, `tokens/test/package`).
   They checked the woff2 files, licence text and CSS layer structure. The
   `build` script still runs `check-exports.mjs` and `check-component-tokens.mjs`.
7. Calendar selected-day colours (`tailwind.test.mjs`). It compiled classes from
   `calendar.tsx` and checked that today and outside rules lose to the selected
   rule. A rendered `Calendar` test in a browser-like environment would replace it.

## CI and lint

- Workflow: `.github/workflows/ci.yml`. Job name: `Typecheck and test`. It runs
  on pull requests and pushes to `main`. Steps: `pnpm install --frozen-lockfile`,
  `pnpm build`, `pnpm typecheck`, `pnpm test`. The build step is needed because
  some tests load built output.
- Lint: `scripts/check-no-source-text-in-tests.mjs`. `pnpm test` runs it first
  (also as `pnpm lint:tests`). It flags `readFileSync`, `readFile`,
  `readdirSync`, `readdir` and `createReadStream` in test files when the
  arguments name source, CSS, markdown or script files, and `?raw` imports.
  Reads of JSON and build output pass. An `allow-source-read: <reason>`
  comment allows one read. The rule is a heuristic. A read through a variable
  that holds a path to source is not caught.
- The oxlint config in `@vvedantb/config` does not run in this repository. It
  is shipped to consumers, so the rule was not added there.
