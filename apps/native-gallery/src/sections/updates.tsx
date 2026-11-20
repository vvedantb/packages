// The update prompt in each of its shapes, and the checker that feeds it.
// Links go to a recorder here, not the system, so a press opens nothing
// outside the gallery; "Real links" is the one case that uses the device.
import { useState } from "react";
import {
  Button,
  UpdateChecker,
  UpdatePrompt,
  V_STORE_UPDATES_URL,
  type AvailableUpdate,
  type UpdatePromptProps,
} from "@vvedantb/native-ui";
import { Block, GText, LONG_TEXT } from "../ui";

const UPDATE: AvailableUpdate = {
  version: "1.4.0",
  url: "https://example.com/notes-1.4.0.apk",
};

type CaseId = "both" | "missing" | "vstore-only" | "download-only" | "long" | "real";

// The prompt remembers a failed V Store link per version, so the missing case
// offers its own version and leaves the other cases with the button.
const MISSING_UPDATE: AvailableUpdate = { ...UPDATE, version: "1.4.1" };

const CASES: { id: CaseId; label: string; props?: Partial<UpdatePromptProps> }[] = [
  { id: "both", label: "Update available: Download and V Store" },
  { id: "missing", label: "V Store missing" },
  { id: "vstore-only", label: "V Store only", props: { showDownload: false } },
  { id: "download-only", label: "Download only", props: { showVStore: false } },
  {
    id: "long",
    label: "Long text",
    props: {
      title: `Update available. ${LONG_TEXT}`,
      description: `${LONG_TEXT}. ${LONG_TEXT}.`,
      laterLabel: "Not now, remind me the next time a newer version is out",
      downloadLabel: "Download the new version in the browser",
      vStoreLabel: "Install the new version from V Store",
    },
  },
  { id: "real", label: "Real links (opens V Store or the browser)" },
];

/** In-memory "Later" store, so the checker's dismiss rule can be seen without a native module. */
const dismissed = new Map<string, string>();
const memoryStorage = {
  getItem: (key: string) => dismissed.get(key) ?? null,
  setItem: (key: string, value: string) => void dismissed.set(key, value),
};

export function UpdatesSection() {
  const [open, setOpen] = useState<CaseId | null>(null);
  const [result, setResult] = useState("Nothing pressed yet");
  // Remounts the checker, as a new app start does.
  const [run, setRun] = useState(0);
  const [found, setFound] = useState<"none" | "newer" | "vstore" | null>(null);

  const current = CASES.find((item) => item.id === open);
  const recordLink = (url: string) => {
    if (open === "missing" && url === V_STORE_UPDATES_URL) {
      return Promise.reject(new Error("No app opens this link"));
    }
    setResult(`Opened ${url}`);
    return Promise.resolve();
  };

  return (
    <>
      <Block title="UpdatePrompt" id="update-prompt">
        <GText testID="update-result">{result}</GText>
        {CASES.map((item) => (
          <Button key={item.id} testID={`update-open-${item.id}`} variant="outline" onPress={() => setOpen(item.id)}>
            {item.label}
          </Button>
        ))}
        <UpdatePrompt
          testID="update"
          appName="Notes"
          update={open === null ? null : open === "missing" ? MISSING_UPDATE : UPDATE}
          openUrl={open === "real" ? undefined : recordLink}
          onLater={() => {
            setOpen(null);
            setResult("Later");
          }}
          onDownload={() => setOpen(null)}
          onOpenVStore={() => setOpen(null)}
          onVStoreMissing={() => setResult("V Store is missing")}
          {...current?.props}
        />
      </Block>

      <Block title="UpdateChecker" id="update-checker">
        <GText>
          Each button starts the check again, as a new app start does. Later is remembered here, so the same version is
          not offered twice.
        </GText>
        <GText testID="checker-result">
          {found === null
            ? "Not checked yet"
            : found === "none"
              ? "No update: nothing is shown"
              : found === "vstore"
                ? "Asked V Store: a prompt without Download when it answers"
                : "Update found"}
        </GText>
        <Button
          testID="checker-none"
          variant="outline"
          onPress={() => {
            setFound("none");
            setRun((value) => value + 1);
          }}
        >
          Check: no update
        </Button>
        <Button
          testID="checker-newer"
          variant="outline"
          onPress={() => {
            setFound("newer");
            setRun((value) => value + 1);
          }}
        >
          Check: update available
        </Button>
        <Button
          testID="checker-forget"
          variant="ghost"
          onPress={() => {
            dismissed.clear();
            setResult("Later forgotten");
          }}
        >
          Forget Later
        </Button>
        <Button
          testID="checker-vstore"
          variant="outline"
          onPress={() => {
            setFound("vstore");
            setRun((value) => value + 1);
          }}
        >
          Check: ask V Store (real request)
        </Button>
        {found === "vstore" ? (
          // The gallery is in V Store's catalogue. "0.0.1" is older than any release, so an answer always offers one.
          <UpdateChecker
            key={run}
            testID="checker"
            appName="native-ui gallery"
            currentVersion="0.0.1"
            vStore={{ packageName: "dev.vvedantb.nativegallery" }}
            openUrl={recordLink}
            onLater={() => setResult("Checker: Later")}
          />
        ) : found === null ? null : (
          <UpdateChecker
            key={run}
            testID="checker"
            appName="Notes"
            currentVersion="1.3.2"
            check={() => Promise.resolve(found === "newer" ? UPDATE : null)}
            storage={memoryStorage}
            openUrl={recordLink}
            onLater={() => setResult("Checker: Later")}
          />
        )}
      </Block>
    </>
  );
}
