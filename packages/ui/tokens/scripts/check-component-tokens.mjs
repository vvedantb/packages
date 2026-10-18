// Fails when package components read colour names that clash with shadcn:
// `text-muted`, accent-as-brand utilities, or raw `var(--<colour>)` reads.
// Components must use `text-muted-foreground`, `primary` and `--color-*`.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const dirs = ["src", "app/src", "shell/src"];
const exts = /\.(ts|tsx|css)$/;
const skip = /\.(test|spec)\.|\/__tests__\//;

const UTIL = "(?:bg|text|border|ring|from|to|via|outline|fill|stroke|shadow|divide|decoration|caret|accent)";
const rules = [
  { re: /(?<![\w-])text-muted(?![\w-])/g, msg: "use text-muted-foreground" },
  { re: new RegExp(`(?<![\\w-])${UTIL}-accent(?:-foreground)?(?![\\w-])`, "g"), msg: "use the primary equivalent" },
  {
    // A raw read is allowed only as the fallback of a --color-* read, for apps
    // that use the preset without tokens.css (no --color-* variables).
    re: /(?<!var\(--color-[\w-]+,\s*)var\(--(?:muted|accent|accent-foreground|overlay|overlay-foreground|foreground|background|border|surface|surface-foreground)\)/g,
    msg: "read var(--color-*) instead of the raw variable",
    tsOnly: true,
  },
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (exts.test(p) && !skip.test(p)) yield p;
  }
}

// One intentional compat default: the InputArea ghost text class must be the
// bare `text-muted` of the original app composer. Allowed only in that file,
// and only on a line that carries the marker comment.
const ALLOW_MARKER = "check-tokens-allow: text-muted";
const ALLOW_FILE = "src/composer/input-area/InputArea.tsx";

const hits = [];
for (const d of dirs) {
  for (const file of walk(join(root, d))) {
    const isTs = /\.tsx?$/.test(file);
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      for (const r of rules) {
        if (r.tsOnly && !isTs) continue;
        if (r.msg === "use text-muted-foreground" && line.includes(ALLOW_MARKER) && relative(root, file) === ALLOW_FILE) continue;
        for (const m of line.matchAll(r.re)) hits.push(`${relative(root, file)}:${i + 1}: ${m[0]} (${r.msg})`);
      }
    });
  }
}

if (hits.length) {
  console.error(`@vvedantb/ui: ${hits.length} colliding colour name(s) in components:\n${hits.join("\n")}`);
  process.exit(1);
}
console.log("@vvedantb/ui: component colour names clean");
