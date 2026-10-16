#!/usr/bin/env node
// Builds each app's stylesheet before and after its migration spec and proves
// the compiled CSS is the same (modulo the documented --tokens-* parameters).
//
//   node verify/run.mjs [app ...]      (default: all five)
//   APPS_DIR=/path/to/clones VERIFY_DIR=/tmp/scratch node verify/run.mjs
//
// Writes verify/RESULTS.md and examples/migration.md (only on a full run).
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { APPS, PKG_DIR, REPO_DIR, SCRATCH_DEPS, VERIFY_DIR, VERIFY_SRC, appDir, ensureScratchDeps, gitHead, loadConfig, tailwindBin } from "./lib/env.mjs";
import { IMPORT_PREFIX, migrateCss, migrateText } from "./lib/migrate.mjs";
import { cascadeCheck, compare, flatten, normValue } from "./lib/diff.mjs";

const only = process.argv.slice(2);
const names = only.length ? only : Object.keys(APPS);
const LOCAL = { ui: "ui" };
const SKIP_DIRS = new Set(["node_modules", "dist", ".turbo", ".vercel", "test-results", "playwright-report", ".vite"]);

ensureScratchDeps();

function lockVersions(app) {
  const lock = readFileSync(join(appDir(app), "pnpm-lock.yaml"), "utf8");
  const grab = (name) => [...new Set([...lock.matchAll(new RegExp(`^  '?${name.replace("/", "\\/")}@(4\\.[0-9.]+)`, "gm"))].map((m) => m[1]))];
  return { tailwindcss: grab("tailwindcss"), node: grab("@tailwindcss/node") };
}

function prepare(app, side) {
  const root = join(VERIFY_DIR, "work", app, side);
  rmSync(root, { recursive: true, force: true });
  const src = appDir(app);
  for (const rel of ["apps/web", ...(APPS[app].extra ?? [])]) {
    cpSync(join(src, rel), join(root, rel), {
      recursive: true,
      filter: (p) => !SKIP_DIRS.has(basename(p)),
    });
  }
  // Same @vvedantb packages (this worktree) on both sides, at both hoisted and
  // per-app node_modules locations the stylesheets' @source lines point at.
  for (const nm of [join(root, "node_modules"), join(root, "apps/web/node_modules")]) {
    mkdirSync(join(nm, "@vvedantb"), { recursive: true });
    for (const [name, dir] of Object.entries(LOCAL)) symlinkSync(join(REPO_DIR, "packages", dir), join(nm, "@vvedantb", name));
  }
  return root;
}

