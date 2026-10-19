import { resolve } from "node:path";

// Vite and its plugins are passed in by the app, so this module never imports
// them. The types below are the structural subset of Vite's own types that the
// presets read or return; Vite's `defineConfig` accepts them.

/** A Vite plugin: Vite's `Plugin` needs only `name`. */
export interface VitePlugin {
  name: string;
}

type VitePluginOptionValue = VitePlugin | false | null | undefined | VitePluginOption[];

/** Mirrors Vite's `PluginOption`: falsy entries are dropped by Vite. */
export type VitePluginOption = VitePluginOptionValue | Promise<VitePluginOptionValue>;

/** The `@tanstack/router-plugin/vite` options the presets pass through. */
export interface RouterPluginOptions {
  target?: "react";
  routesDirectory?: string;
  generatedRouteTree?: string;
  routeFileIgnorePattern?: string;
  autoCodeSplitting: boolean;
}

/** The React Compiler through `@rolldown/plugin-babel` and `reactCompilerPreset` (plugin-react before 6.1). */
export interface BabelReactCompiler<Preset> {
  babel: (options: { presets: Preset[] }) => VitePluginOption;
  preset: () => Preset;
}

/**
 * `@vitejs/plugin-react`, with or without the React Compiler.
 * - `compiler: true` calls `react({ compiler: true })` (plugin-react 6.1+).
 * - `compiler: { babel, preset }` calls `react()` then `babel({ presets: [preset()] })`.
 * - No `compiler` calls `react()`.
 */
export type ReactSetup<Preset> =
  | { plugin: (options: { compiler: true }) => VitePluginOption; compiler: true }
  | { plugin: () => VitePluginOption; compiler: BabelReactCompiler<Preset> }
  | { plugin: () => VitePluginOption; compiler?: false };

/** Vite's `resolve.alias`: an object, or a list of `{ find, replacement }`. */
export type AliasOptions =
  | Record<string, string>
  | { find: string | RegExp; replacement: string }[];

export interface PathOptions {
  /** Sets `resolve.tsconfigPaths: true` (Vite 8). */
  tsconfigPaths?: boolean;
  /** `resolve.alias`, as given. See `srcAlias`. */
  alias?: AliasOptions;
}

export interface ResolveConfig {
  tsconfigPaths?: boolean;
  alias?: AliasOptions;
  dedupe?: string[];
}

export type VendorChunk = "radix" | "convex" | "clerk" | "motion";

export interface VendorChunkGroup {
  name: string;
  test: RegExp;
  priority: number;
}

export interface WebBuildConfig {
  outDir: string;
  chunkSizeWarningLimit: number;
  rolldownOptions: { output: { codeSplitting: { groups: VendorChunkGroup[] } } };
}

export interface WebViteOptions<Preset> extends PathOptions {
  /** `@tailwindcss/vite`. Added first. */
  tailwindcss?: () => VitePluginOption;
  /** `@tanstack/router-plugin/vite`. Added after Tailwind; `autoCodeSplitting: true` is always set. */
  router?: {
    plugin: (options: RouterPluginOptions) => VitePluginOption;
    options?: Omit<RouterPluginOptions, "autoCodeSplitting">;
  };
  /** `@vitejs/plugin-react`. Added after the router. */
  react: ReactSetup<Preset>;
  /** App plugins, added last. Falsy entries are dropped. */
  plugins?: VitePluginOption[];
  /** `resolve.dedupe`, as given. See `REACT_DEDUPE`. */
  dedupe?: readonly string[];
  /** Splits vendor chunks with rolldown. `true` uses the default tests; an object replaces some of them. */
  vendorChunks?: boolean | Partial<Record<VendorChunk, RegExp>>;
}

export interface WebViteConfig {
  plugins: VitePluginOption[];
  resolve?: ResolveConfig;
  build?: WebBuildConfig;
}

export interface WebVitestOptions extends PathOptions {
  plugins?: VitePluginOption[];
  /** Sets `esbuild: { jsx: "automatic" }`, so `.tsx` tests need no React import. */
  automaticJsx?: boolean;
  /** Test globs. Default `["src/**\/*.test.ts"]`. */
  include?: string[];
  /** Packages Vitest transforms instead of loading from node_modules (`test.server.deps.inline`). */
  inline?: string[];
}

