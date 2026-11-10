# Agent rules

- Every user-facing change to a published package (`@vvedantb/ui`, `native-ui`, `server`, `config`) needs a changeset. Run `pnpm changeset`.
- Do not run `npm publish` or `pnpm publish` by hand. CI publishes with OIDC trusted publishing only. Do not add `NPM_TOKEN` or any npm token. See [RELEASING.md](RELEASING.md).
- Gallery and app workspaces must be `"private": true`.
- Before you finish, run `pnpm build`, `pnpm typecheck` and `pnpm test`.
