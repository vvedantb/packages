import { defineConfig } from "vitest/config";

// The tokens suites under tokens/test use node:test and run with `node --test`.
export default defineConfig({
  test: { include: [
      "app/tests/**/*.test.{ts,tsx}",
      "src/**/*.test.{ts,tsx}",
      "shell/**/*.test.{ts,tsx}",
    ], },
});
