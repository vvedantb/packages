// @vitest-environment happy-dom
// UiConfig entries, new opt-in props and moved components of the AI chat
// family (conversation, message, prompt input, queue panel, shimmer, code
// block, artifact, attachments, file chip, confirmation, sandbox, speech,
// settings, traits): no entry renders the built-in DOM, an entry replaces the
// parts it names, explicit props win.
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MotionGlobalConfig } from "motion/react";
import { IconCopy, IconStar } from "@tabler/icons-react";
import { TooltipProvider } from "../ui/tooltip";
import { type UiConfig, UiConfigProvider } from "../ui/ui-config";
import * as rootEntry from "../index";
import {
  Artifact,
  ArtifactAction,
  ArtifactClose,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "./artifact";
import { Attachment, AttachmentPreview, AttachmentRemove, Attachments } from "./attachments";
import { CodeBlock, CodeBlockCopyButton } from "./code-block";
import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRequest,
  ConfirmationTitle,
} from "./confirmation";
import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationScrollButton,
} from "./conversation";
import { FileChip } from "./file-chip";
import {
  Message,
  MessageAction,
  MessageBranch,
  MessageBranchContent,
  MessageBranchNext,
  MessageBranchSelector,
  MessageContent,
} from "./message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTabItem,
  PromptInputTextarea,
  usePromptInputAttachments,
  useOptionalPromptInputController,
} from "./prompt-input";
import { PromptInputSettings } from "./prompt-input-settings";
import { PromptInputSpeech, getSpeechRecognition } from "./prompt-input-speech";
import { TraitsPanel, applyUltrathinkPrefix, isUltrathinkPrompt } from "./prompt-input-traits";
import {
  QueueItemContent,
  QueueItemIndicator,
  QueuePanel,
  QueuePanelItem,
  QueuePanelList,
  QueueSection,
  QueueSectionContent,
  QueueSectionLabel,
  QueueSectionTrigger,
} from "./queue-panel";
import { Sandbox, SandboxTabContent, SandboxTabs, SandboxTabsList, SandboxTabsTrigger } from "./sandbox";
import { Shimmer } from "./shimmer";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// happy-dom has no Web Animations API (the submit spinner starts its loop
// with `element.animate()`).
Object.defineProperty(Element.prototype, "animate", {
  configurable: true,
  value: () => ({ playState: "running", pause() {}, play() {}, cancel() {} }),
});

// Presence exits finish on the next frame instead of after a spring.
MotionGlobalConfig.skipAnimations = true;

let root: Root | null = null;

async function mount(node: ReactNode, config?: UiConfig) {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  const tree = <TooltipProvider>{node}</TooltipProvider>;
  await act(async () =>
    created.render(config ? <UiConfigProvider config={config}>{tree}</UiConfigProvider> : tree),
  );
  return host;
}

