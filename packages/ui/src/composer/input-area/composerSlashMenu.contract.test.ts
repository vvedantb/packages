import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));

function read(name: string) {
  return readFileSync(join(dir, name), "utf8");
}

test("composer slash popup keeps its panel chrome", () => {
  const menu = read("ComposerSlashMenu.tsx");
  expect(menu).toContain("smooth-shadow-ring-lg");
  expect(menu).toContain("origin-bottom");
  expect(menu).toContain("bg-primary/15");
  expect(menu).toContain("max-sm:py-2.5");
  expect(menu).toContain('role="listbox"');
});

test("composer textarea opens the slash menu from /", () => {
  const core = read("InputArea.tsx");
  expect(core).toContain("data-composer-slash-anchor");
  expect(core).toContain("ComposerSlashMenu");
  expect(core).toContain("useComposerSlashMenu");
  expect(core).toContain("onRemoveLastChip");
  expect(core).toContain("Backspace");
});

test("the package carries no app brand names", () => {
  for (const name of [
    "InputArea.tsx",
    "InputActions.tsx",
    "InputBanners.tsx",
    "ComposerSlashMenu.tsx",
    "ConnectionStatusMenuItem.tsx",
  ]) {
    expect(read(name)).not.toMatch(/vmem|vibot|verve|velth|vhub|\beva\b/i);
  }
});
