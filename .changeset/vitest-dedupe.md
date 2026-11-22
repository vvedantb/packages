---
"@vvedantb/config": minor
---

`defineWebVitestConfig` takes `dedupe` (`resolve.dedupe`, as `defineWebViteConfig` does). Pass `dedupe: REACT_DEDUPE` when the tests load a workspace package from source: without it that package can load another copy of React than the app's.
