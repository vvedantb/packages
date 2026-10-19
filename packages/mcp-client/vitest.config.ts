import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests and typecheck read the package from source, so they run without building it first.
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@vvedantb\/mcp-client$/,
        replacement: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      },
    ],
  },
});
