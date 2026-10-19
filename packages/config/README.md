# @vvedantb/config

Shared tooling for vvedantb apps: tsconfig bases, an oxlint base, pinned tool versions, a `sync` CLI and a packaged Electron `app.asar` module check (`vvedantb-check-asar`).

## Install

```sh
npm install -D @vvedantb/config
npm install -D @electron/asar   # only for vvedantb-check-asar list
```

## Exports

The only JS entry is the root (`@vvedantb/config`). The JSON files below are also exported by path, because TypeScript (`extends`) and oxlint resolve them as files, not as modules:

- `@vvedantb/config/tsconfig/base.json`, `web.json`, `convex.json` and `react-native.json`
- `@vvedantb/config/oxlint/base.json`
- `@vvedantb/config/package.json`

## tsconfig bases

```json
{ "extends": "@vvedantb/config/tsconfig/web.json", "include": ["src"] }
```

| File | Use |
| --- | --- |
| `tsconfig/base.json` | Strict flags: `strict`, `skipLibCheck`, `isolatedModules`, `moduleDetection: force`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`, `noUncheckedIndexedAccess`. |
| `tsconfig/web.json` | Extends base. DOM libs, `jsx: react-jsx`, bundler resolution, `noEmit`. Add `paths` and `types` (for example `vite/client`) in the app. |
| `tsconfig/convex.json` | Extends base. The settings Convex requires: bundler resolution, `jsx: react-jsx`, `target: ESNext`, `lib: [ES2022, dom]`, `module: ESNext`, `noEmit`, `types: [node]`. |
| `tsconfig/react-native.json` | Extends base. Expo and React Native: `jsx: react-jsx`, bundler resolution, `lib: [ES2022]`, `noEmit`. |

Convex: `convex/tsconfig.json` (or `packages/backend/convex/tsconfig.json`)

```json
{
  "extends": "@vvedantb/config/tsconfig/convex.json",
  "include": ["./**/*"],
  "exclude": ["./_generated"]
}
```

## oxlint base

```json
{ "extends": ["./node_modules/@vvedantb/config/oxlint/base.json"] }
```

Generic rules only: plugins `typescript`, `import`, `unicorn`, `react`; `suspicious` as error; ignore patterns for build output and generated files; `no-explicit-any`, `no-non-null-assertion`, `consistent-type-imports`, `no-floating-promises`, `import/no-cycle`, `react/rules-of-hooks`, `react/exhaustive-deps`, `no-console` (allows `warn`, `error`, `info`) and `no-unused-vars` (ignores `^_`). It has no app plugins and no path overrides. Apps add their own `jsPlugins`, `rules` and `overrides`. `no-floating-promises` needs type-aware linting (`oxlint-tsgolint`).

The severity of `no-console` and `no-unused-vars` is set to `error` here. It was not copied from the source app file, which was not in the extract. Check it against the app.

## Versions

```ts
import { versions } from "@vvedantb/config";
```

The `./versions` subpath was removed in 0.2.0; import from the root.

| Tool | Range |
| --- | --- |
| typescript | `^5.9.0` |
| vitest | `^3.2.0` |
| pnpm | `>=10 <11` |
| convex | `^1.0.0` (guidance only; apps pin an exact version) |
| node | `>=22` for the ui monorepo, `>=20` for apps |

## sync

```sh
npx @vvedantb/config sync            # write
npx @vvedantb/config sync --check    # CI: exit 1 if anything would change
npx @vvedantb/config sync --cwd ../app
```

The `vvedantb-config` bin is the same command. Run from the repo root.

| Target | Behaviour |
| --- | --- |
| `.claude/commands/{stage,changelog,push,ship}.md` | Managed. Overwritten on every sync. |
| `CLAUDE.md` | Created from a skeleton if missing. If present, the four headings (`## Git / ship`, `## Always`, `## Domain docs (read when relevant)`, `## Product facts`) are appended when absent. Existing bodies, including Product facts, are never changed. Drift means a missing heading only. |
| `.cursor/environment.json` | Created if missing. If present, other keys are kept. `install` gains the Claude Code CLI step (sudo, then `~/.local` fallback) and `pnpm install` when either is absent. |
| `convex/tsconfig.json` or `packages/backend/convex/tsconfig.json` | Only when that folder exists. Created if missing. If present, `extends` is set to `@vvedantb/config/tsconfig/convex.json`; other keys are kept. Comments in an existing file are lost on rewrite. |

Exit codes: 0 in sync (or written), 1 drift under `--check`, 2 bad arguments or an unparsable JSON file. A second `sync` changes nothing.

CI example:

```yaml
- run: npx @vvedantb/config sync --check
```

## check-asar

`vvedantb-check-asar` fails a packaged Electron app when the build left a runtime module out of `app.asar`. Run it after packaging, from the app root.

