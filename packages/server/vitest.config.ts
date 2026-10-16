import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests and typecheck read the package from source, so they run without building it first.
export default defineConfig({
  resolve: {
    alias: {
      "@vvedantb/server/convex": fileURLToPath(new URL("./src/convex/index.ts", import.meta.url)),
      "@vvedantb/server/mcp": fileURLToPath(new URL("./src/mcp/index.ts", import.meta.url)),
    },
  },
});
