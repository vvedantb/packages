import { describe, expect, it } from "vitest";
import {
  EXTENSION_ICONS,
  defineVExtensionConfig,
  extensionHostPermissions,
} from "../src/extension.js";

function standIn<Args>(name: string) {
  return (...args: Args[]) => ({ name, args });
}

const react = standIn<{ compiler: true }>("react");
const tailwindcss = standIn<never>("tailwindcss");

describe("extensionHostPermissions", () => {
  const [app, clerk, staging, clerkDev] = [
    "https://app.example.com/*",
    "https://clerk.example.com/*",
    "https://app-git-staging.example.dev/*",
    "https://example-00.clerk.accounts.dev/*",
  ] as const;
  const hosts = [app, clerk];
  const devHosts = [staging, clerkDev];

  it("adds dev hosts in development only", () => {
    expect(extensionHostPermissions({ hosts, devHosts, mode: "development" })).toStrictEqual({
      host_permissions: [...hosts, ...devHosts],
    });
    for (const mode of ["production", "staging", "test", ""]) {
      expect(extensionHostPermissions({ hosts, devHosts, mode })).toStrictEqual({ host_permissions: hosts });
    }
  });

  it("works without dev hosts and keeps the given order", () => {
    expect(extensionHostPermissions({ hosts: ["<all_urls>", ...hosts], mode: "development" })).toStrictEqual({
      host_permissions: ["<all_urls>", ...hosts],
    });
    expect(extensionHostPermissions({ hosts: [], mode: "production" })).toStrictEqual({ host_permissions: [] });
  });

  it("drops duplicates, within and across the lists", () => {
    const result = extensionHostPermissions({ hosts: [app, app], devHosts: [app, staging], mode: "development" });
    expect(result.host_permissions).toStrictEqual([app, staging]);
  });

  it("returns new arrays: the inputs are not changed", () => {
    const input = [...hosts];
    const result = extensionHostPermissions({ hosts: input, mode: "production" });
    result.host_permissions.push("https://other.example.com/*");
    expect(input).toStrictEqual(hosts);
  });

  it("leaves externally_connectable out unless asked", () => {
    expect(extensionHostPermissions({ hosts, mode: "production" })).not.toHaveProperty("externally_connectable");
    expect(extensionHostPermissions({ hosts, mode: "production", connectable: false })).not.toHaveProperty("externally_connectable");
    expect(extensionHostPermissions({ hosts, mode: "production", connectable: [] })).not.toHaveProperty("externally_connectable");
  });

  it("connectable: true uses every host in the build, with the path set to /*", () => {
    const result = extensionHostPermissions({
      hosts: ["https://app.example.com/api/*", "https://app.example.com/*", "*://*.example.org/*", "http://localhost:3000/*"],
      devHosts,
      mode: "development",
      connectable: true,
    });
    expect(result.externally_connectable).toStrictEqual({
      matches: [
        "https://app.example.com/*",
        "*://*.example.org/*",
        "http://localhost:3000/*",
        "https://app-git-staging.example.dev/*",
        "https://example-00.clerk.accounts.dev/*",
      ],
    });
    // host_permissions keep the paths as given.
    expect(result.host_permissions[0]).toBe("https://app.example.com/api/*");
  });

  it("connectable: true skips patterns a web page cannot match", () => {
    const result = extensionHostPermissions({
      hosts: ["<all_urls>", "*://*/*", "https://*/*", "file:///*", "chrome-extension://abc/*", ...hosts],
      mode: "production",
      connectable: true,
    });
    expect(result.externally_connectable).toStrictEqual({ matches: hosts });
    expect(extensionHostPermissions({ hosts: ["<all_urls>"], mode: "production", connectable: true })).not.toHaveProperty("externally_connectable");
  });

  it("a connectable list picks hosts, and dev hosts in development only", () => {
    const options = { hosts, devHosts, connectable: [app, staging] };
    expect(extensionHostPermissions({ ...options, mode: "development" }).externally_connectable).toStrictEqual({ matches: [app, staging] });
    expect(extensionHostPermissions({ ...options, mode: "production" }).externally_connectable).toStrictEqual({ matches: [app] });
    // Only dev hosts listed: nothing is left in production, so the key is left out.
    expect(extensionHostPermissions({ hosts, devHosts, connectable: [staging], mode: "production" })).toStrictEqual({ host_permissions: hosts });
  });

  it("a connectable list rejects patterns that are not hosts or cannot be matched", () => {
    expect(() => extensionHostPermissions({ hosts, mode: "production", connectable: ["https://typo.example.com/*"] })).toThrow(
      "connectable pattern is not in hosts or devHosts: https://typo.example.com/*",
    );
    expect(() => extensionHostPermissions({ hosts: ["<all_urls>"], mode: "production", connectable: ["<all_urls>"] })).toThrow(
      "connectable pattern needs an http(s) scheme and a host name: <all_urls>",
    );
    expect(() => extensionHostPermissions({ hosts: ["https://*/*"], mode: "production", connectable: ["https://*/*"] })).toThrow(/host name/);
  });
});

