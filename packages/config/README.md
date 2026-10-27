# @vvedantb/config

Shared tooling for vvedantb apps: tsconfig bases, an oxlint base, Vite, Vitest, Babel and Metro presets, a WXT preset and host-permission helper for Chrome extensions, pinned tool versions, a `sync` CLI, a packaged Electron `app.asar` module check (`vvedantb-check-asar`) and a CLI that adds an extension to Clerk's allowed origins (`vvedantb-clerk-allow`).

## Install

```sh
npm install -D @vvedantb/config
npm install -D @electron/asar   # only for vvedantb-check-asar list
```

## Exports

There are two JS entries: the root (`@vvedantb/config`) and `@vvedantb/config/extension` (0.4.0, see [Chrome extensions](#chrome-extensions-wxt)). Each is an ES module exported under the `default` condition, so both `import` and `require()` reach it. `require()` of an ES module needs Node 20.19+ or 22.12+, which every Expo SDK from 54 needs anyway. The JSON files below are also exported by path, because TypeScript (`extends`) and oxlint resolve them as files, not as modules:

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

## Vite and Vitest presets

The root never imports Vite or a plugin. The app imports its plugins and passes the factories in, so the versions stay the app's own. The functions return plain objects; spread them into Vite's `defineConfig` and add `server`, `base` or `root` there.

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import { REACT_DEDUPE, defineWebViteConfig, srcAlias } from "@vvedantb/config";

export default defineConfig({
  ...defineWebViteConfig({
    tailwindcss,
    router: { plugin: tanstackRouter, options: { routesDirectory: "./src/routes" } },
    react: { plugin: react, compiler: true },
    alias: srcAlias(import.meta.dirname),
    dedupe: REACT_DEDUPE,
    vendorChunks: true,
  }),
  server: { port: 5173 },
});
```

`defineWebViteConfig` options:

| Option | Result |
| --- | --- |
| `tailwindcss` | `tailwindcss()`, first plugin. |
| `router: { plugin, options? }` | `plugin({ ...options, autoCodeSplitting: true })`, after Tailwind. Options: `target`, `routesDirectory`, `generatedRouteTree`, `routeFileIgnorePattern`. |
| `react: { plugin, compiler? }` | After the router. `compiler: true` calls `react({ compiler: true })` (plugin-react 6.1+). `compiler: { babel, preset }` calls `react()` then `babel({ presets: [preset()] })`, for `@rolldown/plugin-babel` with `reactCompilerPreset`. No `compiler` calls `react()`. |
| `plugins` | App plugins, last. Falsy entries are dropped, so `flag && plugin()` works. |
| `tsconfigPaths` | `resolve.tsconfigPaths: true`. |
| `alias` | `resolve.alias` as given (object or `{ find, replacement }` list). `srcAlias(dir)` is `{ "@": "<dir>/src" }`. |
| `dedupe` | `resolve.dedupe` as given. `REACT_DEDUPE` is `react`, `react-dom`, `convex`, `@tanstack/react-router`, `@clerk/clerk-react`. |
| `vendorChunks` | `build`: `outDir: "dist"`, `chunkSizeWarningLimit: 1000` and rolldown chunk groups `vendor-radix`, `vendor-convex`, `vendor-clerk`, `vendor-motion` (priority 15). An object keyed by group (`radix`, `convex`, `clerk`, `motion`) replaces that group's `test` RegExp. |

Keys that are not asked for are left out, so `resolve` and `build` appear only when set. `reactPlugins(setup)` and `vendorChunkBuild(tests?)` are exported on their own.

`defineWebVitestConfig` takes `plugins`, `tsconfigPaths`, `alias`, `automaticJsx` (`esbuild: { jsx: "automatic" }`), `include` (default `["src/**/*.test.ts"]`) and `inline` (`test.server.deps.inline`). It always sets `test.environment: "node"`. Pass the result to `defineConfig` from `vitest/config`.

## Chrome extensions (WXT)

`@vvedantb/config/extension` holds the shared part of an extension's `wxt.config.ts`. Like the Vite presets, it never imports WXT, Vite or a plugin: the app passes the plugin factories in. WXT is not a peer.

```ts
import { defineConfig } from "wxt";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { srcAlias } from "@vvedantb/config";
import { defineVExtensionConfig } from "@vvedantb/config/extension";

export default defineConfig({
  ...defineVExtensionConfig({
    app: "Example",
    react: { plugin: react },
    tailwindcss,
    buildTarget: "chrome120",
    hosts: ["https://app.example.com/*", "https://clerk.example.com/*"],
    devHosts: ["https://app-git-staging.example.dev/*", "https://example-00.clerk.accounts.dev/*"],
    manifest: {
      description: "What the extension does",
      version: "0.2.0",
      permissions: ["storage", "cookies"],
      content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'" },
    },
  }),
  srcDir: "src",
  outDir: "dist",
  imports: false,
  alias: srcAlias(import.meta.dirname),
});
```

`defineVExtensionConfig` returns `manifest` (a function of WXT's env), `vite` and, when set, `modules`:

| Option | Result |
| --- | --- |
| `app` | Manifest `name`. |
| `react: { plugin, compiler? }` | First plugin, as in `defineWebViteConfig` (`compiler: true` or `{ babel, preset }`). |
| `tailwindcss` | `tailwindcss()`, after React. |
| `plugins` | App Vite plugins, last. Falsy entries are dropped. |
| `modules` | WXT `modules`, as given, for example `["@wxt-dev/module-react"]` instead of `react`. |
| `buildTarget` | `vite.build.target`, for example `"chrome120"` so Clerk's chunks are not downlevelled. |
| `hosts`, `devHosts`, `connectable` | `host_permissions` and `externally_connectable`, from `extensionHostPermissions` with WXT's `mode`. |
| `manifest` | The app's other manifest keys, or a function of WXT's env that returns them. They win over the preset's keys, except `action`, which is merged over `{ default_icon }`. |

`icons` and `action.default_icon` point at `icons/icon-16.png`, `icon-32.png`, `icon-48.png` and `icon-128.png` in the public folder (`EXTENSION_ICONS`). Generate them with `@vvedantb/ui`'s brand-asset script and copy them there: see "Chrome extensions" in the `@vvedantb/ui` README.

Keys that are not asked for are left out. WXT's own options (`srcDir`, `outDir`, `publicDir`, `alias`, `imports`) stay in the app's `defineConfig`.

### extensionHostPermissions

```ts
import { extensionHostPermissions } from "@vvedantb/config/extension";

extensionHostPermissions({ hosts, devHosts, mode });
// { host_permissions: [...hosts, ...(mode === "development" ? devHosts : [])] }
```

- `host_permissions`: `hosts`, then `devHosts` when `mode` is `"development"`, in order and without duplicates. Other modes (`production`, `staging`, ...) get `hosts` only.
- `connectable` (off by default) adds `externally_connectable.matches`: the web pages that may message the extension. Each match keeps the scheme and host and sets the path to `/*`, so `https://app.example.com/api/*` becomes `https://app.example.com/*`.
  - `true` uses every host in the build that names one. `<all_urls>`, a `*` host and non-web schemes are skipped.
  - A list picks patterns from `hosts` and `devHosts`; a dev host counts in development only. A pattern that is in neither list, or cannot be matched, throws.
- When no match is left, `externally_connectable` is left out. Declaring it, even empty, stops other extensions from connecting.
- Chrome also rejects wildcards on an effective top-level domain (`*.co.uk`). The helper does not check for those.

### Zip and release

No helper: `wxt zip` already builds the store zip, and no shared logic sits on top of it.

## clerk-allow

`vvedantb-clerk-allow` adds a Chrome extension's origin, `chrome-extension://<id>`, to a Clerk instance's allowed origins, as Clerk's Chrome extension setup asks.

```sh
# CLERK_SECRET_KEY already set in the environment
pnpm exec vvedantb-clerk-allow abcdefghijklmnopabcdefghijklmnop

# or read it from an env file
node --env-file=.env.local node_modules/@vvedantb/config/dist/clerk-allow-cli.js abcdefghijklmnopabcdefghijklmnop
```

Do not type the key on the command line: shell history keeps it.

1. Reads the secret key from `CLERK_SECRET_KEY`. It must start with `sk_`.
2. `GET https://api.clerk.com/v1/instance` and reads `allowed_origins` (`null` counts as empty).
3. If the origin is already there, prints `... is already allowed on the <environment> instance.` and stops.
4. Otherwise `PATCH /v1/instance` with `allowed_origins` set to the full list: the origins already allowed, then the new one.

Run it once per Clerk instance: the development key with the unpacked ID, the production key with the store ID. The ID is the 32 letters (a to p) shown in `chrome://extensions`.

The secret key is never printed. Error messages from Clerk or the network have it replaced with `[redacted]`, and a bad ID is not echoed (it could be a key pasted by mistake). If the GET response has no `allowed_origins` list, nothing is sent: a PATCH with only the new origin could drop the others.

Exit codes: 0 done (or already allowed), 1 Clerk API or network failure, 2 bad arguments or a missing or wrong `CLERK_SECRET_KEY`. `runClerkAllow(argv, io)` is exported from the root, with `fetch` in `io`, for tests.

## Expo presets

`babel.config.js` and `metro.config.js` are CommonJS, loaded by Expo:

```js
// babel.config.js
module.exports = require("@vvedantb/config").expoBabelConfig;
```

`expoBabelConfig(api)` calls `api.cache(true)` and returns `babel-preset-expo` with `jsxImportSource: "nativewind"`, then `nativewind/babel`. Babel resolves both from the app.

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { defineExpoMetroConfig } = require("@vvedantb/config");

module.exports = defineExpoMetroConfig({
  projectRoot: __dirname,
  getDefaultConfig,
  withNativeWind,
  inlineRem: 16,
  monorepoRoot: "../..",
});
```

`defineExpoMetroConfig` calls `withNativeWind(getDefaultConfig(projectRoot), { input, inlineRem })`. `input` defaults to `"./global.css"`; `inlineRem` is passed only when set. Then, on a new object:

- `monorepoRoot` sets `watchFolders: [<root>]` and `resolver.nodeModulesPaths` to the app's and the root's `node_modules`.
- `packageExports: true` sets `resolver.unstable_enablePackageExports: true`.

`withNativeWind` copies the config and its resolver and reads neither setting, so the order matches setting them before it.

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

Install the package as a devDependency and run its `vvedantb-config` bin from the repo root:

```sh
pnpm exec vvedantb-config sync            # write
pnpm exec vvedantb-config sync --check    # CI: exit 1 if anything would change
pnpm exec vvedantb-config sync --cwd ../app
```

In `package.json` scripts, call `vvedantb-config sync --check` directly. Without installing, use `npx -p @vvedantb/config vvedantb-config sync`. Plain `npx @vvedantb/config` does not work: the package has two bins and neither is named `config`, so npx cannot choose one. A bin named `config` was not added, because that generic name would land in every app's `node_modules/.bin`.

| Target | Behaviour |
| --- | --- |
| `.claude/commands/{stage,changelog,push,ship}.md` | Managed. Overwritten on every sync. |
| `CLAUDE.md` | Created from a skeleton if missing. If present, the four headings (`## Git / ship`, `## Always`, `## Domain docs (read when relevant)`, `## Product facts`) are appended when absent. Existing bodies, including Product facts, are never changed. Drift means a missing heading only. |
| `.cursor/environment.json` | Created if missing. If present, other keys are kept. `install` gains the Claude Code CLI step (sudo, then `~/.local` fallback) and `pnpm install` when either is absent. |
| `convex/tsconfig.json` or `packages/backend/convex/tsconfig.json` | Only when that folder exists. Created if missing. If present, `extends` is set to `@vvedantb/config/tsconfig/convex.json`; other keys are kept. Comments in an existing file are lost on rewrite. |

Exit codes: 0 in sync (or written), 1 drift under `--check`, 2 bad arguments or an unparsable JSON file. A second `sync` changes nothing.

CI example:

```yaml
- run: pnpm exec vvedantb-config sync --check
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
