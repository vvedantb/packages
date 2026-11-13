#!/usr/bin/env node
// `vvedantb-android-release`: build a signed, sideloadable Android release APK
// (arm64-v8a + x86_64, embedded JS) with Gradle, then write release.json next to
// it. No EAS. One bin for every app; per-app differences come from a JSON config:
//
//   VERSION_NAME=1.0.1 VERSION_CODE=1000 \
//     vvedantb-android-release --config scripts/android-release.config.json
//
// The release workflow chooses VERSION_NAME and VERSION_CODE. Signing reads
// ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS and
// ANDROID_KEY_PASSWORD from the environment, else from keystore.properties in the
// repo root (see withReleaseSigning). The build stops if any is missing. Linux or
// WSL2 (GNU sed is not needed; edits run in Node). This orchestration needs a
// Linux host with the Android SDK, so it is exercised only on CI, never on the
// package's own test run.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  chmodSync,
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  apkFileName,
  formatGithubOutput,
  formatReleaseJson,
  gradlePropertiesEdits,
  parseAndroidReleaseConfig,
  parseBadging,
  publicEnvDefault,
  releaseJson,
  validateVersionCode,
  validateVersionName,
  type AndroidReleaseConfig,
  type ReadAppFile,
} from "./android-release.js";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function flag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index >= 0 && index + 1 < args.length) return args[index + 1];
  return undefined;
}

function run(
  command: string,
  commandArgs: readonly string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
): void {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd,
    env: options.env,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    fail(`${command} ${commandArgs.join(" ")} failed with code ${result.status ?? "null"}.`);
  }
}

function capture(
  command: string,
  commandArgs: readonly string[],
  cwd: string,
): string {
  const result = spawnSync(command, commandArgs, { cwd, encoding: "utf8", shell: false });
  if (result.status !== 0) {
    fail(`${command} ${commandArgs.join(" ")} failed with code ${result.status ?? "null"}.`);
  }
  return result.stdout;
}

