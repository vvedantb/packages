# Releasing

CI owns all publishes. Each package versions on its own with Changesets.

## Add a changeset

Run `pnpm changeset` in any PR that changes a published package for users. Pick the packages and the bump (patch, minor or major). Commit the generated file in `.changeset/`.

## Release flow

1. The PR merges to `main`.
2. The `Release` workflow opens or updates a **Version Packages** PR. It bumps versions and writes changelogs.
3. Merge that PR. The workflow then builds, typechecks, tests and publishes. It creates tags such as `@vvedantb/ui@0.39.0` and GitHub releases.

## Dry run

Run the `Release` workflow by hand (`workflow_dispatch`) with `dry_run` ticked. It runs `changeset status`, builds, typechecks and tests. It then runs `pnpm release:dry-run`. Nothing is published.

`pnpm release:dry-run` builds, then runs `scripts/release-dry-run.mjs`. For each non-private package under `packages/*` the script:

1. Runs `pnpm pack --dry-run` and prints the tarball file list. This exits 0 even when the version is on npm already. We do not use `publish --dry-run`, which exits 1 with "You cannot publish over the previously published versions" in that case.
2. Prints `exports` and checks that every concrete `exports` and `bin` target exists on disk. Glob targets such as `./tokens/css/*.css` are noted, not resolved.

The script writes a short summary (file counts and exports check) to `/tmp/publish-dry-run-summary.txt`. In CI it goes to the job summary. A missing target or a failed pack fails the job.

The `changeset status` step is informational: a non-zero exit does not fail the job. This lets tooling branches that change `package.json` without a version bump still run. Build, typecheck, test and the pack check fail the job on error.

`workflow_dispatch` only works once `release.yml` is on `main`. Until then, prove the dry run locally with `pnpm release:dry-run`.

## Trusted publishing setup

Publishing uses npm OIDC trusted publishing only. Do not use `NPM_TOKEN`, `NODE_AUTH_TOKEN` or any other npm token secret. The workflow has no token fallback.

Each package needs a trusted publisher on npmjs.com. Open the package, then Settings, then Trusted Publisher, and add GitHub Actions with:

- Owner: `vvedantb`
- Repository: `packages`
- Workflow filename: `release.yml`
- Environment: none (leave blank)

See https://docs.npmjs.com/trusted-publishers. The workflow uses Node 22 and upgrades npm to 11.5.1 or later, because pnpm hands the token exchange to the npm CLI. It also removes the empty `_authToken=` lines that `setup-node` writes when `registry-url` is set, because an empty token breaks OIDC. Provenance is on (`NPM_CONFIG_PROVENANCE=true`).

## Rules

- Do not run `npm publish` or `pnpm publish` by hand. Agents must not either.
- Gallery and app workspaces must set `"private": true`. Changesets skips private packages. Add any that need an explicit skip to `ignore` in `.changeset/config.json`.