export interface WebVitestConfig {
  plugins?: VitePluginOption[];
  esbuild?: { jsx: "automatic" };
  resolve?: ResolveConfig;
  test: {
    environment: "node";
    include: string[];
    server?: { deps: { inline: string[] } };
  };
}

/** Packages that hold React context. pnpm can install two copies; dedupe keeps one. */
export const REACT_DEDUPE = [
  "react",
  "react-dom",
  "convex",
  "@tanstack/react-router",
  "@clerk/clerk-react",
] as const;

const VENDOR_TESTS: Record<VendorChunk, RegExp> = {
  radix: /node_modules[\\/]@radix-ui/,
  convex: /node_modules[\\/]convex/,
  clerk: /node_modules[\\/]@clerk/,
  motion: /node_modules[\\/](motion|framer-motion)/,
};

const VENDOR_ORDER: readonly VendorChunk[] = ["radix", "convex", "clerk", "motion"];

/** `{ "@": "<dirname>/src" }`. Pass `import.meta.dirname`. */
export function srcAlias(dirname: string): Record<string, string> {
  return { "@": resolve(dirname, "src") };
}

/** The plugin-react plugins for a `ReactSetup`, in order. */
export function reactPlugins<Preset>(setup: ReactSetup<Preset>): VitePluginOption[] {
  if (setup.compiler === true) return [setup.plugin({ compiler: true })];
  if (setup.compiler) {
    return [setup.plugin(), setup.compiler.babel({ presets: [setup.compiler.preset()] })];
  }
  return [setup.plugin()];
}

/** `outDir: "dist"`, a 1000 kB chunk warning and vendor chunks for Radix, Convex, Clerk and Motion. */
export function vendorChunkBuild(tests: Partial<Record<VendorChunk, RegExp>> = {}): WebBuildConfig {
  return {
    outDir: "dist",
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: VENDOR_ORDER.map((chunk) => ({
            name: `vendor-${chunk}`,
            test: tests[chunk] ?? VENDOR_TESTS[chunk],
            priority: 15,
          })),
        },
      },
    },
  };
}

function resolveConfig(options: PathOptions & { dedupe?: readonly string[] }): ResolveConfig | undefined {
  const config: ResolveConfig = {};
  if (options.tsconfigPaths) config.tsconfigPaths = true;
  if (options.alias) config.alias = options.alias;
  if (options.dedupe) config.dedupe = [...options.dedupe];
  return Object.keys(config).length > 0 ? config : undefined;
}

function isPlugin(plugin: VitePluginOption): boolean {
  return Boolean(plugin);
}

/**
 * The shared part of a web app's `vite.config.ts`: plugins, `resolve` and `build`.
 * Spread it into Vite's `defineConfig` and add `server`, `base` or `root` there.
 */
export function defineWebViteConfig<Preset>(options: WebViteOptions<Preset>): WebViteConfig {
  const plugins: VitePluginOption[] = [];
  if (options.tailwindcss) plugins.push(options.tailwindcss());
  if (options.router) {
    plugins.push(options.router.plugin({ ...options.router.options, autoCodeSplitting: true }));
  }
  plugins.push(...reactPlugins(options.react), ...(options.plugins ?? []).filter(isPlugin));

  const config: WebViteConfig = { plugins };
  const resolved = resolveConfig(options);
  if (resolved) config.resolve = resolved;
  if (options.vendorChunks) {
    config.build = vendorChunkBuild(options.vendorChunks === true ? {} : options.vendorChunks);
  }
  return config;
}

/** A web app's `vitest.config.ts`: Node environment, test globs and inlined packages. */
export function defineWebVitestConfig(options: WebVitestOptions = {}): WebVitestConfig {
  const config: WebVitestConfig = {
    test: { environment: "node", include: options.include ?? ["src/**/*.test.ts"] },
  };
  if (options.plugins) config.plugins = options.plugins;
  if (options.automaticJsx) config.esbuild = { jsx: "automatic" };
  const resolved = resolveConfig(options);
  if (resolved) config.resolve = resolved;
  if (options.inline) config.test.server = { deps: { inline: options.inline } };
  return config;
}
