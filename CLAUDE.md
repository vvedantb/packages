# Agent rules

- Every user-facing change to a published package (`@vvedantb/ui`, `native-ui`, `server`, `config`) needs a changeset. Run `pnpm changeset`.
- Do not run `npm publish` or `pnpm publish` by hand. CI publishes with OIDC trusted publishing only. Do not add `NPM_TOKEN` or any npm token. See [RELEASING.md](RELEASING.md).
- Gallery and app workspaces must be `"private": true`.
- Before you finish, run `pnpm build`, `pnpm typecheck` and `pnpm test`.

## Testing

- The default is no new test. Add one only when it guards behaviour that nothing else covers.
- A test must call real code: import it and call it, or render the component.
- Never read or regex source files in a test. This covers `.ts`, `.tsx`, `.css` and `.md` files, `fs.readFileSync` of `src`, and `?raw` imports. `pnpm lint:tests` fails on it, and `pnpm test` runs that check.
- A regression test must fail on the old code and must run in CI. Check both before you rely on it.
