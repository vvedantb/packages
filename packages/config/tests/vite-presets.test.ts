import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  REACT_DEDUPE,
  defineWebViteConfig,
  defineWebVitestConfig,
  srcAlias,
  type RouterPluginOptions,
} from "../src/index.js";

// Each `current*` function is a verbatim copy of an app's config object, with
// the plugin factories replaced by stand-ins that record their arguments.
// `defineWebViteConfig` must return a deep-equal object (`toStrictEqual`).

const DIR = "/repo/apps/web";
const __dirname = DIR;

function standIn<Args>(name: string) {
  return (...args: Args[]) => ({ name, args });
}

const tailwindcss = standIn<never>("tailwindcss");
const tanstackRouter = standIn<RouterPluginOptions>("tanstack-router");
const TanStackRouterVite = tanstackRouter;
const react = standIn<{ compiler: true }>("react");
const reactCompilerPreset = () => ({ preset: "react-compiler" });
const babel = standIn<{ presets: { preset: string }[] }>("babel");
const agentLoginPlugin = standIn<never>("agent-login");
const visualizer = standIn<object>("visualizer");
const seoPrerender = standIn<never>("seo-prerender");
const VitePWA = standIn<object>("vite-plugin-pwa");
const glBenchEsm = "/repo/node_modules/gl-bench/dist/gl-bench.module.js";

const PWA_OPTIONS = {
  strategies: "injectManifest",
  srcDir: ".",
  filename: "sw.js",
  manifest: false,
  injectRegister: false,
  injectManifest: {
    globPatterns: ["**/*.{js,css,woff2}", "offline.html"],
    globIgnores: ["**/node_modules/**"],
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
  },
};

describe("app-a web vite config", () => {
  function current(analyze: boolean) {
    return {
      plugins: [
        tailwindcss(),
        tanstackRouter({
          routesDirectory: "./src/routes",
          routeFileIgnorePattern:
            "([sS]earchParams\\.ts|_components|_utils\\.ts|Client\\.tsx|Panel\\.tsx)",
          autoCodeSplitting: true,
        }),
        react({ compiler: true }),
        agentLoginPlugin(),
        analyze &&
          visualizer({
            filename: "stats.html",
            open: true,
            gzipSize: true,
            brotliSize: true,
          }),
      ].filter(Boolean),
      server: {
        host: "0.0.0.0",
        cors: false,
      },
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "src"),
          "gl-bench": glBenchEsm,
        },
        dedupe: [
          "react",
          "react-dom",
          "convex",
          "convex-helpers",
          "@tanstack/react-router",
          "@tanstack/react-query",
          "@clerk/clerk-react",
        ],
      },
      build: {
        outDir: "dist",
        chunkSizeWarningLimit: 1000,
        rolldownOptions: {
          output: {
            codeSplitting: {
              groups: [
                {
                  name: "vendor-radix",
                  test: /node_modules[\\/]@radix-ui/,
                  priority: 15,
                },
                {
                  name: "vendor-convex",
                  test: /node_modules[\\/](convex|convex-helpers)/,
                  priority: 15,
                },
                {
                  name: "vendor-clerk",
                  test: /node_modules[\\/]@clerk/,
                  priority: 15,
                },
                {
                  name: "vendor-motion",
                  test: /node_modules[\\/](motion|framer-motion)/,
                  priority: 15,
                },
              ],
            },
          },
        },
      },
    };
  }

  function adopted(analyze: boolean) {
    return {
      ...defineWebViteConfig({
        tailwindcss,
        router: {
          plugin: tanstackRouter,
          options: {
            routesDirectory: "./src/routes",
            routeFileIgnorePattern:
              "([sS]earchParams\\.ts|_components|_utils\\.ts|Client\\.tsx|Panel\\.tsx)",
          },
        },
        react: { plugin: react, compiler: true },
        plugins: [
          agentLoginPlugin(),
          analyze &&
            visualizer({ filename: "stats.html", open: true, gzipSize: true, brotliSize: true }),
        ],
        alias: { ...srcAlias(DIR), "gl-bench": glBenchEsm },
        dedupe: [
          "react",
          "react-dom",
          "convex",
          "convex-helpers",
          "@tanstack/react-router",
          "@tanstack/react-query",
          "@clerk/clerk-react",
        ],
        vendorChunks: { convex: /node_modules[\\/](convex|convex-helpers)/ },
      }),
      server: { host: "0.0.0.0", cors: false },
    };
  }

  it.each([false, true])("matches with ANALYZE=%s", (analyze) => {
    expect(adopted(analyze)).toStrictEqual(current(analyze));
  });
});

