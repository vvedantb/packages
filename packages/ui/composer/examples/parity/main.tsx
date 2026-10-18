import { useState } from "react";
import { LazyMotion, domAnimation } from "motion/react";
import { createRoot } from "react-dom/client";
import { TooltipProvider } from "../../../src/ui/tooltip";
import { Queue, QueueHeader, QueueList } from "../../../src/ai-elements/queue";
import {
  ConnectionStatusMenuItem,
  InputArea,
  InputBanners,
  buildComposerSlashItems,
} from "../../../src/composer";
import { DropdownMenuSeparator } from "../../../src/ui/dropdown-menu";
import { OriginalInputArea } from "./original/OriginalInputArea";
import { APP_STYLES, BrandMarkMock, CONNECTION_TITLE, SkillPickerMock } from "./shared";
import "./styles.css";

type State = {
  value: string;
  isStreaming?: boolean;
};

const STATES: Record<string, State> = {
  empty: { value: "" },
  typing: { value: "Please draft a summary of the meeting notes.\nInclude the action list." },
  slash: { value: "/" },
  plus: { value: "" },
  streaming: { value: "Next question" },
  compact: { value: "Short draft" },
};

const params = new URLSearchParams(window.location.search);
const stateName = params.get("state") ?? "empty";
const state = STATES[stateName] ?? STATES.empty!;
document.documentElement.classList.toggle("dark", params.get("theme") === "dark");

const bannerFeatures = { privacy: false };
const actionFeatures = { dictate: true };

function ExtractedColumn() {
  const [value, setValue] = useState(state.value);
  const [queueOpen, setQueueOpen] = useState(true);
  const slashItems = buildComposerSlashItems({
    actionFeatures,
    bannerFeatures,
    showFileUpload: true,
    includeNewChat: true,
    hubSkills: [],
    manualSkills: [],
    selectedManualIds: [],
  });
  return (
    <InputArea
      value={value}
      onChange={setValue}
      placeholder="Ask anything..."
      isStreaming={state.isStreaming ?? stateName === "streaming"}
      showDictate
      showFileUpload
      onFilesSelected={() => {}}
      slashItems={slashItems}
      className={APP_STYLES.composer}
      borderClassName={APP_STYLES.border}
      submitButtonClassName={APP_STYLES.submitBg}
      submitIconClassName={APP_STYLES.submitText}
      banners={<InputBanners features={bannerFeatures} styles={APP_STYLES.banner} />}
      queue={
        <Queue count={0} className="w-full">
          <QueueHeader count={0} isOpen={queueOpen} onToggle={() => setQueueOpen(!queueOpen)} />
          <QueueList open={queueOpen}>{null}</QueueList>
        </Queue>
      }
      plusMenuExtra={
        <>
          <SkillPickerMock />
          <DropdownMenuSeparator />
          <ConnectionStatusMenuItem
            icon={<BrandMarkMock />}
            label="Connections"
            description="12 tools"
            connected
            title={CONNECTION_TITLE}
          />
        </>
      }
    />
  );
}

// `?col=original|extracted` renders one column alone, so overlays (plus menu, slash menu)
// collide with the viewport the same way for both. Without it, both columns show side by side.
const only = params.get("col");

function Page() {
  return (
    <LazyMotion features={domAnimation}>
    <TooltipProvider>
      <div className={"bg-background text-foreground " + (only ? "" : "grid grid-cols-2")} style={{ width: only ? 640 : 1280 }}>
        {only !== "extracted" ? <div data-col="original" className="flex h-[520px] flex-col justify-end p-4" style={{ width: 640 }}>
          <OriginalInputArea
            actionFeatures={actionFeatures}
            bannerFeatures={bannerFeatures}
            initialValue={state.value}
            placeholder="Ask anything..."
            showBanners
            showUpgradeBanner={false}
            showFileUpload
            isStreaming={stateName === "streaming"}
            isSending={false}
            isUploading={false}
            fileCount={0}
            chipCount={0}
          />
        </div> : null}
        {only !== "original" ? <div data-col="extracted" className="flex h-[520px] flex-col justify-end p-4" style={{ width: 640 }}>
          <ExtractedColumn />
        </div> : null}
      </div>
    </TooltipProvider>
    </LazyMotion>
  );
}

createRoot(document.getElementById("root")!).render(<Page />);