function build(root, app, side) {
  const cwd = join(root, "apps/web");
  const input = join(root, APPS[app].css[0]);
  const out = join(VERIFY_DIR, "work", app, `${side}.css`);
  const r = spawnSync(tailwindBin(), ["-i", input, "-o", out, "--optimize"], { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${app} ${side} build failed:\n${r.stderr}`);
  return readFileSync(out, "utf8");
}

function numstat(a, b) {
  const r = spawnSync("git", ["diff", "--no-index", "--numstat", a, b], { encoding: "utf8" });
  const [added = "0", deleted = "0"] = r.stdout.trim().split(/\s+/);
  return { added: Number(added), deleted: Number(deleted) };
}

function unifiedPatch(a, b, rel) {
  const r = spawnSync("diff", ["-u", "--label", `a/${rel}`, "--label", `b/${rel}`, a, b], { encoding: "utf8" });
  return r.stdout;
}

const TEXT = /\.(tsx?|jsx?|mjs|cjs|mdx?|html|json|css|ya?ml|txt|svg)$/;
function scanText(dir, skip) {
  if (!existsSync(dir)) return "";
  let out = "";
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (p === skip || SKIP_DIRS.has(e.name)) continue;
    if (e.isDirectory()) out += scanText(p, skip);
    else if (TEXT.test(e.name) && statSync(p).size < 4e6) out += `\n${readFileSync(p, "utf8")}`;
  }
  return out;
}

// Structural check of a config migration: preset deep-merged under the app's
// `theme.extend` must give exactly the paths the original config had.
function flat(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj ?? {})) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flat(v, p, out);
    else out[p] = typeof v === "function" ? `[function ${v.name}]` : JSON.stringify(v);
  }
  return out;
}
function deepMerge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over ?? {})) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object" ? deepMerge(out[k], v) : v;
  }
  return out;
}
function configDiff(before, after) {
  const { presets = [], ...rest } = after;
  let theme = {};
  let top = {};
  for (const p of presets) {
    const { theme: pt = {}, ...pr } = p;
    top = { ...top, ...pr };
    theme = deepMerge(theme, pt);
  }
  const mergedCfg = { ...top, ...rest, theme: deepMerge(theme, rest.theme) };
  const norm = (c) => {
    const { content: _c, plugins, ...r } = c;
    return { ...flat(r), plugins: JSON.stringify((plugins ?? []).map((x) => x?.name ?? typeof x)) };
  };
  const a = norm(before);
  const b = norm(mergedCfg);
  const diffs = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) diffs.push(`${k}: ${a[k] ?? "(none)"} -> ${b[k] ?? "(none)"}`);
  return diffs;
}

const results = [];
let failed = false;
mkdirSync(join(VERIFY_DIR, "patches"), { recursive: true });

for (const app of names) {
  const spec = JSON.parse(readFileSync(join(VERIFY_SRC, "migrations", `${app}.json`), "utf8"));
  const head = gitHead(app);
  const res = { app, head, spec, files: [], notes: [], lock: lockVersions(app) };
  results.push(res);
  console.log(`\n== ${app} @ ${head.slice(0, 12)}`);
  if (head !== spec.verifiedAt) res.notes.push(`clone HEAD ${head.slice(0, 12)} differs from spec.verifiedAt ${spec.verifiedAt.slice(0, 12)}; spec still matched by rule body`);

  const before = prepare(app, "before");
  const after = prepare(app, "after");
  const params = {};
  let patch = "";
  try {
    for (const [rel, section] of Object.entries(spec.css)) {
      Object.assign(params, section.params?.values ?? {});
      const text = readFileSync(join(before, rel), "utf8");
      const r = await migrateCss(text, rel, section, section.params?.values ?? {});
      writeFileSync(join(after, rel), r.text);
      res.files.push({ rel, kind: "css", ...r, ...numstat(join(before, rel), join(after, rel)) });
      patch += unifiedPatch(join(before, rel), join(after, rel), rel);
    }
    if (spec.config) {
      const rel = spec.config.file;
      const r = migrateText(readFileSync(join(before, rel), "utf8"), rel, spec.config.edits);
      writeFileSync(join(after, rel), r.text);
      res.files.push({ rel, kind: "config", report: r.report, ...numstat(join(before, rel), join(after, rel)) });
      patch += unifiedPatch(join(before, rel), join(after, rel), rel);
      res.configDiff = configDiff(await loadConfig(join(before, rel)), await loadConfig(join(after, rel)));
    }
  } catch (e) {
    res.error = e.message;
    failed = true;
    console.error(`  migration failed: ${e.message}`);
    continue;
  }
  writeFileSync(join(VERIFY_DIR, "patches", `${app}.patch`), patch);

  const cssBefore = build(before, app, "before");
  const cssAfter = build(after, app, "after");
  const fb = await flatten(cssBefore, {});
  const fa = await flatten(cssAfter, params);
  const ignore = new Set(Object.keys(params));
  const cmp = compare(fb, fa, ignore);
  const casc = cascadeCheck(fb, fa, ignore);
  // warnings must be acknowledged in the spec (`cascadeReviewed`), with a reason
  const reviewed = spec.cascadeReviewed ?? [];
  casc.reviewed = [];
  casc.warns = casc.warns.filter((w) => {
    const r = reviewed.find((x) => x.keys.every((k) => w.includes(k)));
    if (r) casc.reviewed.push({ warning: w, why: r.why });
    return !r;
  });
  const unusedReviews = reviewed.filter((x) => !casc.reviewed.some((c) => x.keys.every((k) => c.warning.includes(k))));
  for (const u of unusedReviews) res.notes.push(`cascadeReviewed entry no longer needed: ${u.keys.join(" <-> ")}`);

  // the parameter lines must reach the output with the spec's values
  const rootDecls = new Map();
  for (const it of fa.items) if (it.sel === ":root" && !it.ctx.length) for (const [p, v] of it.decls) rootDecls.set(p, v);
  const paramMissing = Object.entries(params).filter(([p, v]) => rootDecls.get(p) !== normValue(v));

  // Utilities that disappear only because their class name was in the deleted
  // config text (Tailwind scans tailwind.config.ts, not node_modules/preset).
  cmp.explained = [];
  if (spec.config) {
    const cfgRel = spec.config.file;
    const deletedText = res.files.find((f) => f.rel === cfgRel).report.map((e) => e.find).join("\n");
    const others = scanText(join(before, "apps/web"), join(before, cfgRel)) +
      scanText(join(before, "packages"), "") +
      ["ui/src", "ui/shell/src", "ui/app/src"].map((d) => scanText(join(REPO_DIR, "packages", d), "")).join("");
    const word = (w) => new RegExp(`(^|[^\\w-])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\w-]|$)`, "m");
    const deadVars = new Set();
    cmp.removed = cmp.removed.filter((x) => {
      const m = /^@layer utilities \| \.([\w-]+) \{(.*)\}$/.exec(x);
      if (!m || !word(m[1]).test(deletedText) || word(m[1]).test(others)) return true;
      for (const v of m[2].matchAll(/var\((--[\w-]+)\)/g)) deadVars.add(v[1]);
      cmp.explained.push(`${x}: class \`${m[1]}\` occurs only in the deleted config lines, in no other scanned file`);
      return false;
    });
    cmp.changed = cmp.changed.filter((x) => {
      const [key, ...lines] = x.split("\n").map((l) => l.trim());
      if (!/^@layer theme \| (:root|:host)$/.test(key)) return true;
      const ok = lines.every((l) => {
        const m = /^(--[\w-]+): .* -> \(none\)$/.exec(l);
        return m && deadVars.has(m[1]);
      });
      if (ok) cmp.explained.push(`${key}: ${lines.join("; ")} (theme variable only referenced by the utility above)`);
      return !ok;
    });
  }

  res.build = { rulesBefore: fb.rawRules, rulesAfter: fa.rawRules, itemsBefore: fb.items.length, itemsAfter: fa.items.length, cmp, casc, paramMissing };
  res.ok = !cmp.removed.length && !cmp.added.length && !cmp.changed.length && !casc.fails.length && !casc.warns.length && !paramMissing.length && !(res.configDiff ?? []).length;
  if (!res.ok) failed = true;

  const lines = res.files.reduce((s, f) => ({ added: s.added + f.added, deleted: s.deleted + f.deleted }), { added: 0, deleted: 0 });
  res.lines = lines;
  console.log(`  rules (compiled, per raw rule) before ${fb.rawRules} after ${fa.rawRules}; keys identical ${cmp.identical}, removed ${cmp.removed.length}, added ${cmp.added.length}, changed ${cmp.changed.length}`);
  for (const x of cmp.removed) console.log(`    - removed ${x}`);
  for (const x of cmp.added) console.log(`    + added ${x}`);
  for (const x of cmp.changed) console.log(`    ~ changed ${x}`);
  for (const x of cmp.explained) console.log(`    = explained ${x}`);
  console.log(`  cascade: ${casc.fails.length} failures, ${casc.warns.length} unreviewed warnings, ${casc.reviewed.length} reviewed`);
  for (const x of casc.fails) console.log(`    ! ${x}`);
  for (const x of casc.warns) console.log(`    ? unreviewed ${x}`);
  for (const x of casc.reviewed) console.log(`    = reviewed ${x.warning}`);
  for (const [p] of paramMissing) console.log(`    ! parameter ${p} not in compiled :root`);
  for (const x of res.configDiff ?? []) console.log(`    ! config ${x}`);
  console.log(`  source lines: -${lines.deleted} +${lines.added} (net ${lines.added - lines.deleted})`);
  console.log(`  ${res.ok ? "OK" : "FAIL"}`);
}

