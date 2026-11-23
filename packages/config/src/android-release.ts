// Shared logic for the `vvedantb-android-release` bin: build a signed,
// sideloadable Android release APK with Gradle, then write release.json next
// to it. No EAS. The bin (android-release-cli.ts) orchestrates the real tools
// (pnpm, expo prebuild, gradlew, aapt2, apksigner) on Linux CI; this module
// holds the pure, per-app pieces so they can be tested without a build.

/** Semantic version like `1.0.1`. */
const VERSION_NAME_RE = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
/** Android caps versionCode at 2_100_000_000. */
const VERSION_CODE_RE = /^[1-9][0-9]{0,9}$/;
const MAX_VERSION_CODE = 2_100_000_000;

/** Returns `value` when it is a version like `1.0.1`, else throws. */
export function validateVersionName(value: string | undefined): string {
  if (value === undefined || !VERSION_NAME_RE.test(value)) {
    throw new Error("Set VERSION_NAME to a version like 1.0.1.");
  }
  return value;
}

/** Returns the versionCode as a number when valid (1..2_100_000_000), else throws. */
export function validateVersionCode(value: string | undefined): number {
  if (value === undefined || !VERSION_CODE_RE.test(value)) {
    throw new Error(
      "Set VERSION_CODE to a whole number from 1 to 2100000000, higher than every published release.json.",
    );
  }
  const code = Number(value);
  if (code > MAX_VERSION_CODE) {
    throw new Error(
      "Set VERSION_CODE to a whole number from 1 to 2100000000, higher than every published release.json.",
    );
  }
  return code;
}

/** Where a baked-in default for an `EXPO_PUBLIC_*` value is read from. */
export type PublicEnvSource =
  | {
      /** The `build.<profile>.env[name]` value in `eas.json`. */
      kind: "eas-profile";
      /** Profile name. Default `"production"`. */
      profile?: string;
      /**
       * The profile wins over the environment, and a name the profile lacks is
       * an error (no fallback to the environment or a later source). Use it when
       * a release must bake the same values as the EAS profile, whatever the
       * shell or a local `.env` says. Default `false`.
       */
      authoritative?: boolean;
      /**
       * Also export every entry of the profile `env` (not only `publicEnv`
       * names) to the build, such as a strict-mode flag. Default `false`.
       */
      exportAll?: boolean;
    }
  | {
      /** A `process.env.NAME <op> "literal"` default in a config file. */
      kind: "config-literal";
      /** File relative to the app folder, such as `"app.config.ts"` or `"src/config.ts"`. */
      file: string;
      /** Operators that precede the literal. Default `["??", "||"]`. */
      operators?: readonly ("??" | "||")[];
    };

/** Reads a text file relative to the app folder, or `undefined` when absent. */
export type ReadAppFile = (relativePath: string) => string | undefined;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function literalFromConfig(
  contents: string,
  name: string,
  operators: readonly ("??" | "||")[],
): string | undefined {
  const ops = operators.map((op) => escapeRegExp(op)).join("|");
  const re = new RegExp(`process\\.env\\.${escapeRegExp(name)}\\s*(?:${ops})\\s*"([^"]+)"`);
  return re.exec(contents)?.[1];
}

function easProfileEnvNode(easContents: string, profile: string): Record<string, unknown> | undefined {
  const parsed: unknown = JSON.parse(easContents);
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const build = (parsed as { build?: unknown }).build;
  if (typeof build !== "object" || build === null) return undefined;
  const profileNode = (build as Record<string, unknown>)[profile];
  if (typeof profileNode !== "object" || profileNode === null) return undefined;
  const env = (profileNode as { env?: unknown }).env;
  if (typeof env !== "object" || env === null) return undefined;
  return env as Record<string, unknown>;
}

function easProfileEnv(
  easContents: string,
  profile: string,
  name: string,
): string | undefined {
  const value = easProfileEnvNode(easContents, profile)?.[name];
  return typeof value === "string" ? value : undefined;
}