describe("app-b web vite config", () => {
  const current = {
    server: { port: 3001 },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      tailwindcss(),
      TanStackRouterVite({
        autoCodeSplitting: true,
      }),
      react(),
      babel({
        presets: [reactCompilerPreset()],
      }),
    ],
  };

  it("matches", () => {
    expect({
      ...defineWebViteConfig({
        tailwindcss,
        router: { plugin: TanStackRouterVite },
        react: { plugin: react, compiler: { babel, preset: reactCompilerPreset } },
        tsconfigPaths: true,
      }),
      server: { port: 3001 },
    }).toStrictEqual(current);
  });
});

describe("app-c web vite config", () => {
  const current = {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      tailwindcss(),
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      react({ compiler: true }),
      seoPrerender(),
      VitePWA(PWA_OPTIONS),
    ],
  };

  it("matches", () => {
    expect(
      defineWebViteConfig({
        tailwindcss,
        router: { plugin: tanstackRouter, options: { target: "react" } },
        react: { plugin: react, compiler: true },
        plugins: [seoPrerender(), VitePWA(PWA_OPTIONS)],
        tsconfigPaths: true,
      }),
    ).toStrictEqual(current);
  });
});

describe("app-d web vite config", () => {
  const current = {
    plugins: [
      tailwindcss(),
      tanstackRouter({
        routesDirectory: "./src/routes",
        routeFileIgnorePattern: "(_components|_utils)",
        autoCodeSplitting: true,
      }),
      react({ compiler: true }),
    ],
    resolve: {
      alias: [{ find: "@", replacement: path.resolve(__dirname, "./src") }],
      dedupe: [
        "react",
        "react-dom",
        "convex",
        "@tanstack/react-router",
        "@clerk/clerk-react",
      ],
    },
  };

  it("matches", () => {
    expect(
      defineWebViteConfig({
        tailwindcss,
        router: {
          plugin: tanstackRouter,
          options: { routesDirectory: "./src/routes", routeFileIgnorePattern: "(_components|_utils)" },
        },
        react: { plugin: react, compiler: true },
        alias: [{ find: "@", replacement: path.resolve(DIR, "src") }],
        dedupe: REACT_DEDUPE,
      }),
    ).toStrictEqual(current);
  });
});

