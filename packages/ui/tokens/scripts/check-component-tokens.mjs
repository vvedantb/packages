// Fails when package components read colour names that clash with shadcn:
// `text-muted`, accent-as-brand utilities, fill-type `muted` (`bg-muted`,
// `border-muted`, …), or raw `var(--<colour>)` reads. Components must use
// `text-muted-foreground`, `primary`, `surface-secondary` and `--color-*`.
// The package CSS (tokens/src/css and any .css under src) is also checked for
// fill-type `--muted` reads; there the fill is `var(--color-surface-secondary)`.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const dirs = ["src", "app/src", "shell/src", "tokens/src/css"];
const exts = /\.(ts|tsx|css)$/;
const skip = /\.(test|spec)\.|\/__tests__\//;

const UTIL = "(?:bg|text|border|ring|from|to|via|outline|fill|stroke|shadow|divide|decoration|caret|accent)";
const rules = [
  { re: /(?<![\w-])text-muted(?![\w-])/g, msg: "use text-muted-foreground", allow: "check-tokens-allow: text-muted" },
  { re: new RegExp(`(?<![\\w-])${UTIL}-accent(?:-foreground)?(?![\\w-])`, "g"), msg: "use the primary equivalent", allow: "check-tokens-allow: accent" },
  {
    // A raw read is allowed only as the fallback of a --color-* read, for apps
    // that use the preset without tokens.css (no --color-* variables).
    re: /(?<!var\(--color-[\w-]+,\s*)var\(--(?:muted|accent|accent-foreground|overlay|overlay-foreground|foreground|background|border|surface|surface-foreground)\)/g,
    msg: "read var(--color-*) instead of the raw variable",
    tsOnly: true,
  },
  {
    // `muted` is a text colour in tokens.css and a fill in shadcn; under
    // compat-shadcn-rgb.css `surface-secondary` is the same fill. Variants
    // (`dark:`, `hover:`) and opacity (`/40`) included; `*-muted-foreground` is not.
    re: /(?<![\w-])(?:bg|from|via|to|fill|stroke|border|ring|divide|outline)-muted(?:\/[\w.[\]]+)?(?![\w-])/g,
    msg: "use the surface-secondary equivalent",
    allow: "check-tokens-allow: muted",
    files: new Set([
      // Fills kept on purpose: the stronger dark-mode Switch off
      // state, the Slider track and thumb, the slash menu row hover.
      "src/ui/switch.tsx",
      "src/ui/slider.tsx",
      "src/composer/input-area/ComposerSlashMenu.tsx",
    ]),
  },
  {
    // CSS fills (backgrounds, fills, strokes, border and outline colours,
    // shadows and `--*-bg` / `--*-surface` style variables) that read `--muted`
    // or `--color-muted`. `--muted-foreground` is text and is not matched, and
    // `--color-*` definitions (the compat mapping itself) are not fills.
    re: /(?:background(?:-color)?|fill|stroke|border(?:-(?:top|right|bottom|left|block|inline))?(?:-color)?|outline(?:-color)?|box-shadow|--(?!color-)[\w-]*(?:bg|background|fill|surface)[\w-]*)\s*:[^;]*\bvar\(--(?:color-)?muted\)/g,
    msg: "fill with var(--color-surface-secondary)",
    allow: "check-tokens-allow: muted",
    cssOnly: true,
    files: new Set([]),
  },
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (exts.test(p) && !skip.test(p)) yield p;
  }
}

// Intentional compat classes that must match the original app markup: the
// InputArea ghost text, the Button `flat` variant, the CommandDialog "auto"
// list layout, the app shell classes and the landing kit, site footer and
// pricing dialog classes use the bare `text-muted` (and the
// shell rail badge uses `accent`). Allowed only in these files, and only on a
// line that carries the rule's marker comment.
const ALLOW_FILES = new Set([
  "src/composer/input-area/InputArea.tsx",
  "src/ui/button.tsx",
  "src/ui/command.tsx",
  "shell/src/app-shell-classes.ts",
  "src/marketing/marketing-classes.ts",
]);

const hits = [];
for (const d of dirs) {
  for (const file of walk(join(root, d))) {
    const isTs = /\.tsx?$/.test(file);
    const isCss = file.endsWith(".css");
    // The token stylesheets hold CSS, not class lists: only the CSS rule applies.
    const tokensCss = relative(root, file).startsWith("tokens/");
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      for (const r of rules) {
        if (r.tsOnly && !isTs) continue;
        if (r.cssOnly ? !isCss : tokensCss) continue;
        if (r.allow && line.includes(r.allow) && (r.files ?? ALLOW_FILES).has(relative(root, file))) continue;
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