/** Highest versioned subdirectory under `base` whose `bin/sdkmanager` is a file. */
function findSdkManager(sdkRoot: string): string | undefined {
  const latest = join(sdkRoot, "cmdline-tools", "latest", "bin", "sdkmanager");
  if (existsSync(latest)) return latest;
  const toolsRoot = join(sdkRoot, "cmdline-tools");
  if (!existsSync(toolsRoot)) return undefined;
  const versioned = readdirSync(toolsRoot)
    .filter((name) => /^[0-9]+(\.[0-9]+)*$/.test(name))
    .sort(compareVersions);
  for (const name of versioned) {
    const candidate = join(toolsRoot, name, "bin", "sdkmanager");
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

/** Newest build-tools directory that has both aapt2 and apksigner. */
function findBuildTools(sdkRoot: string): string | undefined {
  const base = join(sdkRoot, "build-tools");
  if (!existsSync(base)) return undefined;
  const versions = readdirSync(base).sort(compareVersions);
  let found: string | undefined;
  for (const name of versions) {
    const dir = join(base, name);
    if (existsSync(join(dir, "aapt2")) && existsSync(join(dir, "apksigner"))) {
      found = dir;
    }
  }
  return found;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number(n));
  const pb = b.split(".").map((n) => Number(n));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const args = process.argv.slice(2);
const configPath = flag(args, "--config");
if (configPath === undefined) {
  fail("Pass --config <path to android-release.config.json>.");
}
const root = resolve(flag(args, "--root") ?? process.cwd());
const skipPrebuild = (process.env.SKIP_PREBUILD ?? "") === "1";

let config: AndroidReleaseConfig;
try {
  config = parseAndroidReleaseConfig(JSON.parse(readFileSync(resolve(configPath), "utf8")));
} catch (error) {
  fail(`Could not read config at ${configPath}: ${(error as Error).message}`);
}

const appDir = join(root, config.appDir);
const env: NodeJS.ProcessEnv = { ...process.env };

const versionName = validateVersionName(env.VERSION_NAME);
const versionCode = validateVersionCode(env.VERSION_CODE);
env.VERSION_NAME = versionName;
env.VERSION_CODE = String(versionCode);

// Bake the production runtime config into the APK. Each value comes from the
// environment, else a baked-in default named in the config. A release never
// ships without them.
const readAppFile: ReadAppFile = (relativePath) => {
  const full = join(appDir, relativePath);
  return existsSync(full) ? readFileSync(full, "utf8") : undefined;
};
for (const name of config.publicEnv) {
  const value = publicEnvDefault(name, { env, readAppFile, sources: config.publicEnvSources });
  if (value === "") {
    fail(`${name} is not set in the environment or as a default in ${config.appDir}.`);
  }
  env[name] = value;
}
// optionalEnv names are passed through from the environment when present; the
// copied `env` already carries them, so nothing extra is needed here.
for (const [key, value] of Object.entries(config.extraEnv)) env[key] = value;

// Our own signing (EAS_BUILD would switch it off in Expo tooling).
delete env.EAS_BUILD;
env.CI = env.CI ?? "1";

const sdkRoot = env.ANDROID_SDK_ROOT ?? env.ANDROID_HOME ?? join(env.HOME ?? "", "Android/Sdk");
env.ANDROID_SDK_ROOT = sdkRoot;
env.ANDROID_HOME = sdkRoot;
const javaHome = env.JAVA_HOME ?? "/usr/lib/jvm/java-21-openjdk-amd64";
env.JAVA_HOME = javaHome;
env.PATH = [
  join(javaHome, "bin"),
  join(sdkRoot, "platform-tools"),
  join(sdkRoot, "emulator"),
  env.PATH ?? "",
].join(":");

const sdkManager = findSdkManager(sdkRoot);
if (sdkManager === undefined) {
  fail(`Android SDK cmdline-tools not found at ${sdkRoot}/cmdline-tools (latest or a version folder).`);
}
env.PATH = `${dirname(sdkManager)}:${env.PATH}`;

// Repo-root checks the app runs before building (such as a Clerk API check).
for (const check of config.preChecks) {
  run("bash", ["-lc", check], { cwd: root, env });
}

// Mobile and its workspace deps, plus the root, whose pnpm settings the install uses.
const installArgs = ["install", "--frozen-lockfile"];
for (const filter of config.pnpmFilters) installArgs.push("--filter", filter);
run("pnpm", installArgs, { cwd: root, env });

// App-folder steps after install, before prebuild (such as a babel smoke test).
for (const step of config.preBuildSteps) {
  run("bash", ["-lc", step], { cwd: appDir, env });
}

if (!skipPrebuild) {
  const prebuildArgs = ["expo", "prebuild", "--platform", "android", "--clean"];
  if (config.prebuildNoInstall) prebuildArgs.push("--no-install");
  run("npx", prebuildArgs, { cwd: appDir, env });
}

// app.config reads VERSION_CODE at prebuild time, so a SKIP_PREBUILD run keeps
// whatever android/ was generated with.
const appGradle = join(appDir, "android", "app", "build.gradle");
const appGradleText = existsSync(appGradle) ? readFileSync(appGradle, "utf8") : "";
const versionCodeOk = new RegExp(`^[\\t ]*versionCode ${versionCode}[\\t ]*$`, "m").test(appGradleText);
if (!versionCodeOk || !appGradleText.includes("withReleaseSigning")) {
  fail("android/ is stale (versionCode or signing). Run again without SKIP_PREBUILD=1.");
}

// Optionally pin the Gradle wrapper (one app ships an incompatible default).
if (config.gradleWrapperPin !== undefined) {
  const wrapperProps = join(appDir, "android", "gradle", "wrapper", "gradle-wrapper.properties");
  if (existsSync(wrapperProps)) {
    const text = readFileSync(wrapperProps, "utf8");
    if (text.includes(config.gradleWrapperPin.ifContains)) {
      const next = text.replace(
        /^distributionUrl=.*$/m,
        `distributionUrl=${config.gradleWrapperPin.distributionUrl.replaceAll(":", "\\:")}`,
      );
      writeFileSync(wrapperProps, next);
    }
  }
}

const propsPath = join(appDir, "android", "gradle.properties");
const propsText = existsSync(propsPath) ? readFileSync(propsPath, "utf8") : "";
writeFileSync(propsPath, gradlePropertiesEdits(propsText));

writeFileSync(join(appDir, "android", "local.properties"), `sdk.dir=${sdkRoot}\n`);

const outDir = join(appDir, "android", "app", "build", "outputs", "apk", "release");
const apk = join(outDir, "app-release.apk");
// A failed run must not leave an older APK or release.json to publish.
for (const stale of [apk, join(outDir, "release.json")]) {
  if (existsSync(stale)) rmSync(stale);
}
if (existsSync(outDir)) {
  for (const name of readdirSync(outDir)) {
    if (new RegExp(`^${config.apkPrefix}-.*-android\\.apk$`).test(name)) {
      rmSync(join(outDir, name));
    }
  }
}

const androidDir = join(appDir, "android");
const gradlew = join(androidDir, "gradlew");
if (existsSync(gradlew)) chmodSync(gradlew, 0o755);
// Vital lint is not needed for a sideload APK and can run out of Metaspace.
run(
  "./gradlew",
  ["assembleRelease", "--no-daemon", "-x", "lint", "-x", "lintVitalAnalyzeRelease", "-x", "lintVitalRelease"],
  { cwd: androidDir, env },
);

// Check the APK itself before describing it: package, versionCode, versionName,
// and a release signature rather than the debug key.
const buildTools = findBuildTools(sdkRoot);
if (buildTools === undefined) {
  fail(`No build-tools with aapt2 and apksigner in ${sdkRoot}/build-tools. Install build-tools;36.0.0 with sdkmanager.`);
}
const badging = parseBadging(capture(join(buildTools, "aapt2"), ["dump", "badging", apk], androidDir));
if (
  badging.name !== config.packageId ||
  badging.versionCode !== String(versionCode) ||
  badging.versionName !== versionName
) {
  fail(
    `Built ${badging.name} ${badging.versionCode} ${badging.versionName} (package, versionCode, versionName); ` +
      `expected ${config.packageId} ${versionCode} ${versionName}.`,
  );
}
const certs = capture(join(buildTools, "apksigner"), ["verify", "--print-certs", apk], androidDir);
if (certs.includes("CN=Android Debug")) {
  fail("The APK is signed with the debug key. Not writing release.json.");
}

const named = join(outDir, apkFileName(config.apkPrefix, versionName));
copyFileSync(apk, named);
const sha256 = sha256File(named);
const manifest = join(outDir, "release.json");
writeFileSync(manifest, formatReleaseJson(releaseJson(versionName, versionCode, sha256)));

console.info(`Built ${named}`);
console.info(`  versionName ${versionName}, versionCode ${versionCode}`);
console.info(`  SHA-256 ${sha256}`);
if (config.summary !== undefined) {
  console.info(`  ${config.summary.label} ${env[config.summary.envVar] ?? ""}`);
}
console.info(`Wrote ${manifest}`);

if (env.GITHUB_OUTPUT !== undefined && env.GITHUB_OUTPUT !== "") {
  appendFileSync(
    env.GITHUB_OUTPUT,
    formatGithubOutput({
      apk: named,
      release_json: manifest,
      version_name: versionName,
      version_code: String(versionCode),
      sha256,
    }),
  );
}
