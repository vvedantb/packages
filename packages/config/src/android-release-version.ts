// Version pick for the shared Android APK release workflow
// (.github/workflows/release-android-apk.yml). This module owns the algorithm and
// its tests. The workflow's "Choose versionName, versionCode and tag" step
// gathers the same inputs with one `gh release list` and one release.json
// download, and implements the same rules in bash. Change both together.
//
// The workflow does not read every release.json. Published versionNames come
// from tag suffixes (`<tagPrefix><semver>`). Only the highest semver tag needs
// its release.json, because the highest versionName carries the highest
// versionCode under the normal monotonic scheme.

const SEMVER_RE = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const WHOLE_NUMBER_RE = /^[1-9][0-9]*$/;
const VERSION_CODE_FLOOR_RE = /^[1-9][0-9]{0,9}$/;

/** Where the versionName floor comes from. */
export type VersionNameSource = "default_version_name" | "app_json";

/** What the workflow knows about the published releases for a tag prefix. */
export interface PublishedReleases {
  /** Tags from `gh release list` that start with the tag prefix. */
  tags: readonly string[];
  /**
   * versionCode from the release.json of the highest semver tag. `undefined`
   * means that release has no release.json (a release from before this
   * workflow), which counts as versionCode 1.
   */
  highestVersionCode?: number | undefined;
}

/** Inputs to {@link pickAndroidReleaseVersion}. */
export interface PickAndroidReleaseVersionInput {
  /** Tag prefix, such as `"eva-v"`. */
  tagPrefix: string;
  /** `version_code_floor` input, such as `"1000"`. */
  versionCodeFloor: string;
  /** `version_name_source` input. */
  versionNameSource: VersionNameSource;
  /**
   * The versionName floor: the `DEFAULT_VERSION_NAME` literal from
   * app.config.ts (`default_version_name`) or `expo.version` from app.json
   * (`app_json`). `undefined` when app.json has none.
   */
  appVersion?: string | undefined;
  /** `version` input, empty or absent when not set. */
  inputVersion?: string | undefined;
  /** `version_code` input, empty or absent when not set. */
  inputVersionCode?: string | undefined;
  /** The pushed tag (`GITHUB_REF_NAME`) on a tag push, else absent. */
  tagPush?: string | undefined;
  /** Published releases for the tag prefix. */
  published: PublishedReleases;
}

/** The decision. */
export interface AndroidReleaseVersion {
  versionName: string;
  versionCode: number;
  /** The tag to release: the pushed tag, else `<tagPrefix><versionName>`. */
  tag: string;
  /** The tag with the highest published semver versionName, or `""`. */
  previousTag: string;
}

/** True when `value` is `X.Y.Z`. */
export function isSemver(value: string): boolean {
  return SEMVER_RE.test(value);
}

/** Compares two `X.Y.Z` versions numerically. */
export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** The semver versionNames in `<tagPrefix><semver>` tags. Other tags are ignored. */
export function publishedVersionNames(tagPrefix: string, tags: readonly string[]): string[] {
  const names: string[] = [];
  for (const tag of tags) {
    if (!tag.startsWith(tagPrefix)) continue;
    const name = tag.slice(tagPrefix.length);
    if (isSemver(name)) names.push(name);
  }
  return names;
}

/** The highest of `names`, or `undefined` when empty. */
export function highestSemver(names: readonly string[]): string | undefined {
  let highest: string | undefined;
  for (const name of names) {
    if (highest === undefined || compareSemver(name, highest) > 0) highest = name;
  }
  return highest;
}

