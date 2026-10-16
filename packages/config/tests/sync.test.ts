import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCli } from "../src/run.js";
import { CLAUDE_INSTALL_SNIPPET, ENVIRONMENT_INSTALL, parseJsonc } from "../src/sync.js";
import { versions } from "../src/versions.js";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vvedantb-config-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function cli(...args: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = runCli([...args, "--cwd", dir], {
    log: (m) => out.push(m),
    error: (m) => err.push(m),
    cwd: () => process.cwd(),
  });
  return { code, out, err };
}

const read = (rel: string) => readFileSync(join(dir, rel), "utf8");
const write = (rel: string, content: string) => {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), content);
};

describe("sync", () => {
  it("writes the managed files in an empty repo", () => {
    expect(cli("sync").code).toBe(0);
    for (const name of ["stage", "changelog", "push", "ship"]) {
      expect(existsSync(join(dir, `.claude/commands/${name}.md`))).toBe(true);
    }
    expect(read("CLAUDE.md")).toContain("FOLLOW ALL OF THESE RULES");
    expect(JSON.parse(read(".cursor/environment.json"))).toEqual({
      name: "app",
      install: ENVIRONMENT_INSTALL,
    });
    expect(existsSync(join(dir, "convex/tsconfig.json"))).toBe(false);
  });

  it("is idempotent: a second run changes nothing and --check passes", () => {
    cli("sync");
    const second = cli("sync");
    expect(second.out).toEqual(["Already in sync."]);
    expect(cli("sync", "--check").code).toBe(0);
  });

  it("--check exits 1 on an empty repo and writes nothing", () => {
    const result = cli("sync", "--check");
    expect(result.code).toBe(1);
    expect(result.err.join("\n")).toContain(".claude/commands/stage.md");
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(false);
  });

  it("--check exits 1 after a command file is edited, and sync restores it", () => {
    cli("sync");
    write(".claude/commands/ship.md", "custom\n");
    const result = cli("sync", "--check");
    expect(result.code).toBe(1);
    expect(result.err.join("\n")).toContain(".claude/commands/ship.md");
    cli("sync");
    expect(read(".claude/commands/ship.md")).not.toBe("custom\n");
    expect(cli("sync", "--check").code).toBe(0);
  });

  it("keeps custom Product facts and adds only missing headings", () => {
    write(
      "CLAUDE.md",
      "FOLLOW ALL OF THESE RULES\n\n## Always\n- mine\n\n## Product facts\n- We sell widgets.\n- Prices in GBP.\n",
    );
    cli("sync");
    const text = read("CLAUDE.md");
    expect(text).toContain("- We sell widgets.\n- Prices in GBP.");
    expect(text).toContain("- mine");
    expect(text).toContain("## Git / ship");
    expect(text).toContain("## Domain docs (read when relevant)");
    expect(text.match(/## Product facts/g)).toHaveLength(1);
    expect(text.match(/## Always/g)).toHaveLength(1);
    expect(cli("sync", "--check").code).toBe(0);
  });

  it("does not flag CLAUDE.md when all headings exist with different bodies", () => {
    cli("sync");
    write(
      "CLAUDE.md",
      "x\n## Git / ship\n## Always\n## Domain docs (read when relevant)\n## Product facts\ncustom",
    );
    expect(cli("sync", "--check").code).toBe(0);
  });

  describe("environment.json", () => {
    it("merges install and keeps other keys", () => {
      write(
        ".cursor/environment.json",
        JSON.stringify({ name: "mine", install: "yarn", start: "pnpm dev", terminals: [] }),
      );
      cli("sync");
      const env = JSON.parse(read(".cursor/environment.json"));
      expect(env.name).toBe("mine");
      expect(env.start).toBe("pnpm dev");
      expect(env.terminals).toEqual([]);
      expect(env.install).toBe(`${CLAUDE_INSTALL_SNIPPET}; yarn; pnpm install`);
      expect(cli("sync", "--check").code).toBe(0);
    });

    it("leaves a compliant install alone", () => {
      const install = `${CLAUDE_INSTALL_SNIPPET}; pnpm install && pnpm build`;
      write(".cursor/environment.json", JSON.stringify({ install }));
      expect(cli("sync", "--check").err.join("\n")).not.toContain("environment.json");
      cli("sync");
      expect(JSON.parse(read(".cursor/environment.json")).install).toBe(install);
    });

    it("reports invalid JSON and exits 2", () => {
      write(".cursor/environment.json", "{ nope");
      const result = cli("sync");
      expect(result.code).toBe(2);
      expect(result.err.join("\n")).toContain("invalid JSON");
    });
  });

  describe("convex tsconfig", () => {
    it("creates one in convex/", () => {
      mkdirSync(join(dir, "convex"));
      cli("sync");
      expect(JSON.parse(read("convex/tsconfig.json"))).toEqual({
        extends: "@vvedantb/config/tsconfig/convex.json",
        include: ["./**/*"],
        exclude: ["./_generated"],
      });
    });

    it("prefers packages/backend/convex when present", () => {
      mkdirSync(join(dir, "packages/backend/convex"), { recursive: true });
      cli("sync");
      expect(existsSync(join(dir, "packages/backend/convex/tsconfig.json"))).toBe(true);
      expect(existsSync(join(dir, "convex/tsconfig.json"))).toBe(false);
    });

    it("updates extends in place and keeps include/exclude and options", () => {
      write(
        "convex/tsconfig.json",
        `{
  // generated by convex
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "allowJs": true, },
  "include": ["./**/*"],
  "exclude": ["./_generated", "**/*.test.ts"],
}`,
      );
      cli("sync");
      expect(JSON.parse(read("convex/tsconfig.json"))).toEqual({
        extends: "@vvedantb/config/tsconfig/convex.json",
        compilerOptions: { allowJs: true },
        include: ["./**/*"],
        exclude: ["./_generated", "**/*.test.ts"],
      });
      expect(cli("sync", "--check").code).toBe(0);
    });
  });

  it("rejects unknown commands and options", () => {
    expect(runCli(["nope"], { log: () => {}, error: () => {}, cwd: () => dir })).toBe(2);
    expect(cli("sync", "--wat").code).toBe(2);
  });
});

describe("parseJsonc", () => {
  it("keeps comment-like text inside strings", () => {
    expect(parseJsonc('{ "a": "// not a comment", /* c */ "b": [1,], }')).toEqual({
      a: "// not a comment",
      b: [1],
    });
  });
});

describe("package files", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");

  it("ships tsconfig bases that extend the shared base", () => {
    for (const name of ["web", "convex", "react-native"]) {
      const json = parseJsonc(readFileSync(join(root, `tsconfig/${name}.json`), "utf8"));
      expect(json).toMatchObject({ extends: "./base.json" });
    }
    expect(parseJsonc(readFileSync(join(root, "tsconfig/convex.json"), "utf8"))).toMatchObject({
      compilerOptions: { moduleResolution: "Bundler", noEmit: true, types: ["node"] },
    });
  });

  it("ships a generic oxlint base without app plugins", () => {
    const text = readFileSync(join(root, "oxlint/base.json"), "utf8");
    expect(text).not.toContain("app-a");
    expect(JSON.parse(text)).toMatchObject({
      plugins: ["typescript", "import", "unicorn", "react"],
      categories: { suspicious: "error" },
    });
  });

  it("exports pinned versions", () => {
    expect(versions.typescript).toBe("^5.9.0");
    expect(versions.node.apps).toBe(">=20");
  });
});

describe("built CLI", () => {
  const cliPath = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "cli.js");
  it.skipIf(!existsSync(cliPath))("runs under node with a shebang", () => {
    expect(readFileSync(cliPath, "utf8").startsWith("#!/usr/bin/env node\n")).toBe(true);
    const run = (...args: string[]) =>
      spawnSync(process.execPath, [cliPath, "sync", ...args, "--cwd", dir], { encoding: "utf8" });
    expect(run("--check").status).toBe(1);
    expect(run().status).toBe(0);
    expect(run("--check").status).toBe(0);
  });
});
