import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { select: (o: { default: string }) => o.default } }));

// `AgentTraceFold` and `MessageMeta` (`/ai`): the settled-turn fold of the web
// `ActivityTasks` (folded mode) and the clock after a message's actions.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = readFileSync(join(root, "..", "ui", "src", "ai-elements", "activity-tasks.tsx"), "utf8");
const trace = readFileSync(join(root, "src", "ai", "trace.tsx"), "utf8");
const message = readFileSync(join(root, "src", "ai", "message.tsx"), "utf8");

describe("AgentTraceFold", () => {
  it("reads \"Worked for …\" over the web hairline (border-b pb-1.5), closed by default", () => {
    expect(web).toMatch(/<div className="border-b border-border pb-1\.5">/);
    expect(web).toMatch(/`Worked for \$\{duration\}`/);
    expect(trace).toMatch(/const elapsed = duration \?\? formatElapsed\(seconds \?\? 0\);/);
    expect(trace).toMatch(/`Worked for \$\{elapsed\}`/);
    expect(trace).toMatch(/borderBottomWidth: 1, borderBottomColor: tokens\.color\.border\[scheme\], paddingBottom: 6/);
    expect(trace).toMatch(/defaultOpen = false/);
    expect(trace).toMatch(/<AgentTrace className="mt-2">\{children\}<\/AgentTrace>/);
  });

  it("formats the duration as the web formatActivityElapsed", async () => {
    const { formatElapsed } = await import("../src/ai/chat-text");
    expect(formatElapsed(42)).toBe("42s");
    expect(formatElapsed(60)).toBe("1m");
    expect(formatElapsed(65)).toBe("1m 5s");
  });
});

describe("MessageMeta", () => {
  it("is the caption size in the muted colour at 60%, with tabular figures", () => {
    expect(message).toMatch(/export function MessageMeta/);
    expect(message).toMatch(/color: withAlpha\(tokens\.color\.muted\[scheme\], 0\.6\), fontVariant: \["tabular-nums"\]/);
    expect(message).toMatch(/chatTextSize\("caption", largerText\)/);
  });
});

describe("PromptInput layout=\"inline\"", () => {
  const composer = readFileSync(join(root, "..", "ui", "src", "composer", "Composer.tsx"), "utf8");
  const input = readFileSync(join(root, "src", "ai", "prompt-input.tsx"), "utf8");

  it("is the web Composer inline row: rounded-[1.25rem], p-1.5, leading, field, toolbar, send", () => {
    expect(composer).toMatch(/rounded-\[1\.25rem\]/);
    expect(composer).toMatch(/data-slot="composer-row" className="flex min-w-0 items-end gap-1 p-1\.5"/);
    expect(input).toMatch(/const INLINE_RADIUS = 20;/);
    expect(input).toMatch(/className=\{cn\("flex-row items-end gap-1", !pill && "p-1\.5"\)\}/);
    expect(input).toMatch(/layout = "stacked"/);
    expect(input).toMatch(/shape = "rounded"/);
    expect(input.indexOf("{leading}")).toBeLessThan(input.indexOf('"flex-1 border-0 text-sm font-instrument-sans"'));
  });
});