describe("app-e web vite config", () => {
  function current(mock: boolean) {
    return {
      plugins: [
        tailwindcss(),
        tanstackRouter({
          routesDirectory: "./src/routes",
          generatedRouteTree: "./src/routeTree.gen.ts",
          autoCodeSplitting: true,
        }),
        react(),
      ],
      resolve: {
        alias: {
          "@": path.resolve(DIR, "./src"),
          // Browser e2e only (see e2e/): answer Clerk and Convex from fixtures.
          ...(mock
            ? {
                "convex/react-clerk": path.resolve(DIR, "./e2e/mocks/convex-react.tsx"),
                "convex/react": path.resolve(DIR, "./e2e/mocks/convex-react.tsx"),
                "@clerk/clerk-react": path.resolve(DIR, "./e2e/mocks/clerk.tsx"),
              }
            : {}),
        },
        dedupe: [
          "react",
          "react-dom",
          "convex",
          "@tanstack/react-router",
          "@clerk/clerk-react",
          "sonner",
        ],
      },
      server: {
        host: "127.0.0.1",
        port: 5173,
      },
      build: {
        outDir: "dist",
        chunkSizeWarningLimit: 1000,
        rolldownOptions: {
          output: {
            codeSplitting: {
              groups: [
                {
                  name: "vendor-radix",
                  test: /node_modules[\\/]@radix-ui/,
                  priority: 15,
                },
                {
                  name: "vendor-convex",
                  test: /node_modules[\\/]convex/,
                  priority: 15,
                },
                {
                  name: "vendor-clerk",
                  test: /node_modules[\\/]@clerk/,
                  priority: 15,
                },
                {
                  name: "vendor-motion",
                  test: /node_modules[\\/](motion|framer-motion)/,
                  priority: 15,
                },
              ],
            },
          },
        },
      },
    };
  }

  function adopted(mock: boolean) {
    return {
      ...defineWebViteConfig({
        tailwindcss,
        router: {
          plugin: tanstackRouter,
          options: { routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts" },
        },
        react: { plugin: react },
        alias: {
          ...srcAlias(DIR),
          ...(mock
            ? {
                "convex/react-clerk": path.resolve(DIR, "./e2e/mocks/convex-react.tsx"),
                "convex/react": path.resolve(DIR, "./e2e/mocks/convex-react.tsx"),
                "@clerk/clerk-react": path.resolve(DIR, "./e2e/mocks/clerk.tsx"),
              }
            : {}),
        },
        dedupe: [...REACT_DEDUPE, "sonner"],
        vendorChunks: true,
      }),
      server: { host: "127.0.0.1", port: 5173 },
    };
  }

  it.each([false, true])("matches with the e2e mock=%s", (mock) => {
    expect(adopted(mock)).toStrictEqual(current(mock));
  });
});

describe("vitest configs", () => {
  it("app-a web", () => {
    const current = {
      plugins: [react()],
      esbuild: { jsx: "automatic" },
      resolve: {
        alias: {
          "@": path.resolve(DIR, "./src"),
        },
      },
      test: {
        include: ["src/**/*.test.{ts,tsx}"],
        environment: "node",
        server: { deps: { inline: ["@vvedantb/ui"] } },
      },
    };
    expect(
      defineWebVitestConfig({
        plugins: [react()],
        automaticJsx: true,
        alias: srcAlias(DIR),
        include: ["src/**/*.test.{ts,tsx}"],
        inline: ["@vvedantb/ui"],
      }),
    ).toStrictEqual(current);
  });

  it("app-c web", () => {
    const current = {
      esbuild: { jsx: "automatic" },
      test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
        server: { deps: { inline: ["@vvedantb/convex-client"] } },
      },
    };
    expect(defineWebVitestConfig({ automaticJsx: true, inline: ["@vvedantb/convex-client"] })).toStrictEqual(
      current,
    );
  });

  it("app-c chrome extension", () => {
    const current = {
      esbuild: { jsx: "automatic" },
      resolve: {
        alias: { "@": "/repo/apps/chrome-extension/src" },
      },
      test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
      },
    };
    expect(
      defineWebVitestConfig({ automaticJsx: true, alias: srcAlias("/repo/apps/chrome-extension") }),
    ).toStrictEqual(current);
  });

  it("app-d web", () => {
    const current = {
      resolve: {
        alias: [{ find: "@", replacement: path.resolve(__dirname, "./src") }],
      },
      test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
        server: { deps: { inline: ["@vvedantb/convex-client"] } },
      },
    };
    expect(
      defineWebVitestConfig({
        alias: [{ find: "@", replacement: path.resolve(DIR, "src") }],
        inline: ["@vvedantb/convex-client"],
      }),
    ).toStrictEqual(current);
  });
});

describe("defineWebViteConfig", () => {
  it("leaves out resolve and build when not asked for", () => {
    expect(defineWebViteConfig({ react: { plugin: react } })).toStrictEqual({ plugins: [react()] });
  });

  it("does not share the REACT_DEDUPE array", () => {
    const config = defineWebViteConfig({ react: { plugin: react }, dedupe: REACT_DEDUPE });
    expect(config.resolve?.dedupe).not.toBe(REACT_DEDUPE);
  });
});
