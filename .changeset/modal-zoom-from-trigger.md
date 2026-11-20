---
"@vvedantb/ui": minor
---

Dialog grows out of its trigger and shrinks back into it (macOS-style). The origin is the press that opened it (within 500 ms) or the focused control. With neither, it keeps the centred zoom. Instant surfaces (`--modal-scale: 1`, the command palette) are unchanged. Also fixes a replayed entrance: a content re-render that re-runs the ref no longer re-primes a modal that is already open.
