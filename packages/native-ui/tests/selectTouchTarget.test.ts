import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// `SelectItem` (the rows of `Select`) is a 44 point touch target, 56 with larger text.
// The primitive imports React Native, so these checks read the source.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "src/primitives/select.tsx"), "utf8");
const item = source.slice(source.indexOf("const SelectItem = "), source.indexOf("type SelectSeparatorProps"));

describe("SelectItem touch target", () => {
  it("has a 44 point minimum height and vertical padding", () => {
    expect(item).toContain("min-h-[44px]");
    expect(item).toContain("py-3");
  });

  it("steps up to 56 with larger text", () => {
    expect(source).toMatch(/import \{ useLargerText \} from "\.\.\/theme"/);
    expect(item).toContain("useLargerText()");
    expect(item).toMatch(/largerText && "min-h-\[56px\]"/);
  });

  it("keeps the 44 minimum on the Select trigger options path", () => {
    // `Select` renders every option through `SelectItem`, so the rows inherit the target.
    const select = readFileSync(join(root, "src/Select.tsx"), "utf8");
    expect(select).toContain("<SelectItem");
  });
});
