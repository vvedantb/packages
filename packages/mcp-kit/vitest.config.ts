import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests and typecheck read convex-kit from source, so they run without building it first.
export default defineConfig({
  resolve: {
    alias: {
      "@vvedantb/convex-kit": fileURLToPath(new URL("../convex-kit/src/index.ts", import.meta.url)),
    },
  },
});
