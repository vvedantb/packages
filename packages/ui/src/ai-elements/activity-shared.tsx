import type { ComponentType } from "react";
import {
  IconFileSearch,
  IconPencil,
  IconFilePlus,
  IconTerminal2,
  IconFolderSearch,
  IconFileText,
  IconWorld,
  IconSearch,
  IconSitemap,
  IconBook2,
  IconTool,
  IconMessage,
  IconListCheck,
  IconInfoCircle,
  IconAnchor,
  IconSteeringWheel,
  IconBrain,
} from "@tabler/icons-react";
import { Spinner } from "../ui/spinner";
import { useCn, useUiConfig } from "../ui/ui-config";
import { useEffect, useState, useSyncExternalStore } from "react";

import { quantizedSnapshot, subscribeQuantized } from "../utils/sharedClock";

/** Props the activity timeline passes to its Markdown renderer. */
// A type alias, not an interface: streamdown 2.7.1 gave its props a
// `data-*` index signature, and only an alias is assignable to that.
export type ActivityMarkdownProps = {
  className?: string;
  /** `streaming` while the text is still arriving. */
  mode?: "static" | "streaming";
  children: string;
};

/**
 * `UiConfig.ActivityTasks`: defaults for the agent activity timeline
 * (`ActivityTasks`, `ActivityThinkingIcon`).
 */
export interface ActivityTasksConfig {
  /** Agent name in the streaming header ("<name> is thinking..."). Default "Agent"; the `name` prop wins. */
  name?: string;
  /** Renders reasoning and mid-turn reply text. Default: the package `Markdown` (smooth streaming). */
  markdown?: ComponentType<ActivityMarkdownProps>;
  /**
   * An image for `ActivityThinkingIcon` (for example the app's logo mark),
   * shown 16px and round. Without it the icon is the brain glyph.
   */
  thinkingIcon?: { src: string; alt: string };
}

export * from "./activity-step-types";

/** Glyph for thinking steps: the app's mark from `UiConfig.ActivityTasks.thinkingIcon`, or a brain. */
export function ActivityThinkingIcon({ className }: { className?: string }) {
  const image = useUiConfig("ActivityTasks")?.thinkingIcon;
  const merge = useCn();
  if (!image) return <IconBrain aria-hidden className={className} />;
  return (
    <img
      src={image.src}
      alt={image.alt}
      width={16}
      height={16}
      className={merge("rounded-full", className)}
    />
  );
}

/** The `status` step glyph: the `circle` {@link Spinner}. */
function ActivityStatusSpinner() {
  return <Spinner variant="circle" />;
}

/** Glyph and fallback label per step type. */
export const activityStepConfig = {
  read: { icon: IconFileSearch, defaultLabel: "Read file" },
  edit: { icon: IconPencil, defaultLabel: "Edited file" },
  write: { icon: IconFilePlus, defaultLabel: "Created file" },
  bash: { icon: IconTerminal2, defaultLabel: "Ran command" },
  search_files: { icon: IconFolderSearch, defaultLabel: "Found files" },
  search_code: { icon: IconFileText, defaultLabel: "Searched code" },
  web_fetch: { icon: IconWorld, defaultLabel: "Fetched URL" },
  web_search: { icon: IconSearch, defaultLabel: "Web search" },
  subtask: { icon: IconSitemap, defaultLabel: "Ran agent" },
  notebook: { icon: IconBook2, defaultLabel: "Edited notebook" },
  thinking: { icon: ActivityThinkingIcon, defaultLabel: "Thinking..." },
  reasoning: { icon: ActivityThinkingIcon, defaultLabel: "Thinking..." },
  response: { icon: IconMessage, defaultLabel: "Response" },
  question: { icon: IconMessage, defaultLabel: "Asked a question" },
  todos: { icon: IconListCheck, defaultLabel: "Task list" },
  tool: { icon: IconTool, defaultLabel: "Used tool" },
  notice: { icon: IconInfoCircle, defaultLabel: "Notice" },
  hook: { icon: IconAnchor, defaultLabel: "Hook" },
  status: { icon: ActivityStatusSpinner, defaultLabel: "Status" },
  steer: { icon: IconSteeringWheel, defaultLabel: "Steered" },
};

