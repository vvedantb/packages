import { createRequire } from "node:module";
import { join } from "node:path";

// Expo config plugin that signs the Android `release` build type with a
// sideload keystore. Each value comes from the environment, else from a
// `keystore.properties` file. A release task fails when one is missing, so a
// release never falls back to the debug key.
//
// The plugin appends a Groovy block to `android/app/build.gradle` at prebuild
// time, marked with a stable comment line (`marker`). An app's release build
// script greps for that marker, so keep it stable and set it per app.
//
// `expo/config-plugins` is resolved lazily from the app, so this module loads
// under plain Node without Expo installed. Pass `withAppBuildGradle` to inject
// it (tests do this); otherwise it is required from the app at call time.

/** The keystore.properties / environment variable names the Groovy reads. */
export interface ReleaseSigningPropertyKeys {
  /** Key for the keystore file path. */
  storeFile: string;
  /** Key for the keystore password. */
  storePassword: string;
  /** Key for the key alias. */
  keyAlias: string;
  /** Key for the key password. */
  keyPassword: string;
}

export interface ReleaseSigningOptions {
  /**
   * The marker comment line. It makes the append idempotent and is what a
   * build script greps for. Default `DEFAULT_RELEASE_SIGNING_MARKER`.
   * Set it to the token the app's build script already matches.
   */
  marker?: string;
  /**
   * Groovy expression for the `keystore.properties` file, read inside
   * `app/build.gradle`. Default `rootProject.file("../../../keystore.properties")`
   * (the repository root, three levels above `android/app`).
   */
  keystorePropertiesFile?: string;
  /** Environment / properties key names. Default the `ANDROID_*` set. */
  propertyKeys?: Partial<ReleaseSigningPropertyKeys>;
  /** `storeType` for the signing config, such as `"pkcs12"`. Omitted when unset. */
  storeType?: string;
  /** Skip the append when `EAS_BUILD` is set (EAS handles its own signing). Default `false`. */
  skipOnEasBuild?: boolean;
  /**
   * Groovy boolean expression deciding whether a build signs `release`. It runs
   * inside `gradle.taskGraph.whenReady { graph -> ... }` with `graph` and
   * `project` in scope. Default: any task of this project whose name contains
   * `"release"` (case-insensitive).
   */
  releaseTaskCondition?: string;
}

/** The part of an Expo `appBuildGradle` mod this plugin touches. */
export interface AppBuildGradleMod {
  modResults: { contents: string };
}

/** The part of `withAppBuildGradle` from `expo/config-plugins` this plugin uses. */
export type WithAppBuildGradle = <Config>(
  config: Config,
  action: (mod: AppBuildGradleMod) => AppBuildGradleMod,
) => Config;

export interface WithReleaseSigningOptions extends ReleaseSigningOptions {
  /** `withAppBuildGradle` from `expo/config-plugins`. Resolved from the app when unset. */
  withAppBuildGradle?: WithAppBuildGradle;
}

// The default contains `plugins/withReleaseSigning.js` on purpose: each app's
// build script greps android/app/build.gradle for that exact substring to
// confirm signing was patched in, so the default marker satisfies that grep.
// An app whose own test asserts a different marker passes `marker` to match it.
export const DEFAULT_RELEASE_SIGNING_MARKER =
  "// @generated @vvedantb/config plugins/withReleaseSigning.js";

const DEFAULT_PROPERTY_KEYS: ReleaseSigningPropertyKeys = {
  storeFile: "ANDROID_KEYSTORE_PATH",
  storePassword: "ANDROID_KEYSTORE_PASSWORD",
  keyAlias: "ANDROID_KEY_ALIAS",
  keyPassword: "ANDROID_KEY_PASSWORD",
};

const DEFAULT_KEYSTORE_FILE = 'rootProject.file("../../../keystore.properties")';

