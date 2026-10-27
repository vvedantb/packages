import { reactPlugins, type ReactSetup, type VitePluginOption } from "./vite.js";

// WXT, Vite and their plugins are passed in by the app, so this module never
// imports them. The types below are the structural subset of WXT's config that
// the preset returns; WXT's `defineConfig` accepts them.

export interface ExtensionHostOptions {
  /** Match patterns in every build, for example `"https://app.example.com/*"` or `"<all_urls>"`. */
  hosts: readonly string[];
  /** Match patterns in development builds only (`mode === "development"`), such as staging hosts. */
  devHosts?: readonly string[];
  /** The Vite or WXT mode. */
  mode: string;
  /**
   * Web pages that may message the extension (`externally_connectable.matches`). Off by default.
   * `true`: every host in this build that names one (not `<all_urls>` or a `*` host).
   * A list: those patterns only. Each must be in `hosts` or `devHosts`; dev hosts count in development only.
   */
  connectable?: boolean | readonly string[];
}

export interface ExtensionHostPermissions {
  host_permissions: string[];
  externally_connectable?: { matches: string[] };
}

/** `<scheme>://<host>/<path>` with an http(s) or `*` scheme. */
const MATCH_PATTERN = /^(\*|https?):\/\/([^/]+)\/.*$/;

/** The `externally_connectable` form of a host pattern: same scheme and host, path `/*`. */
function connectableMatch(pattern: string): string | undefined {
  const match = MATCH_PATTERN.exec(pattern);
  if (!match || match[2] === "*") return undefined;
  return `${match[1]}://${match[2]}/*`;
}

function unique(values: Iterable<string>): string[] {
  return [...new Set(values)];
}

function connectableMatches(active: readonly string[], options: ExtensionHostOptions): string[] {
  if (options.connectable === true) {
    return unique(active.map(connectableMatch).filter((m): m is string => m !== undefined));
  }
  const known = new Set([...options.hosts, ...(options.devHosts ?? [])]);
  const matches: string[] = [];
  for (const pattern of options.connectable || []) {
    if (!known.has(pattern)) throw new Error(`connectable pattern is not in hosts or devHosts: ${pattern}`);
    const match = connectableMatch(pattern);
    if (!match) throw new Error(`connectable pattern needs an http(s) scheme and a host name: ${pattern}`);
    if (active.includes(pattern)) matches.push(match);
  }
  return unique(matches);
}

/**
 * `host_permissions`: `hosts`, then `devHosts` when `mode` is `"development"`, without duplicates.
 * With `connectable`, also `externally_connectable.matches` for those hosts, with the path set to `/*`.
 * The key is left out when no match is left: declaring it stops other extensions from connecting.
 */
export function extensionHostPermissions(options: ExtensionHostOptions): ExtensionHostPermissions {
  const active = unique([...options.hosts, ...(options.mode === "development" ? (options.devHosts ?? []) : [])]);
  const result: ExtensionHostPermissions = { host_permissions: active };
  if (options.connectable) {
    const matches = connectableMatches(active, options);
    if (matches.length > 0) result.externally_connectable = { matches };
  }
  return result;
}

/** Manifest icon paths, inside the public folder, for @vvedantb/ui's `extension/icon-*.png` brand assets. */
export const EXTENSION_ICONS = {
  "16": "icons/icon-16.png",
  "32": "icons/icon-32.png",
  "48": "icons/icon-48.png",
  "128": "icons/icon-128.png",
} as const;

export type ExtensionIcons = Record<keyof typeof EXTENSION_ICONS, string>;

/** The part of WXT's `ConfigEnv` the preset reads. WXT passes the whole env to `manifest`. */
export interface ExtensionConfigEnv {
  mode: string;
  browser?: string;
}

/** Manifest keys the preset sets. */
export interface VExtensionManifest extends ExtensionHostPermissions {
  name: string;
  icons: ExtensionIcons;
  action: { default_icon: ExtensionIcons };
}

export interface VExtensionViteConfig {
  plugins: VitePluginOption[];
  build?: { target: string };
}

export interface VExtensionOptions<Preset, Manifest extends object> extends Omit<ExtensionHostOptions, "mode"> {
  /** Manifest `name`. */
  app: string;
  /** `@vitejs/plugin-react`, as in `defineWebViteConfig`. First plugin. */
  react?: ReactSetup<Preset>;
  /** `@tailwindcss/vite`. Added after React. */
  tailwindcss?: () => VitePluginOption;
  /** App Vite plugins, added last. Falsy entries are dropped. */
  plugins?: VitePluginOption[];
  /** WXT modules by package name, for example `"@wxt-dev/module-react"` instead of `react`. */
  modules?: string[];
  /** `vite.build.target`, for example `"chrome120"`. */
  buildTarget?: string;
  /**
   * The app's other manifest keys (description, version, permissions, ...), or a function of
   * WXT's env that returns them. They win over the preset's keys, except `action`, which is
   * merged over `{ default_icon }`.
   */
  manifest?: Manifest | ((env: ExtensionConfigEnv) => Manifest);
}

export interface VExtensionConfig<Manifest extends object> {
  modules?: string[];
  manifest: (env: ExtensionConfigEnv) => VExtensionManifest & Manifest;
  vite: () => VExtensionViteConfig;
}

/**
 * The shared part of an extension's `wxt.config.ts`: `manifest` (name, icons, host permissions)
 * and `vite` (plugins, build target). Spread it into WXT's `defineConfig` and add `srcDir`,
 * `outDir`, `alias` or `imports` there.
 */
export function defineVExtensionConfig<Preset, Manifest extends object = object>(
  options: VExtensionOptions<Preset, Manifest>,
): VExtensionConfig<Manifest> {
  const config: VExtensionConfig<Manifest> = {
    manifest: (env) => {
      const own = typeof options.manifest === "function" ? options.manifest(env) : options.manifest;
      const hosts = { hosts: options.hosts, devHosts: options.devHosts, connectable: options.connectable, mode: env.mode };
      return {
        name: options.app,
        icons: { ...EXTENSION_ICONS },
        ...extensionHostPermissions(hosts),
        ...own,
        action: { default_icon: { ...EXTENSION_ICONS }, ...(own as { action?: object } | undefined)?.action },
      } as VExtensionManifest & Manifest;
    },
    vite: () => {
      const plugins: VitePluginOption[] = [];
      if (options.react) plugins.push(...reactPlugins(options.react));
      if (options.tailwindcss) plugins.push(options.tailwindcss());
      plugins.push(...(options.plugins ?? []).filter(Boolean));
      return options.buildTarget ? { plugins, build: { target: options.buildTarget } } : { plugins };
    },
  };
  if (options.modules) config.modules = options.modules;
  return config;
}
