---
"@vvedantb/config": minor
---

`vvedantb-doctor` has two new checks. `ci-runner` fails on a job that runs on the small `boat` runner (use `boat-large`). `ci-commands` fails on a CI command that is not `lint`, `typecheck` or `test` and has no written reason under `ciCommands` in `.vvedantb-doctor.json`.
