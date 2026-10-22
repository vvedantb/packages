import type { ArtifactStateMap } from "./stateOps.js";

// The guest's localStorage and sessionStorage shims keep their keys in the
// artifact state under these prefixes, beside the `artifactState` keys.
export const ARTIFACT_LOCAL_STORAGE_PREFIX = "ls:";
export const ARTIFACT_SESSION_STORAGE_PREFIX = "ss:";

export function prefixedStorageKey(prefix: string, key: string): string {
  return `${prefix}${key}`;
}

export function unprefixStorageKey(prefix: string, prefixed: string): string | undefined {
  if (!prefixed.startsWith(prefix)) return undefined;
  return prefixed.slice(prefix.length);
}

/** The keys under `prefix`, with the prefix removed. */
export function storageView(data: ArtifactStateMap, prefix: string): ArtifactStateMap {
  const view: ArtifactStateMap = {};
  for (const [key, value] of Object.entries(data)) {
    const rest = unprefixStorageKey(prefix, key);
    if (rest === undefined || rest.length === 0) continue;
    view[rest] = value;
  }
  return view;
}

/** `data` without the keys under `prefix`. */
export function clearPrefixedKeys(data: ArtifactStateMap, prefix: string): ArtifactStateMap {
  const next: ArtifactStateMap = {};
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith(prefix)) next[key] = value;
  }
  return next;
}