/** The string entries of `build.<profile>.env` in `eas.json` (empty when absent). */
export function easProfileEntries(
  easContents: string,
  profile = "production",
): Record<string, string> {
  const env = easProfileEnvNode(easContents, profile) ?? {};
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

/**
 * Resolves an `EXPO_PUBLIC_*` value: an `authoritative` `eas.json` source first
 * (it wins, and a name it lacks resolves to `""`), else the environment, then
 * each source in turn (an `eas.json` profile, or a `process.env.NAME ?? "literal"` default in a
 * config file). Returns `""` when nothing supplies it, so callers decide whether
 * a missing value is an error.
 */
export function publicEnvDefault(
  name: string,
  options: {
    env: NodeJS.ProcessEnv;
    readAppFile: ReadAppFile;
    sources?: readonly PublicEnvSource[];
  },
): string {
  for (const source of options.sources ?? []) {
    if (source.kind !== "eas-profile" || source.authoritative !== true) continue;
    const contents = options.readAppFile("eas.json");
    if (contents === undefined) return "";
    return easProfileEnv(contents, source.profile ?? "production", name) ?? "";
  }
  const fromEnv = options.env[name];
  if (fromEnv !== undefined && fromEnv !== "") return fromEnv;
  for (const source of options.sources ?? []) {
    if (source.kind === "eas-profile") {
      const contents = options.readAppFile("eas.json");
      if (contents === undefined) continue;
      const value = easProfileEnv(contents, source.profile ?? "production", name);
      if (value !== undefined && value !== "") return value;
    } else {
      const contents = options.readAppFile(source.file);
      if (contents === undefined) continue;
      const value = literalFromConfig(contents, name, source.operators ?? ["??", "||"]);
      if (value !== undefined && value !== "") return value;
    }
  }
  return "";
}

/** One edit to `gradle.properties`. */
export interface GradlePropertyEdit {
  /** Property key, such as `"org.gradle.jvmargs"`. */
  key: string;
  /** Property value. */
  value: string;
  /** Replace an existing line (true) or only append when absent (false). */
  replace: boolean;
}

/** Default `reactNativeArchitectures`: published APKs target phones. */
export const DEFAULT_REACT_NATIVE_ARCHITECTURES = "arm64-v8a";

/**
 * Resolves the `reactNativeArchitectures` value. Precedence: explicit `option`
 * (for example the `REACT_NATIVE_ARCHITECTURES` env var), then `fallback` (the
 * config field), then `arm64-v8a`. Empty or blank values are skipped. The
 * existing `gradle.properties` value is not preserved: Expo's prebuild default
 * is fat, so keeping it would widen every app that relies on the arm64 force.
 */
export function resolveReactNativeArchitectures(option?: string, fallback?: string): string {
  for (const candidate of [option, fallback]) {
    const trimmed = candidate?.trim();
    if (trimmed !== undefined && trimmed !== "") return trimmed;
  }
  return DEFAULT_REACT_NATIVE_ARCHITECTURES;
}

const BASE_GRADLE_PROPERTY_EDITS: readonly GradlePropertyEdit[] = [
  { key: "org.gradle.jvmargs", value: "-Xmx4096m -XX:MaxMetaspaceSize=1024m", replace: true },
  // boat-large has 8 cores. Replace Expo's lower default.
  { key: "org.gradle.workers.max", value: "8", replace: true },
  { key: "org.gradle.parallel", value: "true", replace: true },
  // org.gradle.configuration-cache stays off: ephemeral CI runners never reuse
  // the cache, and native modules may still be incompatible on release tasks.
  { key: "android.lint.checkReleaseBuilds", value: "false", replace: false },
];

/** The edits the release build makes to `gradle.properties`, in order. */
export function buildGradlePropertyEdits(
  reactNativeArchitectures?: string,
): readonly GradlePropertyEdit[] {
  return [
    {
      key: "reactNativeArchitectures",
      value: resolveReactNativeArchitectures(reactNativeArchitectures),
      replace: true,
    },
    ...BASE_GRADLE_PROPERTY_EDITS,
  ];
}

/** The default edits (arm64-v8a only), in order. */
export const DEFAULT_GRADLE_PROPERTY_EDITS: readonly GradlePropertyEdit[] =
  buildGradlePropertyEdits();

function withTrailingNewline(contents: string): string {
  if (contents.length === 0) return contents;
  return contents.endsWith("\n") ? contents : contents + "\n";
}

/**
 * Applies the release edits to `gradle.properties` contents and returns the new
 * text. A `replace` edit overwrites an existing `key=` line or appends when
 * absent; a non-replace edit only appends when the key is absent. Always ends
 * with a trailing newline (an append onto a file without one joins two lines and
 * Gradle fails to parse it).
 */
export function gradlePropertiesEdits(
  contents: string,
  edits: readonly GradlePropertyEdit[] = DEFAULT_GRADLE_PROPERTY_EDITS,
): string {
  let text = withTrailingNewline(contents);
  for (const edit of edits) {
    const line = `${edit.key}=${edit.value}`;
    const keyRe = new RegExp(`^${escapeRegExp(edit.key)}=.*$`, "m");
    if (keyRe.test(text)) {
      if (edit.replace) text = text.replace(keyRe, line);
    } else {
      text = withTrailingNewline(text) + line + "\n";
    }
  }
  return text;
}

/** The package, versionCode and versionName from `aapt2 dump badging`. */
export interface BadgingFields {
  name: string;
  versionCode: string;
  versionName: string;
}

/** Parses the `package:` line of `aapt2 dump badging` output. */
export function parseBadging(output: string): BadgingFields {
  const line = output.split("\n").find((l) => l.startsWith("package:")) ?? "";
  const field = (key: string): string =>
    new RegExp(`${key}='([^']*)'`).exec(line)?.[1] ?? "";
  return {
    name: field("name"),
    versionCode: field("versionCode"),
    versionName: field("versionName"),
  };
}

/** The release.json written next to the APK. */
export interface ReleaseJson {
  versionName: string;
  versionCode: number;
  sha256: string;
}

/** Builds the release.json object from the version values and APK hash. */
export function releaseJson(
  versionName: string,
  versionCode: number,
  sha256: string,
): ReleaseJson {
  return { versionName, versionCode, sha256 };
}

/** Serialises release.json exactly as published (2-space indent, trailing newline). */
export function formatReleaseJson(release: ReleaseJson): string {
  return JSON.stringify(release, null, 2) + "\n";
}

/** Formats the `key=value` lines appended to `$GITHUB_OUTPUT`. */
export function formatGithubOutput(outputs: Readonly<Record<string, string>>): string {
  return (
    Object.entries(outputs)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n"
  );
}

/** Per-app configuration for the Android release build. */
export interface AndroidReleaseConfig {
  /** Android package id, such as `"com.projectvdotuk.vmem"`. */
  packageId: string;
  /** App folder relative to the repo root. Default `"apps/mobile"`. */
  appDir: string;
  /** Published APK name prefix, such as `"vmem"` (`vmem-1.0.1-android.apk`). */
  apkPrefix: string;
  /** `EXPO_PUBLIC_*` names that must be baked into the APK. */
  publicEnv: readonly string[];
  /** Where to read a default for a missing `EXPO_PUBLIC_*` value. */
  publicEnvSources: readonly PublicEnvSource[];
  /** `pnpm install --filter` values, such as `["@vmem/mobile...", "{.}"]`. */
  pnpmFilters: readonly string[];
  /**
   * After versionName resolves, write it to `<appDir>/app.json` (`expo.version`)
   * and the root `package.json` (`version`) when those files exist, before
   * prebuild. Default `false`.
   */
  syncAppVersion: boolean;
  /** Read `expo.version` from `<appDir>/app.json` when `VERSION_NAME` is unset. Default `false`. */
  versionNameFromAppJson: boolean;
  /** Pass `--no-install` to `expo prebuild` (vibot installs during prebuild). */
  prebuildNoInstall: boolean;
  /** Extra environment set for the whole build, such as `{ APP_VARIANT: "production" }`. */
  extraEnv: Readonly<Record<string, string>>;
  /** Names removed from the build environment before `extraEnv` is applied, such as `["APP_VARIANT"]`. */
  unsetEnv: readonly string[];
  /** Optional `EXPO_PUBLIC_*` names (set from env when present, never required). */
  optionalEnv: readonly string[];
  /** Shell commands run in the repo root before the build, such as a Clerk check. */
  preChecks: readonly string[];
  /** Commands run in the app folder after install, before prebuild, such as `pnpm run test:babel`. */
  preBuildSteps: readonly string[];
  /** Commands run in the app folder after prebuild, before Gradle, such as a check of a generated file. */
  postPrebuildSteps: readonly string[];
  /** Pin the Gradle wrapper: replace `distributionUrl` when it contains `ifContains`. */
  gradleWrapperPin?: { ifContains: string; distributionUrl: string };
  /**
   * ABIs for `reactNativeArchitectures` in `gradle.properties`, such as
   * `"arm64-v8a,x86_64"`. The `REACT_NATIVE_ARCHITECTURES` env var wins over it.
   * Default `"arm64-v8a"`.
   */
  reactNativeArchitectures?: string;
  /** Label and env var for the final summary line, such as `{ label: "Convex", envVar: "EXPO_PUBLIC_CONVEX_URL" }`. */
  summary?: { label: string; envVar: string };
}

const DEFAULT_CONFIG: Omit<AndroidReleaseConfig, "packageId" | "apkPrefix" | "publicEnv"> = {
  appDir: "apps/mobile",
  publicEnvSources: [],
  pnpmFilters: ["{.}"],
  prebuildNoInstall: true,
  syncAppVersion: false,
  versionNameFromAppJson: false,
  extraEnv: {},
  unsetEnv: [],
  optionalEnv: [],
  preChecks: [],
  preBuildSteps: [],
  postPrebuildSteps: [],
};

function asStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new Error(`android-release config: "${field}" must be an array of strings.`);
  }
  return value as string[];
}