```sh
vvedantb-check-asar list    [app.asar] [--default-asar <path>]... [--scan <dir>]... [--require <package>]... [--root <dir>]
vvedantb-check-asar resolve [binary] [app.asar] [--default-binary <path>] [--scan <dir>]... [--skip-dir <name>]... [--hook <module>] [--root <dir>]
```

Relative `--default-asar`, `--default-binary`, `--hook` and (in `list`) `--scan` paths are read from `--root` (default: the current directory). Positional paths are read from the current directory.

### list

1. Finds `app.asar`: the argument, then `$ASAR`, then the first `--default-asar` that exists.
2. Lists the archive with `@electron/asar` `listPackage`.
3. Scans every `.js`, `.cjs` and `.mjs` file under each `--scan` directory on disk. A missing directory is skipped.
4. Maps each import specifier to a package name. Relative paths, `node:`, `electron` and Node built-ins are dropped. A specifier has no spaces or commas, so a word list such as `["the", "from"]` is not read as an import.
5. Adds each `--require` package. Use it for optional peers that a dependency loads but the bundles never name.
6. Requires `node_modules/<package>/package.json` in the archive for each package.

Output:

| Case | Stream | Message | Exit |
| --- | --- | --- | --- |
| Every package found | stdout | `Checked <n> packages in <asar>: <names>`, then `check-asar-modules: OK` | 0 |
| Packages missing | stdout, then stderr | The `Checked` line, then `Missing from app.asar: <names>` | 1 |
| No asar found | stderr | `app.asar not found (tried <path or defaults>). Pass a path or set ASAR.` | 1 |

### resolve

Plain Node cannot read an asar. The CLI starts the packaged binary with `ELECTRON_RUN_AS_NODE=1` and runs itself inside it, where Electron's asar support is active. The binary is the argument or `--default-binary`. `app.asar` is the argument or `<binary dir>/resources/app.asar`.

Inside the binary:

1. Scans the JS under each `--scan` directory inside `app.asar`. Directories named by `--skip-dir` are skipped at any depth. A missing `--scan` directory throws.
2. Collects bare specifiers with subpaths kept (`dep/sub`). Relative paths, `node:`, `electron` and Node built-ins are dropped.
3. Resolves each specifier with `require.resolve` from `app.asar/package.json`, then prints `checked <files> JS files, <imports> unbundled imports`.
4. Imports the `--hook` module and calls its default export with `{ asar }`. The hook returns a list of problems (nothing means it passed). Use it for checks that belong to the app, such as native files in `app.asar.unpacked` or booting a bundled module.
5. Prints each problem as `FAIL <problem>` to stderr and exits 1. Otherwise it prints `CHECK_ASAR_OK`.

An unresolved import is reported as `unresolved import "<spec>": <error message>`. Without the asar, the CLI prints `No asar at <path>. Package the app first.` and exits 1. If the binary cannot start, it exits 1. Otherwise the binary's exit code is passed through.

```js
// scripts/check-asar-hook.mjs: runs inside the packaged binary
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** @type {import("@vvedantb/config").AsarCheckHook} */
export default async function ({ asar }) {
  const problems = [];
  const native = join(`${asar}.unpacked`, "dist", "native", "addon.node");
  if (process.platform === "darwin" && !existsSync(native)) problems.push(`missing native file: ${native}`);
  try {
    const { boot } = await import(pathToFileURL(join(asar, "dist", "boot.js")).href);
    console.info(`boot ok: ${(await boot()) === null ? "null" : "value"}`);
  } catch (error) {
    problems.push(`bundled boot path failed: ${error.stack ?? error}`);
  }
  return problems;
}
```

### Per-app invocation

Each line reproduces one app's earlier `scripts/check-asar-modules.mjs`: the same inputs, messages and exit codes. Put it in the app's `check:asar` script.

- An app built with electron-vite that ships macOS builds:

  ```sh
  vvedantb-check-asar list \
    --default-asar "release/mac-arm64/<Product>.app/Contents/Resources/app.asar" \
    --default-asar "release/mac/<Product>.app/Contents/Resources/app.asar" \
    --scan out/main --scan out/preload --require electron-store
  ```

- An app bundled with esbuild into `dist`, packaged as a Linux dir build by default, with native files and a bundled module to boot:

  ```sh
  vvedantb-check-asar resolve --default-binary "release/linux-unpacked/<binary>" \
    --scan dist --skip-dir renderer --hook scripts/check-asar-hook.mjs
  ```

  The app's native-file and boot checks, and their messages, move into the hook unchanged.

Exit codes for both modes: 0 passed, 1 failed, 2 bad arguments.

## Develop

```sh
pnpm --filter @vvedantb/config build
pnpm --filter @vvedantb/config test
```

Publish from a logged-in npm machine after a version bump: `pnpm --filter @vvedantb/config exec npm publish`. `prepack` builds `dist`.