afterEach(async () => {
  vi.useRealTimers();
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

function el(host: ParentNode, selector: string): Element {
  const found = host.querySelector(selector);
  if (!found) throw new Error(`missing ${selector}`);
  return found;
}

function cls(host: ParentNode, selector: string): string[] {
  return [...el(host, selector).classList].sort();
}

const noop = () => {};
const image = { id: "a", type: "file" as const, mediaType: "image/png", filename: "a.png", url: "https://x/a.png" };

describe("root exports", () => {
  it("exposes the moved components", () => {
    for (const name of [
      "ArtifactClose", "FileChip", "Confirmation", "ConfirmationTitle", "ConfirmationRequest",
      "ConfirmationAccepted", "ConfirmationRejected", "ConfirmationActions", "ConfirmationAction",
      "Sandbox", "SandboxContent", "SandboxTabs", "SandboxTabsList", "SandboxTabsTrigger", "SandboxTabContent",
      "QueuePanel", "QueuePanelList", "QueuePanelItem", "QueueSection", "QueueSectionTrigger",
      "QueueSectionLabel", "QueueSectionContent", "QueueItemIndicator", "QueueItemContent",
      "QueueItemActions", "QueueItemAction", "PromptInputSpeech", "useSpeechRecognition",
      "getSpeechRecognition", "PromptInputSettings", "TraitsPanel", "isUltrathinkPrompt",
      "applyUltrathinkPrefix", "PromptInputSelect", "PromptInputSelectTrigger", "PromptInputSelectContent",
      "PromptInputSelectItem", "PromptInputSelectValue", "useOptionalPromptInputController",
      // The queued-messages widget keeps its names.
      "Queue", "QueueHeader", "QueueList", "QueueItem",
    ]) {
      expect(rootEntry, name).toHaveProperty(name);
    }
  });
});

describe("no entry", () => {
  const nodes: Record<string, ReactNode> = {
    Conversation: (
      <Conversation initial={false}>
        <ConversationContent scrollClassName="s">x</ConversationContent>
        <ConversationScrollButton />
        <ConversationDownload messages={[]} />
      </Conversation>
    ),
    Message: (
      <MessageBranch>
        <MessageBranchContent>
          <Message from="user" key="a"><MessageContent>Hi</MessageContent></Message>
          <Message from="assistant" key="b"><MessageContent>Yo</MessageContent></Message>
        </MessageBranchContent>
        <MessageBranchSelector><MessageBranchNext /></MessageBranchSelector>
        <MessageAction tooltip="Copy"><IconCopy /></MessageAction>
      </MessageBranch>
    ),
    PromptInput: (
      <PromptInput onSubmit={noop} containerClassName="c">
        <PromptInputTextarea />
        <PromptInputFooter>
          <PromptInputActionMenu><PromptInputActionMenuTrigger /></PromptInputActionMenu>
          <PromptInputSubmit status="submitted" />
        </PromptInputFooter>
        <PromptInputTabItem>t</PromptInputTabItem>
      </PromptInput>
    ),
    Artifact: (
      <Artifact>
        <ArtifactHeader>
          <ArtifactTitle>T</ArtifactTitle>
          <ArtifactDescription>D</ArtifactDescription>
          <ArtifactAction tooltip="Copy" icon={<IconCopy />} />
          <ArtifactClose />
        </ArtifactHeader>
        <ArtifactContent>B</ArtifactContent>
      </Artifact>
    ),
    Attachments: (
      <Attachments variant="grid">
        <Attachment data={image} onRemove={noop}>
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      </Attachments>
    ),
  };

  it.each(Object.keys(nodes))("%s renders the built-in DOM under an empty config", async (name) => {
    const ids = (html: string) => html.replace(/_r_[0-9a-z]+_|«r[0-9a-z]+»|:r[0-9a-z]+:/g, "_r_");
    const plain = ids((await mount(nodes[name])).innerHTML);
    const empty = ids((await mount(nodes[name], {})).innerHTML);
    expect(empty).toBe(plain);
  });

  // The gradient sweep's `background-position` and shiki's async tokens make
  // these two non-deterministic, so they compare without them.
  it("Shimmer and CodeBlock keep the built-in DOM under an empty config", async () => {
    const stable = (html: string) => html.replace(/ style="[^"]*"/g, "").replace(/<pre[\s\S]*<\/pre>/, "<pre/>");
    const shimmer = <Shimmer>Thinking</Shimmer>;
    expect(stable((await mount(shimmer, {})).innerHTML)).toBe(stable((await mount(shimmer)).innerHTML));
    const code = (
      <CodeBlock code="x" language="ts">
        <CodeBlockCopyButton />
      </CodeBlock>
    );
    expect(stable((await mount(code, {})).innerHTML)).toBe(stable((await mount(code)).innerHTML));
  });

  it("keeps the vvedantb looks", async () => {
    const host = await mount(nodes.PromptInput);
    expect(el(host, "button[type=submit]").innerHTML).toContain("animate-spin");
    expect(cls(host, "textarea")).toContain("max-h-48");
    // The menu trigger stays a button inside the Radix trigger button.
    expect(host.querySelectorAll("button button")).toHaveLength(1);
  });
});

describe("Conversation", () => {
  it("replaces content and scroll classes and the download classes", async () => {
    const host = await mount(
      <Conversation>
        <ConversationContent className="extra" scrollClassName="mine">x</ConversationContent>
        <ConversationDownload messages={[]} />
      </Conversation>,
      { Conversation: { classes: { content: "flex gap-8", scroll: "scroll-fade", download: "dl" } } },
    );
    expect(cls(host, "[role=log] > div > div")).toEqual(["extra", "flex", "gap-8"]);
    expect(cls(host, "[role=log] > div")).toEqual(["mine", "scroll-fade"]);
    expect(cls(host, "button")).toEqual(["dl"].concat(cls(host, "button").filter((c) => c !== "dl")).sort());
    expect(cls(host, "button")).toContain("dl");
    expect(cls(host, "button")).not.toContain("top-4");
  });

  it("shows the scroll button at once without a delay", async () => {
    const host = await mount(
      <Conversation initial={false}>
        <ConversationContent>x</ConversationContent>
        <ConversationScrollButton />
      </Conversation>,
    );
    expect(host.querySelector("button")).not.toBeNull();
    expect(host.querySelector("button")?.getAttribute("aria-label")).toBeNull();
  });

  it("delays the button, renders frame, label and icon from config, and hides on reset", async () => {
    vi.useFakeTimers();
    const config: UiConfig = {
      Conversation: {
        classes: { scrollButtonFrame: "frame", scrollButtonMotion: "", scrollButton: "pill" },
        scrollButton: { label: "Scroll to end", icon: <IconStar />, showDelay: 150, size: "sm" },
      },
    };
    const tree = (resetKey: string) => (
      <Conversation initial={false}>
        <ConversationContent>x</ConversationContent>
        <ConversationScrollButton resetKey={resetKey} />
      </Conversation>
    );
    const host = await mount(tree("a"), config);
    expect(el(host, ".frame").innerHTML).toBe("");
    await act(async () => {
      vi.advanceTimersByTime(149);
    });
    expect(host.querySelector("button")).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    const button = el(host, "button");
    expect(button.getAttribute("aria-label")).toBe("Scroll to end");
    expect(button.getAttribute("title")).toBe("Scroll to end");
    expect(button.textContent).toBe("Scroll to end");
    expect(button.querySelector(".tabler-icon-star")).not.toBeNull();
    expect(button.parentElement?.hasAttribute("class")).toBe(false);
    expect([...button.classList]).toContain("pill");
    vi.useRealTimers();
    await act(async () =>
      root?.render(
        <UiConfigProvider config={config}>
          <TooltipProvider>{tree("b")}</TooltipProvider>
        </UiConfigProvider>,
      ),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    // Hidden by the reset, and not shown again while still away from the bottom.
    expect(host.querySelector("button[aria-label]")).toBeNull();
  });

  it("lets the props win over config defaults", async () => {
    const host = await mount(
      <Conversation initial={false}>
        <ConversationContent>x</ConversationContent>
        <ConversationScrollButton label="Down" showDelay={0} />
      </Conversation>,
      { Conversation: { scrollButton: { label: "Scroll to end", showDelay: 500 } } },
    );
    expect(el(host, "button").getAttribute("aria-label")).toBe("Down");
  });
});

describe("Message", () => {
  it("replaces root, role, content, branch selector and arrow classes", async () => {
    const host = await mount(
      <MessageBranch>
        <MessageBranchContent>
          <Message from="user" key="a"><MessageContent className="px-1">A</MessageContent></Message>
          <Message from="assistant" key="b"><MessageContent>B</MessageContent></Message>
        </MessageBranchContent>
        <MessageBranchSelector><MessageBranchNext /></MessageBranchSelector>
      </MessageBranch>,
      {
        Message: {
          classes: { root: "group flex", user: "is-user", assistant: "is-bot", content: "c", branchSelector: "bs", branchIcon: "size-3.5" },
        },
      },
    );
    const messages = host.querySelectorAll(".group.flex");
    expect([...(messages[0]?.classList ?? [])].sort()).toEqual(["flex", "group", "is-user"]);
    expect([...(messages[1]?.classList ?? [])].sort()).toEqual(["flex", "group", "is-bot"]);
    expect(cls(host, ".is-user > div")).toEqual(["c", "px-1"]);
    expect(el(host, "button svg").getAttribute("class")).toContain("size-3.5");
    expect(el(host, "button svg").getAttribute("width")).toBe("24");
  });

  it("mounts a lazy action tooltip on first hover", async () => {
    const host = await mount(<MessageAction tooltip="Copy">x</MessageAction>, { Message: { lazyActionTooltips: true } });
    expect(el(host, "button").hasAttribute("data-state")).toBe(false);
    await act(async () => {
      el(host, "button").dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    });
    expect(el(host, "button").getAttribute("data-state")).toBe("closed");
    expect(el(host, ".sr-only").textContent).toBe("Copy");
  });
});

describe("PromptInput", () => {
  it("replaces group, textarea, footer, submit, select trigger and tab item classes", async () => {
    const host = await mount(
      <PromptInput onSubmit={noop}>
        <PromptInputTextarea />
        <PromptInputFooter>
          <PromptInputSelect value="a">
            <PromptInputSelectTrigger><PromptInputSelectValue /></PromptInputSelectTrigger>
          </PromptInputSelect>
          <PromptInputSubmit />
        </PromptInputFooter>
        <PromptInputTabItem>t</PromptInputTabItem>
      </PromptInput>,
      {
        PromptInput: {
          classes: {
            group: "g",
            groupIdle: "idle",
            groupDefault: "rounded-control",
            textarea: "ta",
            footer: "ft",
            submit: "rounded-full",
            selectTrigger: "st",
            tabItem: "ti",
          },
        },
      },
    );
    const group = el(host, "form > div");
    expect([...group.classList]).toEqual(expect.arrayContaining(["g", "idle", "rounded-control"]));
    expect([...group.classList]).not.toContain("overflow-hidden");
    expect(cls(host, "textarea")).toContain("ta");
    expect(cls(host, "textarea")).not.toContain("max-h-48");
    expect(cls(host, "[data-align=block-end]")).toContain("ft");
    expect(cls(host, "button[type=submit]")).toContain("rounded-full");
    expect(cls(host, "[role=combobox]")).toContain("st");
    expect(cls(host, "form > div > div:last-child")).toEqual(["ti"]);
  });

  it("takes inputGroupClassName / containerClassName over groupDefault", async () => {
    const config: UiConfig = { PromptInput: { classes: { groupDefault: "rounded-control" } } };
    const a = await mount(<PromptInput onSubmit={noop} inputGroupClassName="rounded-full">x</PromptInput>, config);
    expect(cls(a, "form > div")).toContain("rounded-full");
    expect(cls(a, "form > div")).not.toContain("rounded-control");
    const b = await mount(<PromptInput onSubmit={noop} containerClassName="rounded-none">x</PromptInput>, config);
    expect(cls(b, "form > div")).toContain("rounded-none");
  });

  it("highlights accepted drags and hands a data drop its payload", async () => {
    const onDrop = vi.fn();
    const host = await mount(
      <PromptInput onSubmit={noop} dataDrop={{ type: "x/pr", onDrop }}>x</PromptInput>,
      { PromptInput: { classes: { groupIdle: "idle", groupDragOver: "over" } } },
    );
    const drag = (type: string, kind: string, payload = "") => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", {
        value: { types: [kind], files: [], getData: () => payload },
      });
      Object.setPrototypeOf(event, DragEvent.prototype);
      return event;
    };
    const form = el(host, "form");
    await act(async () => {
      form.dispatchEvent(drag("dragenter", "text/plain"));
    });
    expect(cls(host, "form > div")).toContain("idle");
    await act(async () => {
      form.dispatchEvent(drag("dragenter", "x/pr"));
    });
    expect(cls(host, "form > div")).toContain("over");
    const drop = drag("drop", "x/pr", "42");
    await act(async () => {
      form.dispatchEvent(drop);
    });
    expect(drop.defaultPrevented).toBe(true);
    expect(onDrop).toHaveBeenCalledWith("42");
    expect(cls(host, "form > div")).toContain("idle");
  });

  it("uses config submit icons with a cross-fade", async () => {
    const host = await mount(
      <PromptInput onSubmit={noop}><PromptInputSubmit /></PromptInput>,
      { PromptInput: { submitIcons: { send: <IconStar className="size-4" /> }, submitCrossfade: true } },
    );
    const button = el(host, "button[type=submit]");
    expect(button.querySelector(".tabler-icon-star")).not.toBeNull();
    expect(button.querySelector("span.relative > span.absolute")).not.toBeNull();
  });

  it("makes the menu trigger the Radix trigger with menuTriggerAsChild", async () => {
    const host = await mount(
      <PromptInputActionMenu><PromptInputActionMenuTrigger aria-label="Add" /></PromptInputActionMenu>,
      { PromptInput: { menuTriggerAsChild: true } },
    );
    expect(host.querySelectorAll("button")).toHaveLength(1);
    expect(el(host, "button").getAttribute("aria-label")).toBe("Add");
    expect(el(host, "button").getAttribute("aria-haspopup")).toBe("menu");
  });

  it.each(["mouse", "Enter", " "])("add attachments opens the file picker and keeps the menu open (%j)", async (how) => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const host = await mount(
      <PromptInput onSubmit={noop}>
        <PromptInputActionMenu>
          <PromptInputActionMenuTrigger />
          <PromptInputActionMenuContent>
            <PromptInputActionAddAttachments />
          </PromptInputActionMenuContent>
        </PromptInputActionMenu>
      </PromptInput>,
    );
    await act(async () =>
      el(host, "button[aria-haspopup=menu]").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 })),
    );
    const item = el(document, "[role=menuitem]");
    await act(async () => {
      if (how === "mouse") item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      else item.dispatchEvent(new KeyboardEvent("keydown", { key: how, bubbles: true }));
    });
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[role=menu]")).not.toBeNull();
    click.mockRestore();
  });

  it("replaces an attachment in place and accepts extension patterns", async () => {
    const createObjectURL = vi.fn(() => "blob:new");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    let ctx: ReturnType<typeof usePromptInputAttachments> | null = null;
    const Probe = () => {
      ctx = usePromptInputAttachments();
      return <span>{ctx.files.map((f) => `${f.id}:${f.filename}`).join(",")}</span>;
    };
    const host = await mount(
      <PromptInput onSubmit={noop} accept=".html">
        <Probe />
      </PromptInput>,
    );
    await act(async () => {
      ctx?.add([new File(["x"], "page.HTML", { type: "" }), new File(["y"], "a.png", { type: "image/png" })]);
    });
    expect(host.textContent).toMatch(/^[\w-]+:page\.HTML$/);
    const id = host.textContent?.split(":")[0] ?? "";
    await act(async () => {
      ctx?.replace(id, new File(["z"], "other.html", { type: "text/html" }));
    });
    expect(host.textContent).toBe(`${id}:other.html`);
  });

  it("useOptionalPromptInputController is null outside the provider", async () => {
    const seen: Array<string | null> = [];
    const Probe = () => {
      seen.push(useOptionalPromptInputController()?.textInput.value ?? null);
      return null;
    };
    await mount(<Probe />);
    await mount(<PromptInputProvider initialInput="hi"><Probe /></PromptInputProvider>);
    expect(seen).toEqual([null, "hi"]);
  });
});