// A copy of an extension's wxt.config.ts (hosts and names replaced), with the plugin
// factories replaced by stand-ins. The preset must return a deep-equal `manifest` and `vite`.
describe("extension-a wxt config", () => {
  const extensionBuildTarget = "chrome120";
  const devOnlyHostPermissions = ["https://app-git-staging-team.vercel.app/*", "https://example-00.clerk.accounts.dev/*"];
  const own = {
    description: "An example extension",
    version: "0.2.0",
    content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'" },
    permissions: ["storage", "contextMenus", "activeTab", "bookmarks", "history", "alarms", "scripting", "cookies"],
    commands: {
      "save-page": { suggested_key: { default: "Alt+S", mac: "Alt+S" }, description: "Save current page" },
      "take-screenshot": { suggested_key: { default: "Alt+Shift+S", mac: "Alt+Shift+S" }, description: "Capture a region screenshot" },
    },
    web_accessible_resources: [{ resources: ["icon-dark.svg", "icon-light.svg"], matches: ["<all_urls>"] }],
  };
  const hosts = [
    "https://app.example.com/*",
    "https://app.example.org/*",
    "https://clerk.example.com/*",
    "https://chat.openai.com/*",
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://www.youtube.com/*",
    "https://youtube.com/*",
    "<all_urls>",
  ];

  const current = {
    manifest: ({ mode }: { mode: string }) => ({
      name: "extension-a",
      description: "An example extension",
      version: "0.2.0",
      content_security_policy: {
        extension_pages: "script-src 'self'; object-src 'self'",
      },
      permissions: ["storage", "contextMenus", "activeTab", "bookmarks", "history", "alarms", "scripting", "cookies"],
      host_permissions: [...hosts, ...(mode === "development" ? devOnlyHostPermissions : [])],
      commands: {
        "save-page": { suggested_key: { default: "Alt+S", mac: "Alt+S" }, description: "Save current page" },
        "take-screenshot": { suggested_key: { default: "Alt+Shift+S", mac: "Alt+Shift+S" }, description: "Capture a region screenshot" },
      },
      action: {
        default_icon: {
          "16": "icons/icon-16.png",
          "32": "icons/icon-32.png",
          "48": "icons/icon-48.png",
          "128": "icons/icon-128.png",
        },
      },
      icons: {
        "16": "icons/icon-16.png",
        "32": "icons/icon-32.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png",
      },
      web_accessible_resources: [{ resources: ["icon-dark.svg", "icon-light.svg"], matches: ["<all_urls>"] }],
    }),
    vite: () => ({
      plugins: [react(), tailwindcss()],
      build: { target: extensionBuildTarget },
    }),
  };

  const preset = defineVExtensionConfig({
    app: "extension-a",
    react: { plugin: react },
    tailwindcss,
    buildTarget: extensionBuildTarget,
    hosts,
    devHosts: devOnlyHostPermissions,
    manifest: own,
  });

  it("reproduces the manifest in each mode", () => {
    for (const mode of ["development", "production"]) {
      expect(preset.manifest({ mode })).toStrictEqual(current.manifest({ mode }));
    }
  });

  it("reproduces the vite config", () => {
    expect(preset.vite()).toStrictEqual(current.vite());
  });

  it("sets no WXT modules unless asked", () => {
    expect(preset).not.toHaveProperty("modules");
  });
});

