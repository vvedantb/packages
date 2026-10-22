"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { z } from "zod";
import {
  ARTIFACT_PORT_TYPE,
  ARTIFACT_READY_TYPE,
  ARTIFACT_STATE_DEBOUNCE_MS,
  ARTIFACT_STATE_MAX_WAIT_MS,
  ARTIFACT_STATE_RESULT_TYPE,
  ARTIFACT_STATE_TYPE,
  applyArtifactStateOp,
  createTrailingMaxDebounce,
  parseArtifactStateOp,
  wrapArtifactDocument,
  type ArtifactFormat,
  type ArtifactStateMap,
  type ArtifactTemplateName,
} from "@vvedantb/server";
import { cn } from "../utils/cn";

/**
 * Where one user's state for one artifact lives. `load` runs once per
 * document; `save` gets the whole map (replace, not merge) after the debounce
 * and on `pagehide` or unmount. Keep the object stable for an artifact: a new
 * store reloads the frame.
 */
export type ArtifactStateStore = {
  load(): Promise<ArtifactStateMap>;
  save(data: ArtifactStateMap): Promise<void>;
  /** A failed load or save. After a failed load the frame starts empty and never saves, so it cannot overwrite the stored state. */
  onError?(error: Error, phase: "load" | "save"): void;
};

export type ArtifactFrameProps = Omit<ComponentProps<"iframe">, "src" | "srcDoc" | "sandbox" | "title" | "ref"> & {
  body: string;
  format: ArtifactFormat;
  /** The iframe's accessible name, and the heading of a built-in template when the body has none. */
  title: string;
  /** From `stateSpec.template`. */
  template?: ArtifactTemplateName;
  /** Without a store the state starts empty and lives until the frame unmounts. */
  store?: ArtifactStateStore;
  /** Extra globals for the guest state API, e.g. `["app"]` for `window.app.state`. */
  stateGlobalAliases?: readonly string[];
  /** Save this long after the last change. Default `ARTIFACT_STATE_DEBOUNCE_MS` (5 s). */
  saveDelayMs?: number;
  /** Save at least this often while changes keep coming. Default `ARTIFACT_STATE_MAX_WAIT_MS` (30 s). */
  saveMaxWaitMs?: number;
};

function toError(reason: Error | string | object | null | undefined): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}

// The save in flight for each store, so a reload (another version, say) reads after it.
const savesInFlight = new WeakMap<ArtifactStateStore, Promise<void>>();

/**
 * Renders an artifact in an iframe with `sandbox="allow-scripts"` (never
 * `allow-same-origin`) and the CSP from `wrapArtifactDocument`, and answers
 * the guest's `window.artifactState` calls over a MessageChannel. State
 * comes from `store.load()` before the document is written, so the guest
 * starts with its snapshot; changes are saved through `store.save()`.
 */
export function ArtifactFrame({
  body,
  format,
  title,
  template,
  store,
  stateGlobalAliases,
  saveDelayMs = ARTIFACT_STATE_DEBOUNCE_MS,
  saveMaxWaitMs = ARTIFACT_STATE_MAX_WAIT_MS,
  className,
  ...props
}: ArtifactFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // A string, so a new array with the same names does not reload the frame.
  const aliasKey = (stateGlobalAliases ?? []).join(",");

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const readyMessage = z.object({ type: z.literal(ARTIFACT_READY_TYPE) });
    const stateMessage = z.object({
      type: z.literal(ARTIFACT_STATE_TYPE),
      requestId: z.number(),
      op: z.string(),
      key: z.string().optional(),
      value: z.string().optional(),
    });
    let cancelled = false;
    let canSave = store !== undefined;
    let data: ArtifactStateMap = {};
    let port: MessagePort | undefined;

    const persist = createTrailingMaxDebounce(
      () => {
        if (!store || !canSave) return;
        savesInFlight.set(
          store,
          store.save(data).catch((reason) => store.onError?.(toError(reason), "save")),
        );
      },
      saveDelayMs,
      saveMaxWaitMs,
    );

    const answer = (event: MessageEvent) => {
      const parsed = stateMessage.safeParse(event.data);
      if (!parsed.success) return;
      const { requestId } = parsed.data;
      const op = parseArtifactStateOp(parsed.data);
      const result = op ? applyArtifactStateOp(data, op) : { data, value: null, error: "Malformed state request." };
      if (op && !result.error) {
        data = result.data;
        if (op.op === "set" || op.op === "remove" || op.op === "reset") persist.schedule();
      }
      port?.postMessage({
        type: ARTIFACT_STATE_RESULT_TYPE,
        requestId,
        ok: !result.error,
        value: result.value,
        error: result.error,
      });
    };

    const onWindowMessage = (event: MessageEvent) => {
      const guest = iframe.contentWindow;
      if (!guest || event.source !== guest || !readyMessage.safeParse(event.data).success) return;
      // A new document (or a reload of this one) gets a fresh channel.
      port?.close();
      const channel = new MessageChannel();
      port = channel.port1;
      port.onmessage = answer;
      guest.postMessage({ type: ARTIFACT_PORT_TYPE }, "*", [channel.port2]);
    };

    const write = (snapshot: ArtifactStateMap) => {
      iframe.srcdoc = wrapArtifactDocument(body, format, snapshot, {
        title,
        template,
        stateGlobalAliases: aliasKey === "" ? [] : aliasKey.split(","),
      });
    };

    const flush = () => persist.flushNow();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("message", onWindowMessage);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);

    if (store) {
      (savesInFlight.get(store) ?? Promise.resolve()).then(() => store.load()).then(
        (loaded) => {
          if (cancelled) return;
          data = loaded;
          write(loaded);
        },
        (reason) => {
          if (cancelled) return;
          canSave = false;
          store.onError?.(toError(reason), "load");
          write({});
        },
      );
    } else {
      write({});
    }

    return () => {
      cancelled = true;
      persist.flushNow();
      persist.cancel();
      window.removeEventListener("message", onWindowMessage);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      port?.close();
    };
  }, [body, format, title, template, store, aliasKey, saveDelayMs, saveMaxWaitMs]);

  return (
    <iframe
      {...props}
      ref={iframeRef}
      title={title}
      sandbox="allow-scripts"
      className={cn("block border-0 bg-white", className)}
    />
  );
}
