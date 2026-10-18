import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const p = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

// React, react-dom and the @vvedantb/ui peers resolve from packages/ui/node_modules
// (this folder sits inside that package), so the fixture installs only the build tools.
//
// The aliases below serve the parity page only: they stub the app modules that the frozen
// copy of the original composer imports (see parity/PARITY.md).
export default defineConfig({
  plugins: [tailwindcss()],
  esbuild: { jsx: "automatic" },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "@vv/ui", replacement: p("./parity/stubs/vv-ui.tsx") },
      { find: "@app/shared", replacement: p("./parity/stubs/shared-types.ts") },
      { find: "@/lib/motion/presets", replacement: p("./parity/stubs/presets.ts") },
      { find: "@/lib/flat-tabs", replacement: p("./parity/stubs/classes.ts") },
      { find: "@/components/chat/transcript/transcriptClass", replacement: p("./parity/stubs/classes.ts") },
      { find: "@/components/chat/chips/ComposerSkillChips", replacement: p("./parity/stubs/empty-strip.tsx") },
      { find: "@/components/chat/chips/ComposerAttachmentStrip", replacement: p("./parity/stubs/empty-strip.tsx") },
      { find: "@/components/chat/chips/SkillHoverCard", replacement: p("./parity/stubs/hover-card.tsx") },
      { find: "@/components/chat/chips/skillPreview", replacement: p("./parity/stubs/skill-preview.ts") },
      { find: /^\.\.\/utils$/, replacement: p("./parity/stubs/utils.ts") },
    ],
  },
  server: { fs: { allow: ["../.."] } },
});