describe("defineVExtensionConfig", () => {
  it("defaults: name, icons, host permissions and no plugins", () => {
    const config = defineVExtensionConfig({ app: "ext", hosts: ["https://app.example.com/*"] });
    expect(config.manifest({ mode: "production" })).toStrictEqual({
      name: "ext",
      icons: { ...EXTENSION_ICONS },
      action: { default_icon: { ...EXTENSION_ICONS } },
      host_permissions: ["https://app.example.com/*"],
    });
    expect(config.vite()).toStrictEqual({ plugins: [] });
  });

  it("points the icons at the ui brand assets copied to public/icons", () => {
    expect(EXTENSION_ICONS).toStrictEqual({
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png",
    });
  });

  it("merges the app's action over default_icon, and app keys win elsewhere", () => {
    const config = defineVExtensionConfig({
      app: "ext",
      hosts: [],
      manifest: { action: { default_title: "Ext" }, name: "Ext (beta)", icons: { "128": "custom.png" } },
    });
    expect(config.manifest({ mode: "production" })).toStrictEqual({
      name: "Ext (beta)",
      icons: { "128": "custom.png" },
      action: { default_icon: { ...EXTENSION_ICONS }, default_title: "Ext" },
      host_permissions: [],
    });
  });

  it("calls a manifest function with WXT's env", () => {
    const seen: unknown[] = [];
    const config = defineVExtensionConfig({
      app: "ext",
      hosts: ["https://app.example.com/*"],
      devHosts: ["http://localhost:3000/*"],
      connectable: true,
      manifest: (env) => {
        seen.push(env);
        return { version: env.mode === "development" ? "0.0.0" : "1.2.3" };
      },
    });
    const env = { mode: "development", browser: "chrome", manifestVersion: 3, command: "serve" };
    expect(config.manifest(env)).toStrictEqual({
      name: "ext",
      version: "0.0.0",
      icons: { ...EXTENSION_ICONS },
      action: { default_icon: { ...EXTENSION_ICONS } },
      host_permissions: ["https://app.example.com/*", "http://localhost:3000/*"],
      externally_connectable: { matches: ["https://app.example.com/*", "http://localhost:3000/*"] },
    });
    expect(seen).toStrictEqual([env]);
    expect(config.manifest({ mode: "production" }).version).toBe("1.2.3");
  });

  it("each call returns fresh icon objects", () => {
    const config = defineVExtensionConfig({ app: "ext", hosts: [] });
    const first = config.manifest({ mode: "production" });
    first.icons["16"] = "changed.png";
    first.action.default_icon["16"] = "changed.png";
    expect(config.manifest({ mode: "production" }).icons["16"]).toBe("icons/icon-16.png");
    expect(EXTENSION_ICONS["16"]).toBe("icons/icon-16.png");
  });

  it("plugin order: React (with its compiler), Tailwind, then app plugins without falsy entries", () => {
    const babel = standIn<{ presets: string[] }>("babel");
    const config = defineVExtensionConfig({
      app: "ext",
      hosts: [],
      react: { plugin: () => react(), compiler: { babel, preset: () => "react-compiler" } },
      tailwindcss,
      plugins: [false, { name: "app" }, null, undefined],
    });
    expect(config.vite()).toStrictEqual({
      plugins: [{ name: "react", args: [] }, { name: "babel", args: [{ presets: ["react-compiler"] }] }, { name: "tailwindcss", args: [] }, { name: "app" }],
    });
    expect(defineVExtensionConfig({ app: "ext", hosts: [], react: { plugin: react, compiler: true } }).vite().plugins).toStrictEqual([
      { name: "react", args: [{ compiler: true }] },
    ]);
  });

  it("passes WXT modules through", () => {
    expect(defineVExtensionConfig({ app: "ext", hosts: [], modules: ["@wxt-dev/module-react"] }).modules).toStrictEqual(["@wxt-dev/module-react"]);
  });

  it("calls the plugin factories only when vite() runs", () => {
    let calls = 0;
    const config = defineVExtensionConfig({ app: "ext", hosts: [], tailwindcss: () => ({ name: `tailwind-${++calls}` }) });
    expect(calls).toBe(0);
    expect(config.vite().plugins).toStrictEqual([{ name: "tailwind-1" }]);
  });
});
