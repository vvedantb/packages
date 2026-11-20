import { useEffect, useRef, useState, type ReactNode } from "react";
import { Linking } from "react-native";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./AlertDialog";
import {
  fetchGitHubUpdate,
  fetchVStoreUpdate,
  type AvailableUpdate,
  type GitHubReleaseSource,
  type VStoreSource,
} from "./updateCheck";

/** Opens the Updates tab of V Store, the Project V Android app store. */
export const V_STORE_UPDATES_URL = "vstore://updates";

type UpdateText = ReactNode | ((update: AvailableUpdate) => ReactNode);

export type UpdatePromptProps = {
  /** The update to offer. The prompt is open while this is set. */
  update: AvailableUpdate | null;
  /** The app's display name, used in the default description. */
  appName: string;
  /** Default "Update available". */
  title?: ReactNode;
  /** Default "`<appName> <version>` is ready to install.". A function receives the update. */
  description?: UpdateText;
  /** Default "Later". */
  laterLabel?: ReactNode;
  /** Default "Download". */
  downloadLabel?: ReactNode;
  /** Default "Install from V Store". */
  vStoreLabel?: ReactNode;
  /** Shown once V Store could not be opened. Default "V Store is not installed on this device.". */
  vStoreMissingText?: ReactNode;
  /** Show Download, which opens `update.url` (the APK or its release page). Default `true`. */
  showDownload?: boolean;
  /** Show "Install from V Store", which only opens V Store. Default `true`. */
  showVStore?: boolean;
  /**
   * The link that opens V Store. Default `V_STORE_UPDATES_URL`, its Updates
   * tab. Pass the app's own page there when the app knows its link.
   */
  vStoreUrl?: string;
  /** Later, Android back and the VoiceOver escape. */
  onLater?: (update: AvailableUpdate) => void;
  /** After Download opened `update.url`. Close the prompt here. */
  onDownload?: (update: AvailableUpdate) => void;
  /** After V Store opened. Close the prompt here. */
  onOpenVStore?: (update: AvailableUpdate) => void;
  /** V Store could not be opened (not installed). The prompt stays open, without the V Store button. */
  onVStoreMissing?: (update: AvailableUpdate) => void;
  /** Opens a link. Default `Linking.openURL`, which rejects when no app handles it. */
  openUrl?: (url: string) => Promise<unknown>;
  /** The buttons get `<testID>-later`, `-download` and `-vstore`; the notice `-vstore-missing`. */
  testID?: string;
};

/**
 * "Update available" with up to three actions: Later, Install from V Store
 * and Download. Download opens the update's link in the browser, which
 * downloads the APK for install. "Install from V Store" only opens V Store
 * (`vStoreUrl`); it downloads and installs nothing itself.
 *
 * V Store not installed: the link fails to open, so the V Store button goes,
 * a notice says so, and the prompt stays open with Download (when shown) and
 * Later. Nothing is downloaded unless the user presses Download. The button is
 * not hidden up front: Android 11+ only reports another app's link as
 * openable to an app that declares it in its manifest `<queries>`.
 *
 * Controlled: it is open while `update` is set. `UpdateChecker` runs the
 * check and holds that state. It adds no motion of its own; the dialog's
 * follows Reduce Motion.
 */
