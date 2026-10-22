import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The package is shared by several apps and names none of them: app-specific
// details (such as a state alias) are passed in by the app. This covers the
// source and every shipped text file.
const pkgDir = fileURLToPath(new URL("../..", import.meta.url));
// The distinctive names match anywhere (`__VIBOT_SNAPSHOT__`, `vmemClient`); the
// short ones that are also English words only as whole words.
const APP_NAMES = /(?:vibot|vmem|vhub|velth)|\b(?:eva|verve)\b/i;

function filesUnder(dir: string): string[] {
  return readdirSync(join(pkgDir, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

describe("no app name", () => {
  const files = [
    ...filesUnder("src"),
    ...filesUnder("docs"),
    ...["README.md", "CHANGELOG.md", "package.json"].map((file) => join(pkgDir, file)),
  ];

  it("covers the artifacts module", () => {
    expect(files.some((file) => file.endsWith(join("src", "artifacts", "protocol.ts")))).toBe(true);
    expect(files.some((file) => file.endsWith(join("docs", "artifacts.md")))).toBe(true);
  });

  it.each(files.map((file) => [file.slice(pkgDir.length), file]))("%s", (_name, file) => {
    const lines = readFileSync(file, "utf8").split("\n");
    const hits = lines.flatMap((line, i) => (APP_NAMES.test(line) ? [`${String(i + 1)}: ${line.trim()}`] : []));
    expect(hits).toEqual([]);
  });

  it("the pattern catches app names and spares ordinary words", () => {
    for (const hit of ["window.vibot.state", "__VIBOT_SNAPSHOT__", "vmemClient", "VHUB", "Eva app", "verve", "velthium"]) expect(APP_NAMES.test(hit), hit).toBe(true);
    for (const miss of ["evaluate", "medieval", "Nevada", "reverve", "nerves"]) expect(APP_NAMES.test(miss), miss).toBe(false);
  });
});