/**
 * Validates a parsed JSON config object into an {@link AndroidReleaseConfig},
 * filling defaults. Throws a clear error on a bad shape. Kept hand-written so
 * the package takes no schema dependency.
 */
export function parseAndroidReleaseConfig(input: unknown): AndroidReleaseConfig {
  if (typeof input !== "object" || input === null) {
    throw new Error("android-release config: expected a JSON object.");
  }
  const raw = input as Record<string, unknown>;
  if (typeof raw.packageId !== "string") {
    throw new Error('android-release config: "packageId" is required.');
  }
  if (typeof raw.apkPrefix !== "string") {
    throw new Error('android-release config: "apkPrefix" is required.');
  }
  const config: AndroidReleaseConfig = {
    ...DEFAULT_CONFIG,
    packageId: raw.packageId,
    apkPrefix: raw.apkPrefix,
    publicEnv: asStringArray(raw.publicEnv ?? [], "publicEnv"),
  };
  if (raw.appDir !== undefined) {
    if (typeof raw.appDir !== "string") throw new Error('android-release config: "appDir" must be a string.');
    config.appDir = raw.appDir;
  }
  if (raw.publicEnvSources !== undefined) {
    if (!Array.isArray(raw.publicEnvSources)) {
      throw new Error('android-release config: "publicEnvSources" must be an array.');
    }
    config.publicEnvSources = raw.publicEnvSources.map((source) =>
      parsePublicEnvSource(source),
    );
  }
  if (raw.pnpmFilters !== undefined) config.pnpmFilters = asStringArray(raw.pnpmFilters, "pnpmFilters");
  if (raw.prebuildNoInstall !== undefined) {
    if (typeof raw.prebuildNoInstall !== "boolean") {
      throw new Error('android-release config: "prebuildNoInstall" must be a boolean.');
    }
    config.prebuildNoInstall = raw.prebuildNoInstall;
  }
  for (const key of ["syncAppVersion", "versionNameFromAppJson"] as const) {
    if (raw[key] === undefined) continue;
    if (typeof raw[key] !== "boolean") throw new Error(`android-release config: "${key}" must be a boolean.`);
    config[key] = raw[key];
  }
  if (raw.extraEnv !== undefined) config.extraEnv = parseStringRecord(raw.extraEnv, "extraEnv");
  if (raw.unsetEnv !== undefined) config.unsetEnv = asStringArray(raw.unsetEnv, "unsetEnv");
  if (raw.optionalEnv !== undefined) config.optionalEnv = asStringArray(raw.optionalEnv, "optionalEnv");
  if (raw.preChecks !== undefined) config.preChecks = asStringArray(raw.preChecks, "preChecks");
  if (raw.preBuildSteps !== undefined) config.preBuildSteps = asStringArray(raw.preBuildSteps, "preBuildSteps");
  if (raw.postPrebuildSteps !== undefined) {
    config.postPrebuildSteps = asStringArray(raw.postPrebuildSteps, "postPrebuildSteps");
  }
  if (raw.gradleWrapperPin !== undefined) config.gradleWrapperPin = parseWrapperPin(raw.gradleWrapperPin);
  if (raw.reactNativeArchitectures !== undefined) {
    if (typeof raw.reactNativeArchitectures !== "string") {
      throw new Error('android-release config: "reactNativeArchitectures" must be a string.');
    }
    config.reactNativeArchitectures = raw.reactNativeArchitectures;
  }
  if (raw.summary !== undefined) config.summary = parseSummary(raw.summary);
  return config;
}

