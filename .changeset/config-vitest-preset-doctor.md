---
"@vvedantb/config": minor
---

Add a shared-worker Vitest preset and a `vvedantb-doctor` CLI.

- `sharedWorkerVitestConfig` (and `SHARED_WORKER_SETUP`): an opt-in Vitest preset that runs every test file in one shared worker (`isolate: false`), shuffles file order, and resets mocks, env stubs, global stubs and fake timers after each test. Trades per-file isolation for a faster run; adopt it per repo where tests are independent.
- `vvedantb-doctor`: a dependency-free CLI that inspects a repo for drift from the shared CI and tooling house rules (ESLint, Prettier, plain `tsc`, missing `tsrs`, missing `oxlint` dep or script, an older `@vvedantb/config` minor, a CI workflow that does not call the shared reusable workflow). It walks workspace packages, supports `--json` and a per-repo waiver file, makes no network requests, and exits non-zero on drift.
