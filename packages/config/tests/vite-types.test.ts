import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { describe, expect, it } from "vitest";
import { REACT_DEDUPE, defineWebViteConfig, srcAlias } from "../src/index.js";

// Type check against the real Vite and plugin-react types (dev dependencies
// only). `tsc -p tsconfig.test.json` fails if the presets stop fitting Vite.

type CompilerPreset = ReturnType<typeof reactCompilerPreset>;
const babel = (options: { presets: CompilerPreset[] }): Plugin => ({ name: `babel:${options.presets.length}` });
const router = (options: { autoCodeSplitting?: boolean; target?: "react" | "solid" }): Plugin => ({
  name: `router:${String(options.autoCodeSplitting)}`,
});

describe("real Vite types", () => {
  it("accepts the web preset in defineConfig", () => {
    const config = defineConfig({
      ...defineWebViteConfig({
        tailwindcss: (): Plugin[] => [{ name: "tailwind" }],
        router: { plugin: router, options: { target: "react" } },
        react: { plugin: react, compiler: true },
        alias: srcAlias("/app"),
        dedupe: REACT_DEDUPE,
        vendorChunks: true,
      }),
      server: { port: 3001 },
    });
    expect(config.resolve?.dedupe).toStrictEqual([...REACT_DEDUPE]);
    expect(config.plugins).toHaveLength(3);
  });

  it("accepts the babel React Compiler route", () => {
    const config = defineConfig(
      defineWebViteConfig({ react: { plugin: react, compiler: { babel, preset: reactCompilerPreset } }, tsconfigPaths: true }),
    );
    expect(config.plugins?.[1]).toStrictEqual({ name: "babel:1" });
  });
});
