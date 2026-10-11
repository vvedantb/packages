# @vvedantb/config

Shared tooling for vvedantb apps: tsconfig bases, an oxlint base, pinned tool versions and a `sync` CLI. Not yet published to npm.

## Install

```sh
npm install -D @vvedantb/config
```

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

The severity of `no-console` and `no-unused-vars` is set to `error` here. It was not copied from the vmem file, which was not in the extract. Check it against the app.

## Versions

```ts
import { versions } from "@vvedantb/config/versions";
```

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

## Develop and publish

```sh
pnpm --filter @vvedantb/config build
pnpm --filter @vvedantb/config test
```

Publish from a logged-in npm machine after a version bump in `package.json`. There is no CI publish.

```sh
pnpm --filter @vvedantb/config exec npm publish --access public
```