describe("Shimmer", () => {
  it("renders the mask sweep from config, the prop winning", async () => {
    const host = await mount(<Shimmer className="text-sm" duration={3} spread={1}>Abc</Shimmer>, {
      Shimmer: { mode: "mask", as: "p", classes: { overlay: "o" } },
    });
    const p = el(host, "p");
    expect([...p.classList].sort()).toEqual(["inline-block", "relative", "text-muted-foreground", "text-sm"]);
    expect(p.getAttribute("style")).toContain("--shimmer-spread: 3px");
    expect(p.getAttribute("style")).toContain("--shimmer-duration: 3s");
    expect(el(p, ".o").getAttribute("aria-hidden")).toBe("true");
    expect(el(p, ".o > .shimmer-band > .shimmer-copy").textContent).toBe("Abc");
    const span = await mount(<Shimmer mode="gradient">Abc</Shimmer>, { Shimmer: { mode: "mask" } });
    expect(span.querySelector(".shimmer-band")).toBeNull();
  });
});

describe("CodeBlock", () => {
  it("renders plain text whose children replace the pre, with config classes", async () => {
    const config: UiConfig = {
      CodeBlock: {
        plain: true,
        copyButtonSize: "sm",
        copyLabel: "Copy code",
        classes: { container: "box", pre: "pre", copyButton: "copy", copyIcon: "size-3.5" },
      },
    };
    const plain = await mount(<CodeBlock code="a" language="ts" className="x" />, config);
    expect(cls(plain, "div")).toEqual(["box", "x"]);
    expect(el(plain, "pre.pre > code").getAttribute("data-language")).toBe("ts");
    const own = await mount(
      <CodeBlock code="a">
        <CodeBlockCopyButton />
        <pre className="mine">a</pre>
      </CodeBlock>,
      config,
    );
    expect(own.querySelectorAll("pre")).toHaveLength(1);
    expect(cls(own, "button")).toContain("copy");
    expect(el(own, "button svg").getAttribute("class")).toContain("size-3.5");
    expect(el(own, "button .sr-only").textContent).toBe("Copy code");
  });

  it("copies once per check by default; copyEveryClick copies on every click", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    const block = (
      <CodeBlock code="a" plain>
        <CodeBlockCopyButton />
      </CodeBlock>
    );
    const clickTwice = async (host: HTMLElement) => {
      for (let i = 0; i < 2; i++) {
        await act(async () => el(host, "button").dispatchEvent(new MouseEvent("click", { bubbles: true })));
      }
    };
    try {
      await clickTwice(await mount(block));
      expect(writeText).toHaveBeenCalledTimes(1);
      writeText.mockClear();
      await clickTwice(await mount(block, { CodeBlock: { copyEveryClick: true } }));
      expect(writeText).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("highlights without plain and takes plain from the prop", async () => {
    const host = await mount(<CodeBlock code="a" plain />);
    expect(el(host, "code").getAttribute("data-language")).toBeNull();
    expect(el(host, "div").hasAttribute("style")).toBe(false);
  });
});

describe("Artifact", () => {
  it("replaces part classes; actions take an icon component, sr-only labels and no tooltip", async () => {
    const host = await mount(
      <Artifact>
        <ArtifactHeader>
          <ArtifactTitle>T</ArtifactTitle>
          <ArtifactDescription>D</ArtifactDescription>
          <ArtifactAction icon={IconCopy} label="Copy" />
          <ArtifactClose />
        </ArtifactHeader>
        <ArtifactContent>B</ArtifactContent>
      </Artifact>,
      {
        Artifact: {
          actionSize: "sm",
          actionLabel: "sr-only",
          classes: { root: "r", header: "h", title: "t", description: "d", action: "a", actionIcon: "i", content: "c" },
        },
      },
    );
    expect(cls(host, "div")).toEqual(["r"]);
    expect(cls(host, ".r > div")).toEqual(["h"]);
    expect(cls(host, "p")).toEqual(["t"]);
    expect(cls(host, ".r > div:last-child")).toEqual(["c"]);
    const [copy, close] = host.querySelectorAll("button");
    expect(copy?.hasAttribute("aria-label")).toBe(false);
    expect(copy?.getAttribute("type")).toBe("button");
    expect(copy?.querySelector(".sr-only")?.textContent).toBe("Copy");
    expect(copy?.querySelector("svg")?.getAttribute("class")).toContain(" i");
    expect(close?.querySelector(".sr-only")?.textContent).toBe("Close");
    expect(host.querySelector("[data-state]")).toBeNull();
  });

  it("labels actions with aria-label by default", async () => {
    const host = await mount(<ArtifactClose label="Dismiss" />);
    expect(el(host, "button").getAttribute("aria-label")).toBe("Dismiss");
    expect(host.querySelector(".sr-only")).toBeNull();
  });
});

describe("Attachments", () => {
  it("replaces the variant classes of item, preview and remove", async () => {
    const host = await mount(
      <Attachments variant="inline">
        <Attachment data={image} onRemove={noop}>
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      </Attachments>,
      { Attachments: { classes: { item: { inline: "item" }, preview: { inline: "prev" }, remove: { inline: "rm" } } } },
    );
    expect(cls(host, ".group")).toEqual(["group", "item", "relative"]);
    expect(cls(host, ".group > div")).toEqual(
      ["flex", "items-center", "justify-center", "overflow-hidden", "prev", "shrink-0"],
    );
    expect(cls(host, "button")).toContain("rm");
    expect(cls(host, "button")).not.toContain("opacity-0");
  });
});

describe("QueuePanel", () => {
  it("renders sections and replaces the trigger classes", async () => {
    const host = await mount(
      <QueuePanel>
        <QueueSection>
          <QueueSectionTrigger>
            <QueueSectionLabel count={1} label="queued" />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueuePanelList>
              <QueuePanelItem>
                <QueueItemIndicator completed />
                <QueueItemContent>Do it</QueueItemContent>
              </QueuePanelItem>
            </QueuePanelList>
          </QueueSectionContent>
        </QueueSection>
      </QueuePanel>,
      { QueuePanel: { classes: { sectionTrigger: "trigger" } } },
    );
    expect(cls(host, "button")).toEqual(["trigger"]);
    expect(el(host, "button").getAttribute("data-state")).toBe("open");
    expect(el(host, "li").textContent).toBe("Do it");
    expect(el(host, "button").textContent).toBe("1 queued");
  });
});

describe("moved components", () => {
  it("FileChip opens the file when it has a path and a handler", async () => {
    const onOpenFile = vi.fn();
    const host = await mount(
      <>
        <FileChip name="a.ts" />
        <FileChip name="b.ts" path="src/b.ts" onOpenFile={onOpenFile} />
      </>,
    );
    expect(host.querySelectorAll("button")).toHaveLength(1);
    el(host, "button").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onOpenFile).toHaveBeenCalledWith("src/b.ts");
  });

  it("Confirmation shows the parts of its state", async () => {
    const tree = (state: "pending" | "accepted") => (
      <Confirmation state={state}>
        <ConfirmationTitle>
          <ConfirmationRequest>Run?</ConfirmationRequest>
          <ConfirmationAccepted>Done</ConfirmationAccepted>
        </ConfirmationTitle>
        <ConfirmationActions>
          <ConfirmationAction>OK</ConfirmationAction>
        </ConfirmationActions>
      </Confirmation>
    );
    const pending = await mount(tree("pending"));
    expect(pending.textContent).toBe("Run?OK");
    const accepted = await mount(tree("accepted"));
    expect(accepted.textContent).toBe("Done");
  });

  it("Sandbox badges its state next to the tabs", async () => {
    const host = await mount(
      <Sandbox state="error">
        <SandboxTabs defaultValue="a">
          <SandboxTabsList>
            <SandboxTabsTrigger value="a">Code</SandboxTabsTrigger>
          </SandboxTabsList>
          <SandboxTabContent value="a">x</SandboxTabContent>
        </SandboxTabs>
      </Sandbox>,
    );
    expect(host.textContent).toContain("Error");
    expect(el(host, "[role=tab]").textContent).toBe("Code");
  });

  it("PromptInputSpeech renders only with the Web Speech API", async () => {
    expect(getSpeechRecognition()).toBeNull();
    expect((await mount(<PromptInputSpeech />)).innerHTML).toBe("");
    class FakeRecognition extends EventTarget {}
    Object.assign(window, { webkitSpeechRecognition: FakeRecognition });
    try {
      const host = await mount(<PromptInputSpeech disabled />);
      expect(el(host, "button").hasAttribute("disabled")).toBe(true);
    } finally {
      Reflect.deleteProperty(window, "webkitSpeechRecognition");
    }
  });

  it("PromptInputSettings takes provider labels, icons and trigger classes from config", async () => {
    const host = await mount(
      <PromptInputSettings
        model="b"
        onModelChange={noop}
        options={[
          { id: "a", provider: "one", label: "A" },
          { id: "b", provider: "two", label: "B" },
        ]}
      />,
      {
        PromptInputSettings: {
          providerLabel: (p) => p.toUpperCase(),
          providerIcon: (p) => <i data-provider={p} />,
          classes: { trigger: "trig" },
        },
      },
    );
    expect(cls(host, "button")).toEqual(["trig"]);
    await act(async () => {
      el(host, "button").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    });
    expect(document.body.querySelector('[role=menu] i[data-provider="two"]')).not.toBeNull();
  });

  it("TraitsPanel replaces its classes and reads the prompt for ultrathink", async () => {
    expect(isUltrathinkPrompt("please ULTRATHINK")).toBe(true);
    expect(applyUltrathinkPrefix(" fix ")).toBe("Ultrathink:\nfix");
    const host = await mount(
      <PromptInputProvider initialInput="Ultrathink: go">
        <TraitsPanel
          config={{ reasoning: { levels: ["low"], default: "low", ultrathink: true } }}
          effortLevel={undefined}
          thinkingEnabled={false}
          use1mContext={false}
          fastMode={false}
          getLevelLabel={(l) => l}
          onEffortLevelChange={noop}
          onThinkingEnabledChange={noop}
          onUse1mContextChange={noop}
          onFastModeChange={noop}
        />
      </PromptInputProvider>,
      { TraitsPanel: { classes: { label: "lbl", option: "opt", optionSelected: "on" } } },
    );
    expect(cls(host, "span")).toEqual(["lbl"]);
    expect(el(host, '[aria-checked="true"]').textContent).toBe("Ultrathink");
    expect(cls(host, '[aria-checked="true"]')).toEqual(["on", "opt"]);
  });
});