function parsePublicEnvSource(input: unknown): PublicEnvSource {
  if (typeof input !== "object" || input === null) {
    throw new Error('android-release config: each "publicEnvSources" entry must be an object.');
  }
  const raw = input as Record<string, unknown>;
  if (raw.kind === "eas-profile") {
    const source: PublicEnvSource = { kind: "eas-profile" };
    if (raw.profile !== undefined) {
      if (typeof raw.profile !== "string") throw new Error('android-release config: "profile" must be a string.');
      source.profile = raw.profile;
    }
    for (const key of ["authoritative", "exportAll"] as const) {
      if (raw[key] === undefined) continue;
      if (typeof raw[key] !== "boolean") throw new Error(`android-release config: "${key}" must be a boolean.`);
      source[key] = raw[key];
    }
    return source;
  }
  if (raw.kind === "config-literal") {
    if (typeof raw.file !== "string") {
      throw new Error('android-release config: a "config-literal" source needs a "file".');
    }
    const source: PublicEnvSource = { kind: "config-literal", file: raw.file };
    if (raw.operators !== undefined) {
      if (
        !Array.isArray(raw.operators) ||
        raw.operators.some((op) => op !== "??" && op !== "||")
      ) {
        throw new Error('android-release config: "operators" must be a list of "??" or "||".');
      }
      source.operators = raw.operators as ("??" | "||")[];
    }
    return source;
  }
  throw new Error('android-release config: source "kind" must be "eas-profile" or "config-literal".');
}