const SPINNER_VERBS = [
  "Accomplishing",
  "Actioning",
  "Actualizing",
  "Architecting",
  "Baking",
  "Beaming",
  "Beboppin'",
  "Befuddling",
  "Billowing",
  "Blanching",
  "Bloviating",
  "Boogieing",
  "Boondoggling",
  "Booping",
  "Bootstrapping",
  "Brewing",
  "Bunning",
  "Burrowing",
  "Calculating",
  "Canoodling",
  "Caramelizing",
  "Cascading",
  "Catapulting",
  "Cerebrating",
  "Channeling",
  "Channelling",
  "Choreographing",
  "Churning",
  "Clauding",
  "Coalescing",
  "Cogitating",
  "Combobulating",
  "Composing",
  "Computing",
  "Concocting",
  "Considering",
  "Contemplating",
  "Cooking",
  "Crafting",
  "Creating",
  "Crunching",
  "Crystallizing",
  "Cultivating",
  "Deciphering",
  "Deliberating",
  "Determining",
  "Dilly-dallying",
  "Discombobulating",
  "Doing",
  "Doodling",
  "Drizzling",
  "Ebbing",
  "Effecting",
  "Elucidating",
  "Embellishing",
  "Enchanting",
  "Envisioning",
  "Evaporating",
  "Fermenting",
  "Fiddle-faddling",
  "Finagling",
  "Flambéing",
  "Flibbertigibbeting",
  "Flowing",
  "Flummoxing",
  "Fluttering",
  "Forging",
  "Forming",
  "Frolicking",
  "Frosting",
  "Gallivanting",
  "Galloping",
  "Garnishing",
  "Generating",
  "Gesticulating",
  "Germinating",
  "Gitifying",
  "Grooving",
  "Gusting",
  "Harmonizing",
  "Hashing",
  "Hatching",
  "Herding",
  "Honking",
  "Hullaballooing",
  "Hyperspacing",
  "Ideating",
  "Imagining",
  "Improvising",
  "Incubating",
  "Inferring",
  "Infusing",
  "Ionizing",
  "Jitterbugging",
  "Julienning",
  "Kneading",
  "Leavening",
  "Levitating",
  "Lollygagging",
  "Manifesting",
  "Marinating",
  "Meandering",
  "Metamorphosing",
  "Misting",
  "Moonwalking",
  "Moseying",
  "Mulling",
  "Mustering",
  "Musing",
  "Nebulizing",
  "Nesting",
  "Newspapering",
  "Noodling",
  "Nucleating",
  "Orbiting",
  "Orchestrating",
  "Osmosing",
  "Perambulating",
  "Percolating",
  "Perusing",
  "Philosophising",
  "Photosynthesizing",
  "Pollinating",
  "Pondering",
  "Pontificating",
  "Pouncing",
  "Precipitating",
  "Prestidigitating",
  "Processing",
  "Proofing",
  "Propagating",
  "Puttering",
  "Puzzling",
  "Quantumizing",
  "Razzle-dazzling",
  "Razzmatazzing",
  "Recombobulating",
  "Reticulating",
  "Roosting",
  "Ruminating",
  "Sautéing",
  "Scampering",
  "Schlepping",
  "Scurrying",
  "Seasoning",
  "Shenaniganing",
  "Shimmying",
  "Simmering",
  "Skedaddling",
  "Sketching",
  "Slithering",
  "Smooshing",
  "Sock-hopping",
  "Spelunking",
  "Spinning",
  "Sprouting",
  "Stewing",
  "Sublimating",
  "Swirling",
  "Swooping",
  "Symbioting",
  "Synthesizing",
  "Tempering",
  "Thinking",
  "Thundering",
  "Tinkering",
  "Tomfoolering",
  "Topsy-turvying",
  "Transfiguring",
  "Transmuting",
  "Twisting",
  "Undulating",
  "Unfurling",
  "Unravelling",
  "Vibing",
  "Waddling",
  "Wandering",
  "Warping",
  "Whatchamacalliting",
  "Whirlpooling",
  "Whirring",
  "Whisking",
  "Wibbling",
  "Working",
  "Wrangling",
  "Zesting",
  "Zigzagging",
] as const;

export function getRandomActivityVerb(): string {
  return SPINNER_VERBS[Math.floor(Math.random() * SPINNER_VERBS.length)] ?? "Working";
}

export function useActivitySpinnerVerb(active: boolean): string {
  const [verb, setVerb] = useState(getRandomActivityVerb);
  useEffect(() => {
    if (!active) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (id !== undefined) return;
      id = setInterval(() => {
        setVerb(getRandomActivityVerb());
      }, 3000);
    };
    const stop = () => {
      if (id === undefined) return;
      clearInterval(id);
      id = undefined;
    };
    const onVisibility = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        stop();
        return;
      }
      start();
    };
    onVisibility();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }
    return () => {
      stop();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, [active]);
  return verb;
}

const SECOND_MS = 1000;
const noopSubscribe = () => () => {};

export function useActivityElapsedSeconds(
  startedAt: number | undefined,
  active: boolean,
) {
  const tick = useSyncExternalStore(
    active && startedAt
      ? (onChange) => subscribeQuantized(SECOND_MS, onChange)
      : noopSubscribe,
    () => quantizedSnapshot(SECOND_MS),
    () => quantizedSnapshot(SECOND_MS),
  );
  if (!active || !startedAt) return 0;
  return Math.max(0, Math.floor((tick - startedAt) / 1000));
}

export function formatActivityElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
