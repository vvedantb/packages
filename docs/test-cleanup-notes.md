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

- Tests added by the native-ui 0.14.0 parity release that read source, CSS or
  web markup: `chatParity.test.ts` and `settingsParity.test.ts` (deleted whole),
  and the source cases in `choiceQuestion`, `configureTheme`, `controlStyles`,
  `markdown`, `native012`, `quotedReplies`, `turnFold` and `tabsTriggerHeight`.
  `chatParity` read source through a `read()` helper, which `lint:tests` does
  not catch. Review new tests for this pattern.
  `chatParity.test.ts` and `settingsParity.test.ts` are replaced by behavioural
  tests of the same names. They import the native exports and call or render
  the components with stubs, and hold the web values as numbers (14 / 20,
  22.75, 11 / 16, blockGap 16 and others). They are not accepted gaps. They
  read no source, CSS or web markup.

Mixed files keep their behavioural cases. Unused imports and helpers were removed.

## Kept on purpose

- `helpers-esm.test.mjs` "plain Node ESM imports and renders the helpers". It
  transpiles the helpers, runs them, and fails if `motion` is needed. It carries
  an `allow-source-read` comment because the source feeds the transpiler.
- Tests that read JSON fixtures, built `dist` output, generated brand SVGs, or
  `package.json` (`config`, `server/tests/mcp`, `default-dom`, `legacy-parity`,
  `brand-assets`). They check outputs or data, not source text.
- Tailwind compile tests. They run the compiler and assert on its output.

## Guards: replaced and accepted gaps

Items 1 to 5 guarded something real. Each now has a check that runs code
instead of reading source text in a test. Items 6 and 7 stay as accepted gaps.

| # | Old guard | Status | Replacement |
| --- | --- | --- | --- |
| 1 | Native and web token parity (`tokens.test.ts`, `tabBar.test.ts`, `controlStyles.test.ts`) | **Replaced** | `packages/native-ui/tests/tokenParity.test.ts` (vitest, runs in `pnpm test`) |
| 2 | Hermes compatibility (`hermesCompat.test.ts`) | **Replaced** | `packages/native-ui/scripts/check-hermes-compat.mjs` (`pnpm check:guards`) |
| 3 | Client import graph (`client-graph.test.mjs`) | **Replaced** | `packages/ui/scripts/check-client-graph.mjs` (`pnpm check:guards`) |
| 4 | Package exports and subpaths (`subpaths.test.ts`, `exports.test.ts`) | **Replaced** | `packages/native-ui/scripts/check-exports.mjs` (native-ui `build` and `pnpm check:guards`). `ui` keeps `tokens/scripts/check-exports.mjs`. |
| 5 | Brand-name leakage (`noAppNames`) | **Replaced** | `scripts/check-no-app-names.mjs` (`pnpm check:guards`) |
| 6 | Web font and token CSS structure (`tokens/test/fonts`, `tokens/test/package`) | **Accepted gap** | None. `build` still runs `check-exports.mjs` and `check-component-tokens.mjs`. |
| 7 | Calendar selected-day colours (`tailwind.test.mjs`) | **Accepted gap** | None. A rendered `Calendar` test would replace it if the risk grows. |

What each replacement does:

1. **Token parity.** Imports the `tokens` copy in `native-ui` and the copy in
   `ui/tokens/src/native.ts` and compares them with `toEqual`. It also checks
   that the `palette` neutrals match the tokens, and that the native page title
   (`PAGE_TITLE_CLASS`, `pageTitleStyle()`) matches the web `pageTitleClass`:
   Instrument Sans, weight 600, 20 px (line height 25, letter spacing -0.5). It
   reads no file text.
   Limits: the web semantic colours (primary, danger and others) exist only in
   `tokens.css`, so `palette` is not compared with the web. The test imports
   `ui/tokens/src/native.ts`, the module that `@vvedantb/ui` re-exports as
   `tokens`, by relative path and not through the heavy root entry. The web
   page title has no numeric export, so 20 px, 600 and the 25 and -0.5 values
   are fixed in the test and derived from the Tailwind defaults.
2. **Hermes.** Strips comments from `native-ui/src` and bans `toSorted`,
   `toReversed`, `toSpliced`, array `.with(`, `findLast`, `findLastIndex`,
   `Object.groupBy` and `Map.groupBy`. It is a script, not a test, so the
   no-source-text lint does not apply. It checks its own patterns before the scan.
3. **Client graph.** Bundles `src/client.ts` with esbuild (browser platform,
   metafile) and fails if the resolved graph reaches `@vvedantb/server`, Convex,
   `@clerk/*` or a Node built-in. A positive control bundles `src/index.ts` and
   fails unless that graph reaches all of them. esbuild is a new `ui`
   devDependency (pinned to 0.28.2, already in the lockfile through Vite). The
   check needs the built `@vvedantb/server`, so it runs after `pnpm build`.
4. **Exports.** Fails when a `native-ui` `package.json` export target is not a
   file. Wildcard targets are skipped, as in the `ui` script.
5. **App names.** Same pattern as the old tests, with `vibot_pro` removed before
   the match. `ui`: `.ts`, `.tsx`, `.svg` and `.css` under `src`, `shell/src`
   and `app/src`, skipping tests and `src/brand/`. `server`: everything under
   `src` and `docs`, plus `README.md`, `CHANGELOG.md` and `package.json`.

## CI and lint

- Workflow: `.github/workflows/ci.yml`. Job name: `Typecheck and test`. It runs
  on pull requests and pushes to `main`. Steps: `pnpm install --frozen-lockfile`,
  `pnpm build`, `pnpm typecheck`, `pnpm check:guards`, `pnpm test`. The build
  step is needed because some tests and the client graph check load built output.
- Guards: `pnpm check:guards` is its own CI step, named `Guards`. It runs
  `check:hermes` and `check:exports` in `native-ui`, `check:client-graph` in `ui`,
  and `scripts/check-no-app-names.mjs`. `ci:publish` runs it too. Native-ui
  `build` also runs `check-exports.mjs`, so `pnpm build` fails on a missing target.
  The token parity test is a vitest file in `native-ui`, so the `Test` step runs it.
- Lint: `scripts/check-no-source-text-in-tests.mjs`. `pnpm test` runs it first
  (also as `pnpm lint:tests`). It flags `readFileSync`, `readFile`,
  `readdirSync`, `readdir` and `createReadStream` in test files when the
  arguments name source, CSS, markdown or script files, and `?raw` imports.
  Reads of JSON and build output pass. An `allow-source-read: <reason>`
  comment allows one read. The rule is a heuristic. A read through a variable
  that holds a path to source is not caught.
- The oxlint config in `@vvedantb/config` does not run in this repository. It
  is shipped to consumers, so the rule was not added there.
