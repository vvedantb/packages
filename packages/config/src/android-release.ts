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

function easProfileEnv(
  easContents: string,
  profile: string,
  name: string,
): string | undefined {
  const parsed: unknown = JSON.parse(easContents);
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const build = (parsed as { build?: unknown }).build;
  if (typeof build !== "object" || build === null) return undefined;
  const profileNode = (build as Record<string, unknown>)[profile];
  if (typeof profileNode !== "object" || profileNode === null) return undefined;
  const env = (profileNode as { env?: unknown }).env;
  if (typeof env !== "object" || env === null) return undefined;
  const value = (env as Record<string, unknown>)[name];
  return typeof value === "string" ? value : undefined;
}

/**
 * Resolves an `EXPO_PUBLIC_*` value: the environment first, then each source in
 * turn (an `eas.json` profile, or a `process.env.NAME ?? "literal"` default in a
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

/** The edits the release build makes to `gradle.properties`, in order. */
export const DEFAULT_GRADLE_PROPERTY_EDITS: readonly GradlePropertyEdit[] = [
  { key: "reactNativeArchitectures", value: "arm64-v8a,x86_64", replace: true },
  { key: "org.gradle.jvmargs", value: "-Xmx4096m -XX:MaxMetaspaceSize=1024m", replace: true },
  { key: "org.gradle.workers.max", value: "2", replace: false },
  { key: "android.lint.checkReleaseBuilds", value: "false", replace: false },
];

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
  /** Pass `--no-install` to `expo prebuild` (vibot installs during prebuild). */
  prebuildNoInstall: boolean;
  /** Extra environment set for the whole build, such as `{ APP_VARIANT: "production" }`. */
  extraEnv: Readonly<Record<string, string>>;
  /** Optional `EXPO_PUBLIC_*` names (set from env when present, never required). */
  optionalEnv: readonly string[];
  /** Shell commands run in the repo root before the build, such as a Clerk check. */
  preChecks: readonly string[];
  /** Commands run in the app folder after install, before prebuild, such as `pnpm run test:babel`. */
  preBuildSteps: readonly string[];
  /** Pin the Gradle wrapper: replace `distributionUrl` when it contains `ifContains`. */
  gradleWrapperPin?: { ifContains: string; distributionUrl: string };
  /** Label and env var for the final summary line, such as `{ label: "Convex", envVar: "EXPO_PUBLIC_CONVEX_URL" }`. */
  summary?: { label: string; envVar: string };
}

const DEFAULT_CONFIG: Omit<AndroidReleaseConfig, "packageId" | "apkPrefix" | "publicEnv"> = {
  appDir: "apps/mobile",
  publicEnvSources: [],
  pnpmFilters: ["{.}"],
  prebuildNoInstall: true,
  extraEnv: {},
  optionalEnv: [],
  preChecks: [],
  preBuildSteps: [],
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
  if (raw.extraEnv !== undefined) config.extraEnv = parseStringRecord(raw.extraEnv, "extraEnv");
  if (raw.optionalEnv !== undefined) config.optionalEnv = asStringArray(raw.optionalEnv, "optionalEnv");
  if (raw.preChecks !== undefined) config.preChecks = asStringArray(raw.preChecks, "preChecks");
  if (raw.preBuildSteps !== undefined) config.preBuildSteps = asStringArray(raw.preBuildSteps, "preBuildSteps");
  if (raw.gradleWrapperPin !== undefined) config.gradleWrapperPin = parseWrapperPin(raw.gradleWrapperPin);
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
