---
"@vvedantb/ui": patch
---

`dist` is valid Node ESM: relative imports name their file (`./cn.js`, `./ui/index.js`) and the dayjs plugin import names `relativeTime.js`. Node (Vitest, SSR) does not add extensions as bundlers do. The package still imports its own CSS (sonner, katex), so test runners should inline it (Vitest: `server.deps.inline: ["@vvedantb/ui"]`).