if (names.length === Object.keys(APPS).length) {
  writeFileSync(join(VERIFY_SRC, "RESULTS.md"), resultsMd(results));
  writeFileSync(join(PKG_DIR, "examples", "migration.md"), migrationMd(results));
  console.log(`\nwrote ${relative(REPO_DIR, join(VERIFY_SRC, "RESULTS.md"))} and ${relative(REPO_DIR, join(PKG_DIR, "examples", "migration.md"))}; patches in ${join(VERIFY_DIR, "patches")}`);
}
process.exit(failed ? 1 : 0);

// ---- reports -------------------------------------------------------------------

function totals(rs) {
  return rs.reduce((s, r) => ({ deleted: s.deleted + (r.lines?.deleted ?? 0), added: s.added + (r.lines?.added ?? 0) }), { deleted: 0, added: 0 });
}

function sharedFiles(spec) {
  const files = new Set();
  for (const section of Object.values(spec.css)) for (const i of section.imports ?? []) files.add(i.file);
  if (spec.config) files.add("tailwind-preset");
  return [...files];
}

function resultsMd(rs) {
  const t = totals(rs);
  const md = [];
  md.push("# Verification results (generated by `verify/run.mjs`)", "");
  md.push(
    "Each app's stylesheet inputs were copied from its clone, built with the Tailwind v4 CLI (`--optimize`) before and after applying `verify/migrations/<app>.json`, and the outputs compared semantically (rules split per selector, keyed by at-rule context + selector, declarations merged last-wins, `--tokens-*` parameters inlined). Order flips between competing rules are checked separately.",
    "",
  );
  md.push(`Scratch toolchain: ${Object.entries(SCRATCH_DEPS).map(([k, v]) => `\`${k}@${v}\``).join(", ")}.`, "");
  md.push("| App | HEAD | Lockfile tailwindcss / @tailwindcss/node | Compiled rules before / after | Keys identical | Removed / added / changed | Cascade fails / unreviewed / reviewed | Source lines deleted | Added | Net | Result |");
  md.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const r of rs) {
    const b = r.build;
    md.push(
      `| ${r.app} | \`${r.head.slice(0, 12)}\` | ${r.lock.tailwindcss.join("/")} / ${r.lock.node.join("/")} | ${b ? `${b.rulesBefore} / ${b.rulesAfter}` : "-"} | ${b?.cmp.identical ?? "-"} | ${b ? `${b.cmp.removed.length} / ${b.cmp.added.length} / ${b.cmp.changed.length}` : "-"} | ${b ? `${b.casc.fails.length} / ${b.casc.warns.length} / ${b.casc.reviewed.length}` : "-"} | ${r.lines?.deleted ?? "-"} | ${r.lines?.added ?? "-"} | ${r.lines ? r.lines.added - r.lines.deleted : "-"} | ${r.error ? `FAIL: ${r.error}` : r.ok ? "identical" : "FAIL"} |`,
    );
  }
  md.push(`| **Total** | | | | | | | **${t.deleted}** | **${t.added}** | **${t.added - t.deleted}** | |`, "");
  md.push("\"Compiled rules\" counts style rules in the optimised output; after migration a rule can split in two (e.g. a trimmed `html` rule) without changing any key.", "");
  md.push("## Details", "");
  for (const r of rs) {
    md.push(`### ${r.app}`, "");
    md.push(`Shared files: ${sharedFiles(r.spec).map((f) => `\`${f}\``).join(", ")}.`, "");
    for (const n of r.notes) md.push(`- Note: ${n}`);
    for (const f of r.files) md.push(`- \`${f.rel}\`: -${f.deleted} +${f.added}`);
    if (r.configDiff) md.push(`- Config structural check (preset merged under \`theme.extend\` vs original): ${r.configDiff.length ? r.configDiff.join("; ") : "same paths and values"}.`);
    for (const x of r.build?.cmp.explained ?? []) md.push(`- Explained difference: \`${x.replace(/\s+/g, " ")}\``);
    for (const w of r.build?.casc.reviewed ?? []) md.push(`- Reviewed order change: \`${w.warning}\`. ${w.why}`);
    for (const w of r.build?.casc.warns ?? []) md.push(`- Unreviewed order change: \`${w}\``);
    for (const x of [...(r.build?.cmp.removed ?? []), ...(r.build?.cmp.added ?? []), ...(r.build?.cmp.changed ?? []), ...(r.build?.casc.fails ?? [])]) md.push(`- Difference: \`${x.replace(/\s+/g, " ")}\``);
    md.push("");
  }
  md.push(...readFileSync(join(VERIFY_SRC, "CAVEATS.md"), "utf8").split("\n"));
  return md.join("\n").replace(/\n+$/, "\n");
}

