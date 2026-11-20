import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { findSourceTextReads, runCheckNoSourceText } from "../src/check-no-source-text.js";
import { runCheckSharedUi } from "../src/check-shared-ui.js";

// Built from parts so the repo lint that bans source-text reads in tests does not flag these samples.
const READ = "readFile" + "Sync";
const RAW = "?" + "raw";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vvedantb-check-shared-ui-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(path: string, content: string): void {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), content);
}

function run(check: typeof runCheckSharedUi, argv: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = check(argv, { log: (m) => out.push(m), error: (m) => err.push(m), cwd: () => dir });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

const GOOD_FOOTER = `import { SiteFooter } from "@vvedantb/ui";\nexport const F = () => <SiteFooter />;\n`;
const GOOD_PAGE = `import { SiteHeader } from "@vvedantb/ui";\nexport const P = () => <SiteHeader />;\n`;

describe("runCheckSharedUi", () => {
  it("passes a clean app", () => {
    write("apps/web/src/Footer.tsx", GOOD_FOOTER);
    write("apps/web/src/Landing.tsx", GOOD_PAGE);
    const result = run(runCheckSharedUi, ["--header-page", "apps/web/src/Landing.tsx"]);
    expect(result.code).toBe(0);
    expect(result.out).toContain("1 footer files, 1 header pages");
  });

  it("flags a bare social link, an AppWordmark size and a local footer", () => {
    write("apps/web/src/SiteFooter.tsx", `import { SiteFooter } from "@vvedantb/ui";\nconst a = "https://x.com/";\nconst b = <AppWordmark size={3} />;\nconst c = <SiteFooter />;\n`);
    write("apps/web/src/LocalFooter.tsx", `export const F = () => <footer />;\n`);
    const result = run(runCheckSharedUi, []);
    expect(result.code).toBe(1);
    expect(result.err).toContain("SiteFooter.tsx: bare social root href");
    expect(result.err).toContain("SiteFooter.tsx: AppWordmark size prop");
    expect(result.err).toContain("LocalFooter.tsx: must render SiteFooter or LandingFooter from @vvedantb/ui");
  });

  it("allows a social link with a path and skips excluded and test files", () => {
    write("apps/web/src/Footer.tsx", `${GOOD_FOOTER}const a = "https://x.com/example";\n`);
    write("apps/web/src/sidebar/SidebarFooter.tsx", `export const F = () => <footer />;\n`);
    write("apps/web/src/Footer.test.tsx", `const a = "https://x.com/";\n`);
    expect(run(runCheckSharedUi, ["--footer-exclude", "sidebar"]).code).toBe(0);
  });

  it("holds --footer-scan-dir files to the banned patterns only", () => {
    write("apps/mobile/MobileFooter.tsx", `export const F = () => <footer />;\n`);
    expect(run(runCheckSharedUi, ["--footer-dir", "apps/web", "--footer-scan-dir", "apps/mobile"]).code).toBe(0);
    write("apps/mobile/MobileFooter.tsx", `const a = "https://linkedin.com";\n`);
    expect(run(runCheckSharedUi, ["--footer-dir", "apps/web", "--footer-scan-dir", "apps/mobile"]).code).toBe(1);
  });

  it("flags a header page without the shared header and a local landing nav", () => {
    write("apps/web/src/Landing.tsx", `export const P = () => <nav />;\n`);
    write("apps/web/src/LandingNavMenu.tsx", `export const N = () => <nav />;\n`);
    const result = run(runCheckSharedUi, ["--header-page", "apps/web/src/Landing.tsx", "--header-page", "apps/web/src/Missing.tsx"]);
    expect(result.code).toBe(1);
    expect(result.err).toContain("Landing.tsx: must render SiteHeader from @vvedantb/ui");
    expect(result.err).toContain("Missing.tsx: header page not found");
    expect(result.err).toContain("LandingNavMenu.tsx: local landing navigation is not allowed");
  });

  it("returns 2 for an unknown option", () => {
    expect(run(runCheckSharedUi, ["--nope", "x"]).code).toBe(2);
  });
});

describe("runCheckNoSourceText", () => {
  // The samples are strings handed to the checker; this file reads no source text itself.
  it("finds source reads and honours the allow comment", () => {
    const sample = [
      `import x from "./a.css${RAW}";`,
      `const a = ${READ}(join(srcDir, "x"));`,
      `// allow-source-read: transpile step`,
      `const b = ${READ}("src/x.ts");`,
      `const c = ${READ}("fixture.json");`,
    ].join("\n");
    expect(findSourceTextReads(sample).map((v) => v.line)).toEqual([1, 2]);
  });

  it("scans test files and skips node_modules", () => {
    write("a/x.test.ts", `${READ}("src/y.ts");\n`);
    write("node_modules/p/z.test.ts", `${READ}("src/y.ts");\n`);
    const bad = run(runCheckNoSourceText, []);
    expect(bad.code).toBe(1);
    expect(bad.err).toContain("a/x.test.ts:1");
    expect(bad.err).not.toContain("node_modules");
    expect(run(runCheckNoSourceText, ["--skip-file", "x.test.ts"]).code).toBe(0);
  });
});