export function UpdatePrompt({
  update,
  appName,
  title = "Update available",
  description,
  laterLabel = "Later",
  downloadLabel = "Download",
  vStoreLabel = "Install from V Store",
  vStoreMissingText = "V Store is not installed on this device.",
  showDownload = true,
  showVStore = true,
  vStoreUrl = V_STORE_UPDATES_URL,
  onLater,
  onDownload,
  onOpenVStore,
  onVStoreMissing,
  openUrl = Linking.openURL,
  testID,
}: UpdatePromptProps) {
  // The version V Store failed to open for, so the next version asks afresh.
  const [missingFor, setMissingFor] = useState<string | null>(null);
  // The last update, so the text stays while the dialog closes.
  const [shown, setShown] = useState(update);
  if (update && update !== shown) setShown(update);

  const vStoreMissing = shown !== null && missingFor === shown.version;
  const body =
    shown === null
      ? null
      : typeof description === "function"
        ? description(shown)
        : (description ?? `${appName} ${shown.version} is ready to install.`);

  return (
    <AlertDialog
      open={update !== null}
      onOpenChange={(next) => {
        if (!next && update) onLater?.(update);
      }}
    >
      <AlertDialogContent testID={testID}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {body != null ? <AlertDialogDescription>{body}</AlertDialogDescription> : null}
          {showVStore && vStoreMissing ? (
            <AlertDialogDescription
              testID={testID ? `${testID}-vstore-missing` : undefined}
              accessibilityLiveRegion="polite"
            >
              {vStoreMissingText}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Closes the dialog, and so calls `onLater`. */}
          <AlertDialogCancel size="lg" testID={testID ? `${testID}-later` : undefined}>
            {laterLabel}
          </AlertDialogCancel>
          {showVStore && !vStoreMissing ? (
            <AlertDialogAction
              size="lg"
              variant={showDownload ? "secondary" : "default"}
              testID={testID ? `${testID}-vstore` : undefined}
              onPress={() => {
                if (!update) return;
                openUrl(vStoreUrl).then(
                  () => onOpenVStore?.(update),
                  () => {
                    setMissingFor(update.version);
                    onVStoreMissing?.(update);
                  },
                );
              }}
            >
              {vStoreLabel}
            </AlertDialogAction>
          ) : null}
          {showDownload ? (
            <AlertDialogAction
              size="lg"
              testID={testID ? `${testID}-download` : undefined}
              onPress={() => {
                if (!update) return;
                // A link that does not open leaves nothing to do here.
                openUrl(update.url).catch(() => undefined);
                onDownload?.(update);
              }}
            >
              {downloadLabel}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Where "Later" is remembered, for example `expo-secure-store` or AsyncStorage. */
export type UpdateDismissStorage = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<unknown> | unknown;
};

/** The version Later hid. An unreadable store means nothing was dismissed. */
async function readDismissed(storage: UpdateDismissStorage, key: string): Promise<string | null> {
  try {
    return await storage.getItem(key);
  } catch {
    return null;
  }
}

export type UpdateCheckerProps = Omit<
  UpdatePromptProps,
  "update" | "onLater" | "onDownload" | "onOpenVStore"
> & {
  /**
   * The installed version, "1.2.3". `null` or `undefined` skips the check, for
   * a local or preview build that has no release to compare with.
   */
  currentVersion: string | null | undefined;
  /** GitHub releases to read: the repository and the tag prefix before the version. Public repositories only. */
  source?: GitHubReleaseSource;
  /**
   * Ask V Store for the newest version, used instead of `source`. It works
   * for a private repository too. Without `vStore.downloadUrl`, Download is
   * hidden unless `showDownload` says otherwise.
   */
  vStore?: VStoreSource;
  /** Your own check, used instead of `source` and `vStore`. Returns the update to offer, or null. */
  check?: (currentVersion: string) => Promise<AvailableUpdate | null>;
  /** `false` skips the check. Default `true`. */
  enabled?: boolean;
  /**
   * Remembers the version "Later" hid, so it is not offered again until a
   * newer one is out. Without it, Later hides the prompt until the next start.
   */
  storage?: UpdateDismissStorage;
  /** Key in `storage`. Default `"updateDismissed"`. */
  storageKey?: string;
  onLater?: (update: AvailableUpdate) => void;
  onDownload?: (update: AvailableUpdate) => void;
  onOpenVStore?: (update: AvailableUpdate) => void;
};

/**
 * Looks for a newer version once when it mounts and offers it in an
 * `UpdatePrompt`. Mount it once, near the app root.
 *
 * - The check reads the GitHub releases of `source`, asks V Store (`vStore`),
 *   or calls `check`.
 *   Offline, rate limited, a failed check or no `currentVersion`: nothing is
 *   offered, and nothing is shown.
 * - Later (and Android back) hides that version until a newer one is out,
 *   when `storage` is given.
 * - Download and "Install from V Store" close the prompt for this run only,
 *   so it asks again at the next start if the update was not installed.
 */
export function UpdateChecker({
  currentVersion,
  source,
  vStore,
  check,
  enabled = true,
  storage,
  storageKey = "updateDismissed",
  onLater,
  onDownload,
  onOpenVStore,
  ...prompt
}: UpdateCheckerProps) {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  // The latest callbacks, so a new function each render does not check again.
  const latest = useRef({ check, vStore, storage, storageKey });
  useEffect(() => {
    latest.current = { check, vStore, storage, storageKey };
  });

  const repo = source?.repo;
  const tagPrefix = source?.tagPrefix;
  const hasCheck = check !== undefined;
  const vStorePackage = vStore?.packageName;
  const vStoreSite = vStore?.siteUrl;
  // Without a download link, the update's link is the one that opens V Store.
  const vStoreUrl = prompt.vStoreUrl ?? V_STORE_UPDATES_URL;
  useEffect(() => {
    if (!enabled || !currentVersion) return;
    let cancelled = false;
    const run = async () => {
      const { check: custom, vStore: vStoreSource, storage: store, storageKey: key } = latest.current;
      const found = custom
        ? await custom(currentVersion)
        : vStoreSource
          ? await fetchVStoreUpdate(vStoreSource, currentVersion, vStoreUrl)
          : repo !== undefined && tagPrefix !== undefined
          ? await fetchGitHubUpdate({ repo, tagPrefix }, currentVersion)
          : null;
      if (!found) return;
      const dismissed = store ? await readDismissed(store, key) : null;
      if (!cancelled && dismissed !== found.version) setUpdate(found);
    };
    // A failed check must never get in the way of the app.
    run().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, currentVersion, repo, tagPrefix, hasCheck, vStorePackage, vStoreSite, vStoreUrl]);

  return (
    <UpdatePrompt
      {...prompt}
      showDownload={prompt.showDownload ?? !(vStore !== undefined && vStore.downloadUrl === undefined)}
      update={update}
      onLater={(current) => {
        setUpdate(null);
        const { storage: store, storageKey: key } = latest.current;
        if (store) {
          // A failed write only means the prompt returns at the next start.
          Promise.resolve()
            .then(() => store.setItem(key, current.version))
            .catch(() => undefined);
        }
        onLater?.(current);
      }}
      onDownload={(current) => {
        setUpdate(null);
        onDownload?.(current);
      }}
      onOpenVStore={(current) => {
        setUpdate(null);
        onOpenVStore?.(current);
      }}
    />
  );
}