const DEFAULT_RELEASE_TASK_CONDITION =
  'graph.allTasks.any { it.project == project && it.name.toLowerCase().contains("release") }';

function resolvedKeys(options?: ReleaseSigningOptions): ReleaseSigningPropertyKeys {
  return { ...DEFAULT_PROPERTY_KEYS, ...options?.propertyKeys };
}

/**
 * The Groovy block appended to `app/build.gradle`. Groovy `${...}` stays
 * literal for Gradle to evaluate, so it is written as `\${...}` here.
 */
export function releaseSigningGradle(options?: ReleaseSigningOptions): string {
  const marker = options?.marker ?? DEFAULT_RELEASE_SIGNING_MARKER;
  const keys = resolvedKeys(options);
  const keystoreFile = options?.keystorePropertiesFile ?? DEFAULT_KEYSTORE_FILE;
  const condition = options?.releaseTaskCondition ?? DEFAULT_RELEASE_TASK_CONDITION;
  const names = [keys.storeFile, keys.storePassword, keys.keyAlias, keys.keyPassword];
  const nameList = names.map((name) => `    "${name}",`).join("\n");
  const storeTypeLine = options?.storeType
    ? `                storeType "${options.storeType}"\n`
    : "";
  return `
${marker}
def releaseSigningProps = new Properties()
def releaseSigningFile = ${keystoreFile}
if (releaseSigningFile.exists()) {
    releaseSigningFile.withInputStream { releaseSigningProps.load(it) }
}
def releaseSigning = [
${nameList}
].collectEntries { name -> [(name): System.getenv(name) ?: releaseSigningProps.getProperty(name)] }
def releaseSigningMissing = releaseSigning.findAll { !it.value }.keySet()

android {
    signingConfigs {
        release {
            if (releaseSigningMissing.isEmpty()) {
${storeTypeLine}                storeFile file(releaseSigning.get("${keys.storeFile}"))
                storePassword releaseSigning.get("${keys.storePassword}")
                keyAlias releaseSigning.get("${keys.keyAlias}")
                keyPassword releaseSigning.get("${keys.keyPassword}")
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}

gradle.taskGraph.whenReady { graph ->
    def release = ${condition}
    if (release && !releaseSigningMissing.isEmpty()) {
        throw new GradleException("Release signing needs \${releaseSigningMissing.join(", ")} in the environment or keystore.properties. Missing: \${releaseSigningMissing.join(", ")}.")
    }
}
`;
}

/**
 * Appends the signing block to `app/build.gradle` contents, once. Returns the
 * contents unchanged when the marker is already present (idempotent).
 */
export function appendReleaseSigning(
  contents: string,
  options?: ReleaseSigningOptions,
): string {
  const marker = options?.marker ?? DEFAULT_RELEASE_SIGNING_MARKER;
  if (contents.includes(marker)) return contents;
  return contents + releaseSigningGradle(options);
}

function loadWithAppBuildGradle(): WithAppBuildGradle {
  // Resolve from the app (Expo runs config plugins with the app as the working
  // directory), not from this package: under a strict node_modules layout this
  // package cannot see the app's `expo`.
  const require = createRequire(join(process.cwd(), "package.json"));
  const plugins: { withAppBuildGradle: WithAppBuildGradle } = require(
    "expo/config-plugins",
  );
  return plugins.withAppBuildGradle;
}

/**
 * Expo config plugin: appends the release signing block to `app/build.gradle`.
 * Pass this through `plugins` in `app.config`, or call it directly on a config.
 */
export function withReleaseSigning<Config>(
  config: Config,
  options?: WithReleaseSigningOptions,
): Config {
  const withGradle = options?.withAppBuildGradle ?? loadWithAppBuildGradle();
  return withGradle(config, (mod) => {
    if (options?.skipOnEasBuild && process.env.EAS_BUILD) return mod;
    mod.modResults.contents = appendReleaseSigning(mod.modResults.contents, options);
    return mod;
  });
}
