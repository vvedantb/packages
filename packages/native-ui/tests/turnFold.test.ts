import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { select: (o: { default: string }) => o.default } }));

describe("AgentTraceFold", () => {

  it("formats the duration as the web formatActivityElapsed", async () => {
    const { formatElapsed } = await import("../src/ai/chat-text");
    expect(formatElapsed(42)).toBe("42s");
    expect(formatElapsed(60)).toBe("1m");
    expect(formatElapsed(65)).toBe("1m 5s");
  });
});
