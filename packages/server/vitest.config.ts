import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests and typecheck read the package from source, so they run without building it first.
// Exact match only: a stale subpath import such as "@vvedantb/server/mcp" must fail.
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@vvedantb\/server$/,
        replacement: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      },
    ],
  },
});
