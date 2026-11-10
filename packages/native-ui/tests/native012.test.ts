import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PAGE_HEADER_HEIGHT } from "../src/controlStyles";

// The 0.12.0 pieces: `Attachment` onPress, `StackPageHeader` centre,
// `RouterStackPageHeader`, `ChatThread`, `PinnedBotTile` / `BotPinGrid`,
// `ScreenContainer` pull-to-refresh, `SettingsEmptyState`, `ArtifactList` and
// `ChatJumpRail`. The components are called as functions with React Native,
// NativeWind, the icons and the sibling parts stubbed as strings, and the
// checks read the element trees they return.

const larger = vi.hoisted(() => ({ value: false }));
const router = vi.hoisted(() => ({ canGoBack: vi.fn(), back: vi.fn(), replace: vi.fn(), push: vi.fn() }));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useContext: () => "inline",
  useState: <T,>(initial: T) => [initial, () => {}] as const,
}));
vi.mock("react-native", () => ({
  Platform: { OS: "android", select: (specifics: Record<string, unknown>) => specifics.android ?? specifics.default },
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  Image: "Image",
  ScrollView: "ScrollView",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  RefreshControl: "RefreshControl",
}));
vi.mock("nativewind", () => ({ useColorScheme: () => ({ colorScheme: "light" }) }));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
vi.mock("@tabler/icons-react-native", () => ({
  IconX: "IconX",
  IconChevronLeft: "IconChevronLeft",
  IconFileText: "IconFileText",
  IconMusic: "IconMusic",
  IconPaperclip: "IconPaperclip",
  IconPhoto: "IconPhoto",
  IconVideo: "IconVideo",
  IconWorld: "IconWorld",
}));
vi.mock("expo-router", () => ({ useRouter: () => router }));
vi.mock("../src/theme", () => ({ useLargerText: () => larger.value, useAccentColor: () => "#db2777" }));
vi.mock("../src/cn", () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(" ") }));
vi.mock("../src/HeaderIconButton", () => ({ HeaderIconButton: "HeaderIconButton" }));
vi.mock("../src/ai/response-text", () => ({ ResponseText: "ResponseText" }));
vi.mock("../src/ai/conversation", () => ({
  Conversation: "Conversation",
  ConversationContent: "ConversationContent",
  ConversationScrollButton: "ConversationScrollButton",
}));
vi.mock("../src/Spinner", () => ({ Spinner: "Spinner" }));
vi.mock("../src/StatusDot", () => ({ StatusDot: "StatusDot" }));
vi.mock("../src/Chip", () => ({ Chip: "Chip" }));
vi.mock("../src/ListRow", () => ({ ListRow: "ListRow" }));
vi.mock("../src/DividedList", () => ({ DividedList: "DividedList" }));

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => readFileSync(join(root, file), "utf8");

type Element = { type: unknown; key?: string | null; props: Record<string, unknown> & { children?: unknown } };
const isElement = (node: unknown): node is Element =>
  node != null && typeof node === "object" && "type" in node && "props" in node;
function all(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(all);
  if (!isElement(node)) return [];
  return [node, ...all(node.props.children)];
}
const ofType = (tree: unknown, type: unknown) => all(tree).filter((element) => element.type === type);
const byLabel = (tree: unknown, label: string) => all(tree).find((element) => element.props.accessibilityLabel === label);
const flatten = (style: unknown): Record<string, unknown> =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : ((style as Record<string, unknown>) ?? {});

beforeEach(() => {
  larger.value = false;
  vi.clearAllMocks();
});

