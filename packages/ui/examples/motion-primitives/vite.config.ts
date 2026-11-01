import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// React, react-dom and the @vvedantb/ui peers resolve from packages/ui/node_modules
// (this folder sits inside that package), so the fixture installs only the build tools.
export default defineConfig({
  plugins: [tailwindcss()],
  esbuild: { jsx: "automatic" },
  resolve: { dedupe: ["react", "react-dom"] },
  server: { fs: { allow: ["../.."] } },
});