function migrationMd(rs) {
  const t = totals(rs);
  const md = [];
  md.push("# Migrating the apps to `@vvedantb/ui/tokens` 0.2.0 shared CSS", "");
  md.push(
    "Generated by `pnpm --filter @vvedantb/ui verify` from `verify/migrations/<app>.json`; do not edit by hand. Line numbers refer to each clone's HEAD shown below. Line counts come from `git diff --numstat` of the original and migrated files. The harness also writes a ready-to-apply `<app>.patch` (paths relative to the app repo root) to `$VERIFY_DIR/patches/`.",
    "",
    "Bump the app's `@vvedantb/ui/tokens` dependency to `^0.2.0` first (app-d: add it). Removed blocks include the comment directly above them. `@layer` / `@media` / `@supports` wrappers left empty are removed with their comment; the line ranges below list the blocks themselves, the patch has every line.",
    "",
  );
  md.push("## Totals", "", "| App | HEAD | Shared files | Deleted | Added | Net | Verified |", "| --- | --- | --- | --- | --- | --- | --- |");
  for (const r of rs) md.push(`| ${r.app} | \`${r.head.slice(0, 12)}\` | ${sharedFiles(r.spec).join(", ")} | ${r.lines?.deleted ?? "-"} | ${r.lines?.added ?? "-"} | ${r.lines ? r.lines.added - r.lines.deleted : "-"} | ${r.ok ? "identical CSS" : "FAIL"} |`);
  md.push(`| **Total** | | | **${t.deleted}** | **${t.added}** | **${t.added - t.deleted}** | |`, "");
  const pkgLines = readdirSync(join(PKG_DIR, "src/css"))
    .map((f) => join("src/css", f))
    .concat(["src/tailwind-preset.mjs", "src/tailwind-preset.d.mts"])
    .map((f) => [f, readFileSync(join(PKG_DIR, f), "utf8").split("\n").length - 1]);
  const pkgTotal = pkgLines.reduce((n, [, l]) => n + l, 0);
  md.push(
    `Package side: the shared files total ${pkgTotal} lines (${pkgLines.map(([f, l]) => `\`${f.replace("src/", "")}\` ${l}`).join(", ")}), comments included. Net across apps + package: ${t.added - t.deleted + pkgTotal}.`,
    "",
  );
  md.push(
    `The duplication report (R3) estimated about 1,917 removable repo-side lines for CSS + Tailwind theme. This migration removes ${t.deleted} lines and adds ${t.added} (net ${t.added - t.deleted}). The gap is real, not rounding: R3 counted rule blocks shared by only 2 apps, near-identical blocks that drift in values or selectors, app-a/app-e \`landing.css\` (a separate, byte-identical 271-line file) and per-app theme colour blocks. Those stay app-local here because moving them would change at least one app's compiled CSS or would serve fewer than 3 apps (see \`verify/ANALYSIS.md\`, "Not extracted").`,
    "",
  );
  for (const r of rs) {
    md.push(`## ${r.app}`, "", `Clone HEAD \`${r.head}\`. Shared files: ${sharedFiles(r.spec).map((f) => `\`${f}\``).join(", ")}.`, "");
    for (const f of r.files) {
      md.push(`### \`${f.rel}\` (-${f.deleted} +${f.added})`, "");
      if (f.kind === "css") {
        md.push("Add (each `@import` replaces the block at that position):", "", "```css");
        for (const i of f.inserts) {
          const where = i.side === "split" ? `after original line ${i.line}; close the enclosing block before it and reopen it after` : `${i.side} original line ${i.line}`;
          md.push(`${i.text} /* ${where} */`);
        }
        md.push("```", "");
        if (f.added.length) {
          md.push("Parameters, appended to the existing rule:", "", "```css");
          for (const a of f.added) md.push(`/* ${a.into.replace(/^ \| /, "")} (line ${a.line}) */ ${a.text}`);
          md.push("```", "");
        }
        md.push("Delete:", "", "| Lines | Context | Selector | Replaced by |", "| --- | --- | --- | --- |");
        const rows = [
          ...f.removals.map((x) => ({ l: x.lines, key: x.key, via: x.via })),
          ...f.trims.map((x) => ({ l: [Math.min(...x.lines), Math.max(...x.lines)], key: `${x.key} (declarations ${x.props.join(", ")} only)`, via: x.via })),
        ].sort((a, b) => a.l[0] - b.l[0]);
        for (const x of rows) {
          const [ctx, sel] = x.key.split(" | ");
          md.push(`| ${x.l[0]}-${x.l[1]} | ${ctx || "(top level)"} | \`${sel.replace(/\|/g, "\\|")}\` | \`${x.via === "tokens.css" ? "@vvedantb/ui/tokens (already imported)" : IMPORT_PREFIX + x.via}\` |`);
        }
        md.push("");
      } else {
        md.push("Edits (original lines -> replacement):", "");
        for (const e of f.report) {
          md.push(`- Lines ${e.lines[0]}-${e.lines[1]}${e.replace ? " become:" : ": delete."}`);
          if (e.replace) md.push("", "  ```ts", ...e.replace.replace(/\n$/, "").split("\n").map((l) => `  ${l}`), "  ```");
        }
        md.push("");
      }
    }
  }
  return md.join("\n").replace(/\n+$/, "\n");
}