function parseStringRecord(input: unknown, field: string): Record<string, string> {
  if (typeof input !== "object" || input === null) {
    throw new Error(`android-release config: "${field}" must be an object.`);
  }
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "string") throw new Error(`android-release config: "${field}.${key}" must be a string.`);
    result[key] = value;
  }
  return result;
}

function parseWrapperPin(input: unknown): { ifContains: string; distributionUrl: string } {
  if (typeof input !== "object" || input === null) {
    throw new Error('android-release config: "gradleWrapperPin" must be an object.');
  }
  const raw = input as Record<string, unknown>;
  if (typeof raw.ifContains !== "string" || typeof raw.distributionUrl !== "string") {
    throw new Error('android-release config: "gradleWrapperPin" needs "ifContains" and "distributionUrl".');
  }
  return { ifContains: raw.ifContains, distributionUrl: raw.distributionUrl };
}

function parseSummary(input: unknown): { label: string; envVar: string } {
  if (typeof input !== "object" || input === null) {
    throw new Error('android-release config: "summary" must be an object.');
  }
  const raw = input as Record<string, unknown>;
  if (typeof raw.label !== "string" || typeof raw.envVar !== "string") {
    throw new Error('android-release config: "summary" needs "label" and "envVar".');
  }
  return { label: raw.label, envVar: raw.envVar };
}

/** The published APK file name for a version, such as `vmem-1.0.1-android.apk`. */
export function apkFileName(apkPrefix: string, versionName: string): string {
  return `${apkPrefix}-${versionName}-android.apk`;
}

/** `expo.version` from app.json contents, or `undefined` when absent or not a string. */
export function readExpoVersion(appJsonContents: string): string | undefined {
  const parsed: unknown = JSON.parse(appJsonContents);
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const expo = (parsed as { expo?: unknown }).expo;
  if (typeof expo !== "object" || expo === null) return undefined;
  const version = (expo as { version?: unknown }).version;
  return typeof version === "string" && version !== "" ? version : undefined;
}

/** app.json contents with `expo.version` set. Throws when there is no `expo` object. */
export function syncExpoVersion(appJsonContents: string, versionName: string): string {
  const parsed: unknown = JSON.parse(appJsonContents);
  const expo = typeof parsed === "object" && parsed !== null ? (parsed as { expo?: unknown }).expo : undefined;
  if (typeof expo !== "object" || expo === null) {
    throw new Error('app.json has no "expo" object to set the version on.');
  }
  (expo as { version?: string }).version = versionName;
  return JSON.stringify(parsed, null, 2) + "\n";
}

/** package.json contents with `version` set. */
export function syncPackageJsonVersion(packageJsonContents: string, versionName: string): string {
  const parsed: unknown = JSON.parse(packageJsonContents);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("package.json is not a JSON object.");
  }
  (parsed as { version?: string }).version = versionName;
  return JSON.stringify(parsed, null, 2) + "\n";
}

/** True when the generated `android/app/build.gradle` sets `versionName "<versionName>"`. */
export function gradleVersionNameOk(gradleText: string, versionName: string): boolean {
  return new RegExp(`^[\\t ]*versionName ["']${escapeRegExp(versionName)}["'][\\t ]*$`, "m").test(gradleText);
}
