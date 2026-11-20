// The update check behind `UpdateChecker`: for an app that ships its Android
// APK as GitHub releases tagged `<tagPrefix><version>`, with no store and no
// over-the-air updates. Plain functions, no React and no native module.

/** A newer version to offer. `url` is what Download opens: the APK itself, else its release page. */
export type AvailableUpdate = { version: string; url: string };

/** The fields of a GitHub release the check reads (`GET /repos/{owner}/{repo}/releases`). */
export type GitHubRelease = {
  tag_name: string;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  assets: { name: string; browser_download_url: string }[];
};

export type GitHubReleaseSource = {
  /** `"owner/name"` of a public repository. */
  repo: string;
  /** Tag prefix before the version, for example `"myapp-apk-"` for the tag `myapp-apk-1.2.3`. */
  tagPrefix: string;
};

type VersionParts = [number, number, number];

/** `[major, minor, patch]` of "1.2.3", or null. */
function parseVersion(version: string): VersionParts | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Positive when `a` is newer than `b`. */
function compareParts(a: VersionParts, b: VersionParts): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/** True when `candidate` ("1.2.3") is newer than `current`. False when either is not `major.minor.patch`. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  return a !== null && b !== null && compareParts(a, b) > 0;
}

function isRelease(value: unknown): value is GitHubRelease {
  if (!value || typeof value !== "object") return false;
  const release = value as Record<string, unknown>;
  return (
    typeof release.tag_name === "string" &&
    typeof release.html_url === "string" &&
    typeof release.draft === "boolean" &&
    typeof release.prerelease === "boolean" &&
    Array.isArray(release.assets) &&
    release.assets.every((asset: unknown) => {
      if (!asset || typeof asset !== "object") return false;
      const item = asset as Record<string, unknown>;
      return typeof item.name === "string" && typeof item.browser_download_url === "string";
    })
  );
}

/**
 * The newest published release tagged `<tagPrefix><version>` that is newer
 * than `currentVersion`, or null. Drafts, prereleases, other tags and versions
 * that are not `major.minor.patch` are skipped. The download is the release's
 * first `.apk` asset, else its release page.
 */
export function newerGitHubRelease(
  releases: readonly GitHubRelease[],
  currentVersion: string,
  tagPrefix: string,
): AvailableUpdate | null {
  const installed = parseVersion(currentVersion);
  if (!installed) return null;
  let best: { parts: VersionParts; update: AvailableUpdate } | null = null;
  for (const release of releases) {
    if (release.draft || release.prerelease || !release.tag_name.startsWith(tagPrefix)) continue;
    const version = release.tag_name.slice(tagPrefix.length);
    const parts = parseVersion(version);
    if (!parts || compareParts(parts, installed) <= 0) continue;
    if (best && compareParts(parts, best.parts) <= 0) continue;
    const apk = release.assets.find((asset) => asset.name.endsWith(".apk"));
    best = { parts, update: { version, url: apk?.browser_download_url ?? release.html_url } };
  }
  return best?.update ?? null;
}

/**
 * Reads the repository's 30 latest releases from the public GitHub API and
 * returns the newer one, or null. Null too when the request fails, is rate
 * limited, or the answer has another shape. A network error rejects.
 */
export async function fetchGitHubUpdate(
  source: GitHubReleaseSource,
  currentVersion: string,
): Promise<AvailableUpdate | null> {
  const response = await fetch(`https://api.github.com/repos/${source.repo}/releases?per_page=30`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isRelease)) return null;
  return newerGitHubRelease(body, currentVersion, source.tagPrefix);
}

/**
 * The HTTP host of V Store, the Project V Android app store. Its
 * `GET /latest-version?package=<Android package>` answers
 * `{ packageName, versionName }` for an app in its catalogue.
 */
export const V_STORE_SITE_URL = "https://blessed-porcupine-303.eu-west-1.convex.site";

export type VStoreSource = {
  /** The app's Android package, as V Store lists it. */
  packageName: string;
  /**
   * What Download opens for a version: the APK, or its release page. Leave it
   * out when the APK has no public link (a private repository). Download is
   * then hidden, and "Install from V Store" is the one way to update.
   */
  downloadUrl?: (version: string) => string;
  /** Default `V_STORE_SITE_URL`. */
  siteUrl?: string;
};

/**
 * Asks V Store for the app's newest version and returns it when it is newer
 * than `currentVersion`, else null. V Store knows the releases of private
 * repositories too, so this works where `fetchGitHubUpdate` cannot. Null too
 * when the app is not in the catalogue, the request fails, or the answer has
 * another shape. A network error rejects. Without `downloadUrl`, `url` is
 * `fallbackUrl`.
 */
export async function fetchVStoreUpdate(
  source: VStoreSource,
  currentVersion: string,
  fallbackUrl: string,
): Promise<AvailableUpdate | null> {
  const site = source.siteUrl ?? V_STORE_SITE_URL;
  const response = await fetch(`${site}/latest-version?package=${encodeURIComponent(source.packageName)}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  if (!body || typeof body !== "object") return null;
  const version = (body as Record<string, unknown>).versionName;
  if (typeof version !== "string" || !isNewerVersion(version, currentVersion)) return null;
  return { version, url: source.downloadUrl?.(version) ?? fallbackUrl };
}