describe("Attachment onPress", () => {
  const data = { id: "1", filename: "notes.pdf", mediaType: "application/pdf" };

  it("is a plain chip without onPress: no chip button, the same remove button", async () => {
    const { Attachment } = await import("../src/ai/attachments");
    const onRemove = vi.fn();
    const chip = Attachment({ data, onRemove, testID: "chip" }) as unknown as Element;
    expect(chip.props.testID).toBe("chip");
    expect(ofType(chip, "Pressable")).toHaveLength(1);
    expect(byLabel(chip, "Remove notes.pdf")).toBeDefined();
  });

  it("makes the icon and name a 48 point button named by the file name", async () => {
    const { Attachment, ATTACHMENT_PRESS_TARGET } = await import("../src/ai/attachments");
    const onPress = vi.fn();
    const chip = Attachment({ data, onPress }) as unknown as Element;
    const [button] = ofType(chip, "Pressable");
    expect(button!.props).toMatchObject({ accessibilityRole: "button", accessibilityLabel: "notes.pdf" });
    const slop = button!.props.hitSlop as { top: number; bottom: number };
    expect(ATTACHMENT_PRESS_TARGET).toBe(48);
    expect(32 + slop.top + slop.bottom).toBe(48);
    expect(ofType(button, "IconFileText")).toHaveLength(1);
    expect(ofType(button, "ResponseText")).toHaveLength(1);
    (button!.props.onPress as () => void)();
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("reaches 48 with larger text, and takes an accessibilityLabel", async () => {
    larger.value = true;
    const { Attachment } = await import("../src/ai/attachments");
    const chip = Attachment({ data, onPress: () => {}, accessibilityLabel: "Open notes.pdf" }) as unknown as Element;
    const button = byLabel(chip, "Open notes.pdf")!;
    const slop = button.props.hitSlop as { top: number; bottom: number };
    expect(44 + slop.top + slop.bottom).toBeGreaterThanOrEqual(48);
  });

  it("keeps the remove button a separate target that never calls onPress", async () => {
    const { Attachment } = await import("../src/ai/attachments");
    const onPress = vi.fn();
    const onRemove = vi.fn();
    const chip = Attachment({ data, onPress, onRemove }) as unknown as Element;
    const [button] = ofType(chip, "Pressable");
    const remove = byLabel(chip, "Remove notes.pdf")!;
    expect(remove).not.toBe(button);
    expect(ofType(button, "IconX")).toHaveLength(0);
    (remove.props.onPress as () => void)();
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("StackPageHeader centre", () => {
  async function header(props: Record<string, unknown> = {}) {
    const { StackPageHeader } = await import("../src/StackPageHeader");
    return StackPageHeader({ title: "Bot chat", ...props } as Parameters<typeof StackPageHeader>[0]) as unknown as Element;
  }
  const kids = (element: Element) => [element.props.children].flat(Infinity).filter(isElement);

  it("draws the PageTitle when centre is not set", async () => {
    const { PageTitle } = await import("../src/PageTitle");
    const [, centre] = kids(await header());
    expect(ofType(centre, PageTitle)).toHaveLength(1);
  });

  it("replaces the PageTitle with centre, named by title, and keeps the description under it", async () => {
    const { PageTitle } = await import("../src/PageTitle");
    const custom = { type: "Avatar", props: {} };
    const [start, centre, end] = kids(await header({ centre: custom, description: "Online", onBack: () => {}, headerRight: "x" }));
    expect(ofType(centre, PageTitle)).toHaveLength(0);
    expect(all(centre).includes(custom as Element)).toBe(true);
    const wrapper = kids(centre)[0]!;
    expect(wrapper.props).toMatchObject({ accessible: true, accessibilityRole: "header", accessibilityLabel: "Bot chat" });
    expect(wrapper.props.className).toMatch(/min-w-0/);
    expect(ofType(centre, "Text")[0]!.props.children).toBe("Online");
    // The sides stay equal and flexible, and the centre can shrink.
    expect(start!.props.className).toMatch(/^flex-1 /);
    expect(end!.props.className).toMatch(/^flex-1 /);
    expect(centre!.props.className).toMatch(/min-w-0 shrink/);
  });

  it("keeps the page title Instrument Sans semibold 20 (PageTitle source contract)", () => {
    expect(read("src/PageTitle.tsx")).toMatch(/PAGE_TITLE_CLASS/);
    expect(read("src/controlStyles.ts")).toMatch(/PAGE_TITLE_CLASS = "font-instrument-sans-semibold text-xl/);
    expect(PAGE_HEADER_HEIGHT).toBe(56);
  });
});

describe("RouterStackPageHeader", () => {
  it("goes back when the router can, else replaces with the fallback (default /)", async () => {
    const { RouterStackPageHeader } = await import("../src/router/RouterStackPageHeader");
    const { StackPageHeader } = await import("../src/StackPageHeader");
    const el = RouterStackPageHeader({ title: "Details", backTestID: "screen-back" }) as unknown as Element;
    expect(el.type).toBe(StackPageHeader);
    expect(el.props).toMatchObject({ title: "Details", backTestID: "screen-back" });
    router.canGoBack.mockReturnValue(true);
    (el.props.onBack as () => void)();
    expect(router.back).toHaveBeenCalledOnce();
    expect(router.replace).not.toHaveBeenCalled();
    router.canGoBack.mockReturnValue(false);
    (el.props.onBack as () => void)();
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("uses fallbackHref, including an object href", async () => {
    const { RouterStackPageHeader } = await import("../src/router/RouterStackPageHeader");
    router.canGoBack.mockReturnValue(false);
    const el = RouterStackPageHeader({ title: "Bot", fallbackHref: "/bots" }) as unknown as Element;
    (el.props.onBack as () => void)();
    expect(router.replace).toHaveBeenCalledWith("/bots");
    expect(el.props).not.toHaveProperty("fallbackHref");
    const object = { pathname: "/bot/[id]", params: { id: "1" } };
    ((RouterStackPageHeader({ title: "Bot", fallbackHref: object }) as unknown as Element).props.onBack as () => void)();
    expect(router.replace).toHaveBeenLastCalledWith(object);
  });
});

describe("ChatThread", () => {
  type Message = { id: string; role: "user" | "assistant" | "system" };
  const messages: Message[] = [
    { id: "u1", role: "user" },
    { id: "a1", role: "assistant" },
    { id: "u2", role: "user" },
    { id: "a2", role: "assistant" },
  ];
  async function thread(props: Record<string, unknown> = {}) {
    const { ChatThread } = await import("../src/ai/chat-thread");
    const renderMessage = vi.fn((message: Message, streaming: boolean) => ({
      type: "Row",
      props: { id: message.id, streaming },
    }));
    const tree = ChatThread({
      messages,
      working: false,
      renderMessage,
      footer: { type: "Footer", props: {} },
      ...props,
    } as Parameters<typeof ChatThread>[0]) as unknown as Element;
    return { tree, renderMessage };
  }

  it("composes a padding KeyboardAvoidingView, Conversation, the list, the scroll button and the footer last", async () => {
    const { tree } = await thread({ contentContainerClassName: "px-4 py-4" });
    expect(tree.type).toBe("KeyboardAvoidingView");
    expect(tree.props.behavior).toBe("padding");
    const [conversation, footer] = [tree.props.children].flat().filter(isElement);
    expect(conversation!.type).toBe("Conversation");
    expect(footer!.type).toBe("Footer");
    const [content] = ofType(conversation, "ConversationContent");
    expect(content!.props.contentContainerClassName).toBe("px-4 py-4");
    expect(ofType(conversation, "ConversationScrollButton")).toHaveLength(1);
    expect(ofType(conversation, "Row").map((row) => row.props.id)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("marks no message streaming while idle", async () => {
    const { renderMessage } = await thread();
    expect(renderMessage.mock.calls.map(([, streaming]) => streaming)).toEqual([false, false, false, false]);
  });

  it("marks only the last assistant message streaming while working", async () => {
    const { renderMessage } = await thread({ working: true });
    expect(renderMessage.mock.calls.map(([, streaming]) => streaming)).toEqual([false, false, false, true]);
  });

  it("marks the last assistant message streaming even when a user message follows", async () => {
    const { renderMessage } = await thread({ working: true, messages: messages.slice(0, 3) });
    expect(renderMessage.mock.calls.map(([, streaming]) => streaming)).toEqual([false, true, false]);
  });

  it("shows thinking after the last user message while working, and not when idle", async () => {
    const thinking = { type: "Thinking", props: {} };
    const working = await thread({ working: true, thinking, messages: messages.slice(0, 3) });
    const rows = ofType(working.tree, "View").filter((view) => view.key != null);
    const withThinking = rows.map((row) => all(row).some((el) => el.type === "Thinking"));
    expect(withThinking).toEqual([false, false, true]);
    const idle = await thread({ working: false, thinking });
    expect(ofType(idle.tree, "Thinking")).toHaveLength(0);
  });

  it("shows emptyState in place of the list with no messages", async () => {
    const emptyState = { type: "Empty", props: {} };
    const { tree, renderMessage } = await thread({ messages: [], emptyState });
    expect(ofType(tree, "Empty")).toHaveLength(1);
    expect(renderMessage).not.toHaveBeenCalled();
  });

  it("takes a minimal local UIMessage and no ai dependency (source contract)", () => {
    const source = read("src/ai/chat-thread.tsx");
    expect(source).toMatch(/export type UIMessage = \{/);
    expect(source).not.toMatch(/from "ai"/);
    expect(read("src/ai/index.ts")).toMatch(/ChatThread[\s\S]*UIMessage/);
    expect(JSON.parse(read("package.json")).dependencies).toBeUndefined();
  });
});

describe("PinnedBotTile and BotPinGrid", () => {
  async function tile(props: Record<string, unknown> = {}) {
    const { PinnedBotTile } = await import("../src/PinnedBotTile");
    const onPress = vi.fn();
    const leading = { type: "Avatar", props: {} };
    const tree = PinnedBotTile({ title: "Research bot", leading, onPress, ...props } as Parameters<typeof PinnedBotTile>[0]) as unknown as Element;
    return { tree, onPress, leading };
  }

  it("is one button with the avatar above the name", async () => {
    const { tree, onPress, leading } = await tile({ testID: "pin" });
    expect(tree.props).toMatchObject({ testID: "pin", accessibilityRole: "button", accessibilityLabel: "Research bot" });
    const kids = [tree.props.children].flat().filter(isElement);
    expect(kids[0]).toBe(leading);
    expect(kids[1]!.type).toBe("Text");
    expect(kids[1]!.props.children).toBe("Research bot");
    expect(kids[1]!.props.numberOfLines).toBe(2);
    (tree.props.onPress as () => void)();
    expect(onPress).toHaveBeenCalledOnce();
    expect(tree.props.onLongPress).toBeUndefined();
  });

  it("shows an unread dot, a generating spinner and both in the label", async () => {
    const plain = (await tile()).tree;
    expect(ofType(plain, "StatusDot")).toHaveLength(0);
    expect(ofType(plain, "Spinner")).toHaveLength(0);
    const unread = (await tile({ unread: true, testID: "pin" })).tree;
    expect(ofType(unread, "StatusDot")).toHaveLength(1);
    expect(unread.props.accessibilityLabel).toBe("Research bot, unread");
    const generating = (await tile({ generating: true })).tree;
    expect(ofType(generating, "Spinner")).toHaveLength(1);
    expect(generating.props.accessibilityLabel).toBe("Research bot, generating");
    const both = (await tile({ unread: true, generating: true })).tree;
    expect(both.props.accessibilityLabel).toBe("Research bot, unread, generating");
  });

  it("passes onLongPress", async () => {
    const onLongPress = vi.fn();
    const { tree } = await tile({ onLongPress });
    (tree.props.onLongPress as () => void)();
    expect(onLongPress).toHaveBeenCalledOnce();
  });

  it("grows with larger text", async () => {
    expect((await tile()).tree.props.className).toMatch(/min-h-28/);
    larger.value = true;
    expect((await tile()).tree.props.className).toMatch(/min-h-36/);
  });

  it("lays tiles out two across, wrapping", async () => {
    const { BotPinGrid } = await import("../src/PinnedBotTile");
    const children = [1, 2, 3].map((n) => createElement("Tile", { key: `t${n}`, n }));
    const grid = BotPinGrid({ children, testID: "grid" }) as unknown as Element;
    expect(grid.props.className).toMatch(/flex-row flex-wrap/);
    expect(grid.props.testID).toBe("grid");
    const cells = [grid.props.children].flat().filter(isElement);
    expect(cells).toHaveLength(3);
    for (const cell of cells) {
      expect(flatten(cell.props.style)).toMatchObject({ flexBasis: "47%", maxWidth: "50%" });
    }
    expect(BotPinGrid({ children: null }) as unknown as Element).toMatchObject({ type: "View" });
  });
});

describe("ScreenContainer pull-to-refresh", () => {
  async function screen(props: Record<string, unknown> = {}) {
    const { ScreenContainer } = await import("../src/ScreenContainer");
    const tree = ScreenContainer({ children: "body", ...props } as Parameters<typeof ScreenContainer>[0]) as unknown as Element;
    const [scroll] = ofType(tree, "ScrollView");
    return { tree, scroll: scroll! };
  }

  it("adds no refresh control without onRefresh or refreshControl", async () => {
    expect((await screen()).scroll.props.refreshControl).toBeUndefined();
    expect((await screen({ refreshing: true })).scroll.props.refreshControl).toBeUndefined();
  });

  it("builds a RefreshControl tinted with the accent colour", async () => {
    const onRefresh = vi.fn();
    const { scroll } = await screen({ onRefresh, refreshing: true });
    const control = scroll.props.refreshControl as Element;
    expect(control.type).toBe("RefreshControl");
    expect(control.props).toMatchObject({ refreshing: true, tintColor: "#db2777", colors: ["#db2777"] });
    (control.props.onRefresh as () => void)();
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("treats refreshing as controlled: defaults to false, no timer", async () => {
    const control = (await screen({ onRefresh: () => {} })).scroll.props.refreshControl as Element;
    expect(control.props.refreshing).toBe(false);
    const source = read("src/ScreenContainer.tsx");
    expect(source).not.toMatch(/setTimeout|useState|useEffect/);
  });

  it("does not wait on an async onRefresh", async () => {
    const onRefresh = vi.fn(() => new Promise<void>(() => {}));
    const control = (await screen({ onRefresh })).scroll.props.refreshControl as Element;
    expect((control.props.onRefresh as () => void)()).toBeUndefined();
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("lets refreshControl take precedence", async () => {
    const custom = { type: "RefreshControl", props: { refreshing: false, tintColor: "red" } };
    const { scroll } = await screen({ refreshControl: custom, onRefresh: () => {} });
    expect(scroll.props.refreshControl).toBe(custom);
  });

  it("keeps reserveTabBar, footer and the layout", async () => {
    const { tree, scroll } = await screen({ footer: "foot", reserveTabBar: false });
    expect(flatten(scroll.props.contentContainerStyle)).toEqual({ paddingBottom: 40 });
    expect(scroll.props).toMatchObject({ showsVerticalScrollIndicator: false, className: "flex-1" });
    expect(tree.props.className).toBe("flex-1 bg-transparent");
    expect(ofType(scroll, "View").some((view) => view.props.className === "pt-4")).toBe(true);
    const reserved = await screen({ reserveTabBar: true });
    expect(flatten(reserved.scroll.props.contentContainerStyle).paddingBottom).not.toBe(40);
  });
});

describe("SettingsEmptyState", () => {
  it("draws the title, an optional description, icon and action", async () => {
    const { SettingsEmptyState } = await import("../src/settings/SettingsEmptyState");
    const action = { type: "Button", props: {} };
    const full = SettingsEmptyState({ title: "No memories", description: "Add one", action, icon: "Icon" as never, testID: "e" }) as unknown as Element;
    expect(full.props.testID).toBe("e");
    const texts = ofType(full, "Text").map((text) => text.props.children);
    expect(texts).toEqual(["No memories", "Add one"]);
    expect(ofType(full, "Icon")).toHaveLength(1);
    expect(all(full).includes(action as Element)).toBe(true);
    const bare = SettingsEmptyState({ title: "Empty" }) as unknown as Element;
    expect(ofType(bare, "Text")).toHaveLength(1);
    expect(ofType(bare, "Button")).toHaveLength(0);
  });
});

describe("ArtifactList", () => {
  const rows = [
    { id: "a", title: "Report", description: "Q3 summary" },
    { id: "b", title: "Chart" },
  ];

  it("draws a pressable ListRow per row that opens by id", async () => {
    const { ArtifactList } = await import("../src/ArtifactList");
    const onOpen = vi.fn();
    const tree = ArtifactList({ rows, onOpen }) as unknown as Element;
    expect(tree.type).toBe("DividedList");
    const items = ofType(tree, "ListRow");
    expect(items.map((item) => item.props.title)).toEqual(["Report", "Chart"]);
    expect(items[0]!.props.meta).toBe("Q3 summary");
    expect(items[1]!.props.meta).toBeUndefined();
    (items[1]!.props.onPress as () => void)();
    expect(onOpen).toHaveBeenCalledWith("b");
  });

  it("shows empty for no rows, and nothing without it", async () => {
    const { ArtifactList } = await import("../src/ArtifactList");
    const empty = { type: "EmptyState", props: {} };
    expect(ofType(ArtifactList({ rows: [], onOpen: () => {}, empty }), "EmptyState")).toHaveLength(1);
    expect(ArtifactList({ rows: [], onOpen: () => {} })).toBeNull();
  });
});

describe("ChatJumpRail", () => {
  it("draws a Chip per item that jumps by id, and nothing when empty", async () => {
    const { ChatJumpRail } = await import("../src/ai/chat-jump-rail");
    const onJump = vi.fn();
    const rail = ChatJumpRail({ items: [{ id: "m1", label: "First" }, { id: "m2", label: "Second" }], onJump }) as unknown as Element;
    expect(rail.props.horizontal).toBe(true);
    const chips = ofType(rail, "Chip");
    expect(chips.map((chip) => chip.props.label)).toEqual(["First", "Second"]);
    (chips[1]!.props.onPress as () => void)();
    expect(onJump).toHaveBeenCalledWith("m2");
    expect(ChatJumpRail({ items: [], onJump })).toBeNull();
  });
});

describe("0.12.0 entries and peers (source contract)", () => {
  const pkg = JSON.parse(read("package.json"));

  it("adds ./expo-router with RouterStackPageHeader, and keeps expo-router an optional peer", () => {
    expect(pkg.version).toBe("0.14.0");
    expect(pkg.exports["./expo-router"]).toEqual({
      types: "./src/entries/expo-router.ts",
      default: "./src/entries/expo-router.ts",
    });
    expect(pkg.peerDependenciesMeta["expo-router"]).toEqual({ optional: true });
    expect(read("src/entries/expo-router.ts")).toMatch(/RouterStackPageHeader/);
  });

  it("does not re-export RouterStackPageHeader from the root, /layout or /page-title", () => {
    for (const file of ["src/index.ts", "src/entries/layout.ts", "src/entries/page-title.ts", "src/entries/ai.ts"]) {
      expect(read(file), file).not.toMatch(/RouterStackPageHeader|expo-router/);
    }
  });

  it("exports the new pieces from the right entries", () => {
    const layout = read("src/entries/layout.ts");
    const root = read("src/index.ts");
    for (const name of ["PinnedBotTile", "BotPinGrid", "SettingsEmptyState", "ArtifactList", "ScreenContainerProps"]) {
      expect(layout, name).toContain(name);
      expect(root, name).toContain(name);
    }
    const ai = read("src/ai/index.ts");
    for (const name of ["ChatThread", "UIMessage", "ChatJumpRail", "ATTACHMENT_PRESS_TARGET"]) expect(ai, name).toContain(name);
  });

  it("types the auth hrefs as Href and the replace options from useRouter", () => {
    const google = read("src/auth/GoogleSignInButton.tsx");
    expect(google).toMatch(/afterAuthHref\?: Href;/);
    expect(google).toMatch(/replaceOptions\?: Parameters<ReturnType<typeof useRouter>\["replace"\]>\[1\];/);
    // expo-router 57 exports no `Router` type, so no file may import one.
    for (const file of ["src/auth/GoogleSignInButton.tsx", "src/auth/SignInScreen.tsx", "src/router/RouterStackPageHeader.tsx"]) {
      expect(read(file), file).not.toMatch(/type Router\b/);
    }
    const signIn = read("src/auth/SignInScreen.tsx");
    expect(signIn).toMatch(/signUpHref\?: Href;/);
    expect(signIn).toMatch(/signInHref\?: Href;/);
    const peers = read("types/peers.d.ts");
    expect(peers).toMatch(/export type Href = /);
    expect(peers).toMatch(/push\(href: Href/);
    expect(peers).toMatch(/replace\(href: Href/);
    expect(peers).toMatch(/canGoBack\(\): boolean/);
    expect(read("consumer/authHref.consumer.tsx")).toMatch(/withAnchor: true/);
  });
});
