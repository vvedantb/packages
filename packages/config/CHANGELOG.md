# Changelog

## 0.4.0

- New subpath `@vvedantb/config/extension` for Chrome extensions built with WXT. Like the Vite presets, it never imports WXT, Vite or a plugin; the app passes its plugin factories in. WXT is not a peer.
- `extensionHostPermissions({ hosts, devHosts, mode, connectable })` replaces the dev-only host lists the extensions kept in `wxt.config.ts` and `vite.config.ts`. `host_permissions` is `hosts`, plus `devHosts` when `mode` is `"development"`, without duplicates. `connectable` (off by default) adds `externally_connectable.matches` for those hosts, with the path set to `/*`. `true` takes every host that names one; a list picks some and throws on a pattern that is not a host.
- `defineVExtensionConfig({ app, react, tailwindcss, plugins, modules, buildTarget, hosts, devHosts, connectable, manifest })` returns WXT's `manifest` and `vite` (and `modules` when set). The manifest gets `name`, `icons` and `action.default_icon` at `icons/icon-{16,32,48,128}.png` (`EXTENSION_ICONS`, the `@vvedantb/ui` extension brand assets copied to `public/icons/`), the host keys, then the app's own keys. A test compares it with a copy of an extension's current config.
- New bin `vvedantb-clerk-allow <extension-id>`. It adds `chrome-extension://<id>` to the allowed origins of the Clerk instance whose key is in `CLERK_SECRET_KEY`: GET `/v1/instance`, add the origin, PATCH the full list. It does nothing if the origin is already there or the response has no list. The key is never printed. The root exports `runClerkAllow` and the types `ClerkAllowIo`, `ClerkAllowFetch` and `ClerkAllowResponse`; tests pass a fake `fetch`.
- No zip or release helper: `wxt zip` already covers it.
- No new dependencies or peers.

## 0.3.0

- New Vite and Vitest presets: `defineWebViteConfig`, `defineWebVitestConfig`, `reactPlugins`, `vendorChunkBuild`, `srcAlias` and `REACT_DEDUPE`. The app passes its plugin factories in; the root does not import Vite or any plugin, and needs no new peer.
- New Expo presets: `expoBabelConfig` (Babel with NativeWind) and `defineExpoMetroConfig` (Metro with NativeWind, monorepo folders and package exports).
- Each preset reproduces each app's current config object exactly. Tests compare it per app with a copy of that config.
- The root export uses the `default` condition instead of `import`, so CommonJS files can `require()` it (Node 20.19+ or 22.12+). It is still one ES module, not a dual build.
- README: `npx @vvedantb/config sync` cannot pick between the two bins. The docs now use the `vvedantb-config` bin (`pnpm exec vvedantb-config sync --check`) or `npx -p @vvedantb/config vvedantb-config`.
- The oxlint base is unchanged: no rule is set the same way by every app.

## 0.2.0

- Publishable again: `"private"` removed, `publishConfig.access: public`, and `repository.url` now points at github.com/vvedantb/packages.
- Breaking: the `./versions` subpath is gone. Import `versions` and `Versions` from the root (`@vvedantb/config`), which already exported them. The JSON subpaths (`./tsconfig/*.json`, `./oxlint/base.json`) stay, because tools resolve them by path.
- New bin `vvedantb-check-asar` checks a packaged Electron `app.asar` for missing runtime modules. It has two modes:
  - `list` reads the archive with `@electron/asar`.
  - `resolve` re-runs itself inside the packaged binary with `ELECTRON_RUN_AS_NODE=1`, and can run an app `--hook`.
  - The root also exports `runCheckAsar`, `packageName`, `findSpecifiers`, `findBareImports`, `CHECK_ASAR_CHILD_ENV` and the types `CheckAsarIo`, `AsarCheckHook` and `AsarCheckHookContext`.
- `@electron/asar` (`^3.2.0 || ^4.0.0`) is an optional peer. Only `list` mode loads it.
- `vvedantb-config sync` is unchanged.

## 0.1.1

- Not published to npm (npm latest stays 0.1.0).
- Marked `"private": true`.
- Docs no longer name consuming apps.
- The build compiles with `module`/`moduleResolution: NodeNext`, so the emitted ESM runs under plain Node.
- No change to the sync behaviour, the tsconfig bases or the oxlint base.

## 0.1.0

- First release: tsconfig bases, an oxlint base, pinned tool versions (`./versions`) and the `vvedantb-config sync [--check]` CLI.
