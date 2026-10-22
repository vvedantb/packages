import {
  ARTIFACT_STATE_MAX_KEY_LENGTH,
  ARTIFACT_STATE_MAX_KEYS,
  ARTIFACT_STATE_MAX_TOTAL_BYTES,
  ARTIFACT_STATE_MAX_VALUE_BYTES,
  utf8ByteLength,
} from "./limits.js";

/** Per user, per artifact state: string keys to string values (the guest JSON-encodes values). */
export type ArtifactStateMap = Record<string, string>;

export type ArtifactStateOp =
  | { op: "get"; key: string }
  | { op: "set"; key: string; value: string }
  | { op: "getAll" }
  | { op: "remove"; key: string }
  | { op: "reset" };

export type ArtifactStateOpResult = {
  data: ArtifactStateMap;
  value: string | ArtifactStateMap | null;
  error?: string;
};

export type ArtifactStatePatch = {
  sets?: ArtifactStateMap;
  removes?: string[];
  reset?: boolean;
};

function requireKey(key: string): string | undefined {
  const trimmed = key.trim();
  if (trimmed.length === 0) return "State key is required.";
  if (trimmed.length > ARTIFACT_STATE_MAX_KEY_LENGTH) return "State key is too long.";
  return undefined;
}

/** The first limit `data` breaks (keys, key length, value size, total size), or `undefined`. */
export function validateArtifactStateMap(data: ArtifactStateMap): string | undefined {
  const keys = Object.keys(data);
  if (keys.length > ARTIFACT_STATE_MAX_KEYS) {
    return `State can have at most ${String(ARTIFACT_STATE_MAX_KEYS)} keys.`;
  }
  let total = 0;
  for (const key of keys) {
    const keyError = requireKey(key);
    if (keyError) return keyError;
    const value = data[key];
    if (value === undefined) continue;
    const size = utf8ByteLength(value);
    if (size > ARTIFACT_STATE_MAX_VALUE_BYTES) return `State value for "${key}" exceeds 16 KiB.`;
    total += utf8ByteLength(key) + size;
  }
  if (total > ARTIFACT_STATE_MAX_TOTAL_BYTES) return "State exceeds 64 KiB.";
  return undefined;
}

/** Apply one guest op. On an error, `data` is `current` unchanged. */
export function applyArtifactStateOp(current: ArtifactStateMap, message: ArtifactStateOp): ArtifactStateOpResult {
  if (message.op === "getAll") return { data: current, value: { ...current } };
  if (message.op === "reset") return { data: {}, value: null };
  const keyError = requireKey(message.key);
  if (keyError) return { data: current, value: null, error: keyError };
  const key = message.key.trim();
  if (message.op === "get") {
    const value = current[key];
    return { data: current, value: value === undefined ? null : value };
  }
  if (message.op === "remove") {
    const next = { ...current };
    delete next[key];
    return { data: next, value: null };
  }
  const next = { ...current, [key]: message.value };
  const quotaError = validateArtifactStateMap(next);
  if (quotaError) return { data: current, value: null, error: quotaError };
  return { data: next, value: null };
}

/** Apply a batched write (reset, then sets, then removes) all or nothing. */
export function applyArtifactStatePatch(current: ArtifactStateMap, patch: ArtifactStatePatch): ArtifactStateOpResult {
  let data: ArtifactStateMap = patch.reset ? {} : { ...current };
  for (const [key, value] of Object.entries(patch.sets ?? {})) {
    const result = applyArtifactStateOp(data, { op: "set", key, value });
    if (result.error) return { ...result, data: current };
    data = result.data;
  }
  for (const key of patch.removes ?? []) {
    const result = applyArtifactStateOp(data, { op: "remove", key });
    if (result.error) return { ...result, data: current };
    data = result.data;
  }
  const quotaError = validateArtifactStateMap(data);
  if (quotaError) return { data: current, value: null, error: quotaError };
  return { data, value: null };
}

/** The op in a guest `artifact:state` message, or `undefined` when it is malformed. */
export function parseArtifactStateOp(data: { op?: string; key?: string; value?: string }): ArtifactStateOp | undefined {
  if (data.op === "getAll") return { op: "getAll" };
  if (data.op === "reset") return { op: "reset" };
  if (data.op === "get" && typeof data.key === "string") return { op: "get", key: data.key };
  if (data.op === "remove" && typeof data.key === "string") return { op: "remove", key: data.key };
  if (data.op === "set" && typeof data.key === "string" && typeof data.value === "string") {
    return { op: "set", key: data.key, value: data.value };
  }
  return undefined;
}
