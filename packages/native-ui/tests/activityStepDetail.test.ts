import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// `ActivityStepDetail` (`/ai`): the web tool-step body. Source checks against the web file.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = readFileSync(join(root, "..", "ui", "src", "ai-elements", "activity-step-detail.tsx"), "utf8");
const native = readFileSync(join(root, "src", "ai", "activity-step-detail.tsx"), "utf8");
const highlight = readFileSync(join(root, "src", "highlight.ts"), "utf8");

describe("ActivityStepDetail", () => {
  it("builds the web shell transcript: `$ command`, a blank line, then the output", () => {
    expect(web).toMatch(/command \? `\$ \$\{command\}` : null, step\.output\?\.text \?\? null/);
    expect(native).toMatch(/command \? `\$ \$\{command\}` : null, step\.output\?\.text \?\? null/);
    expect(native).toMatch(/\.join\("\\n\\n"\)/);
    expect(native).toMatch(/step\.command \?\? \(step\.type === "bash" \? step\.detail : undefined\)/);
  });

  it("shows the web badges, loading text and red/green edit blocks", () => {
    expect(web).toMatch(/Exit code \{step\.output\.exitCode\}/);
    expect(native).toMatch(/`Exit code \$\{exitCode\}`/);
    for (const source of [web, native]) {
      expect(source).toMatch(/Truncated/);
      expect(source).toMatch(/Loading output\.\.\./);
    }
    expect(web).toMatch(/bg-destructive\/10/);
    expect(web).toMatch(/bg-emerald-500\/10/);
    expect(native).toMatch(/withAlpha\(palette\.danger\[scheme\], 0\.1\)/);
    expect(native).toMatch(/withAlpha\(EMERALD\.fill, 0\.1\)/);
  });
});

describe("loadPrismReactRenderer", () => {
  it("returns null, not undefined, so the real peer types check (`?? null`)", () => {
    expect(highlight).toMatch(/return prismReactRenderer \?\? null;/);
  });
});