function bumpPatch(version: string): string {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${(patch ?? 0) + 1}`;
}

/**
 * Chooses versionName, versionCode, tag and previous tag. Pure: the workflow's
 * `gh` checks that the release and tag do not exist stay in the workflow.
 * Throws with the workflow's error messages.
 */
export function pickAndroidReleaseVersion(
  input: PickAndroidReleaseVersionInput,
): AndroidReleaseVersion {
  const { tagPrefix, versionNameSource } = input;
  const inputVersion = input.inputVersion ?? "";
  const inputVersionCode = input.inputVersionCode ?? "";

  if (!VERSION_CODE_FLOOR_RE.test(input.versionCodeFloor)) {
    throw new Error("version_code_floor must be a whole number from 1.");
  }
  const floor = Number(input.versionCodeFloor);

  let tagVersion = "";
  if (input.tagPush !== undefined && input.tagPush !== "") {
    if (!input.tagPush.startsWith(tagPrefix)) {
      throw new Error(
        `Tag ${input.tagPush} does not start with ${tagPrefix}, so V Store's catalog sync would never pick it up.`,
      );
    }
    tagVersion = input.tagPush.slice(tagPrefix.length);
    if (!isSemver(tagVersion)) {
      throw new Error(
        `Tag ${input.tagPush} must be ${tagPrefix} followed by a versionName like 1.0.1.`,
      );
    }
  }

  const appVersion = input.appVersion ?? "";
  if (versionNameSource === "default_version_name" && !isSemver(appVersion)) {
    throw new Error("Could not read the DEFAULT_VERSION_NAME literal from app.config.ts.");
  }

  const names = publishedVersionNames(tagPrefix, input.published.tags);
  const highestPublished = highestSemver(names);
  const highestTag = highestPublished === undefined ? "" : `${tagPrefix}${highestPublished}`;
  const highestCode =
    highestPublished === undefined ? 0 : (input.published.highestVersionCode ?? 1);

  let versionName: string;
  if (versionNameSource === "app_json") {
    // The version input; else the tag's version; else the highest published
    // versionName with the patch bumped, or expo.version if that is higher or
    // nothing is published yet.
    if (inputVersion !== "") {
      versionName = inputVersion;
    } else if (tagVersion !== "") {
      versionName = tagVersion;
    } else {
      versionName = appVersion;
      if (highestPublished !== undefined) {
        const bumped = bumpPatch(highestPublished);
        if (!isSemver(versionName) || compareSemver(bumped, versionName) > 0) versionName = bumped;
      }
    }
    if (!isSemver(versionName)) {
      throw new Error(
        "versionName must be X.Y.Z, for example 1.0.1. Check the version input, or expo.version in app.json.",
      );
    }
  } else if (inputVersion !== "") {
    versionName = inputVersion;
    if (!isSemver(versionName)) throw new Error("version must look like 1.0.1.");
  } else if (tagVersion !== "") {
    versionName = tagVersion;
  } else {
    versionName = bumpPatch(highestSemver([appVersion, ...names]) ?? appVersion);
  }

  if (tagVersion !== "" && versionName !== tagVersion) {
    throw new Error(
      `The version input (${versionName}) does not match the tag ${input.tagPush ?? ""}.`,
    );
  }
  if (versionNameSource === "app_json" && highestPublished !== undefined) {
    if (names.includes(versionName)) {
      throw new Error(`versionName ${versionName} is already published in ${tagPrefix}${versionName}.`);
    }
    if (compareSemver(versionName, highestPublished) <= 0) {
      throw new Error(
        `versionName ${versionName} must be higher than ${highestPublished}, the highest published release.json.`,
      );
    }
  }

  // Sideload versionCodes start at the floor. The version_code input can only
  // raise that minimum.
  const minCode = Math.max(highestCode + 1, floor);
  const codeText = inputVersionCode === "" ? String(minCode) : inputVersionCode;
  if (!WHOLE_NUMBER_RE.test(codeText) || Number(codeText) < minCode) {
    throw new Error(
      `version_code '${codeText}' must be a whole number of at least ${minCode} (above ${highestCode}, the highest published release.json, and at least version_code_floor ${floor}).`,
    );
  }

  const tag = tagVersion !== "" ? (input.tagPush ?? "") : `${tagPrefix}${versionName}`;
  return { versionName, versionCode: Number(codeText), tag, previousTag: highestTag };
}
