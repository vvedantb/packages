#!/usr/bin/env node
// Rule-level duplication analysis across the five web apps.
// CSS: rule = at-rule context chain + selector + normalised body.
// Config: flattened theme paths from each tailwind.config.ts (loaded with jiti).
// Writes verify/ANALYSIS.md. Usage: node verify/analyze.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APPS, VERIFY_SRC, appDir, ensureScratchDeps, gitHead, loadConfig } from "./lib/env.mjs";
import { entries, parseCss } from "./lib/css.mjs";

ensureScratchDeps();
const names = Object.keys(APPS);

// ---- CSS -----------------------------------------------------------------
const byKey = new Map(); // key -> app -> entry[]
const inputs = [];
for (const app of names) {
  for (const rel of APPS[app].css) {
    const text = readFileSync(join(appDir(app), rel), "utf8");
    inputs.push({ app, rel, lines: text.split("\n").length - (text.endsWith("\n") ? 1 : 0) });
    for (const e of entries(await parseCss(text, rel), rel)) {
      if (e.selector.startsWith("@import") || e.selector.startsWith("@source") || e.selector.startsWith("@config")) continue;
      if (!byKey.has(e.key)) byKey.set(e.key, new Map());
      const m = byKey.get(e.key);
      if (!m.has(app)) m.set(app, []);
      m.get(app).push(e);
    }
  }
}

const span = (e) => e.end - e.start + 1;
const loc = (e) => `${e.start}-${e.end}`;

const shared = [];
for (const [key, m] of byKey) {
  if (m.size < 2) continue;
  const groups = new Map(); // body -> [app]
  for (const [app, list] of m) {
    for (const e of list) {
      if (!groups.has(e.body)) groups.set(e.body, []);
      groups.get(e.body).push({ app, e });
    }
  }
  const best = [...groups.values()].sort((a, b) => b.length - a.length)[0];
  shared.push({ key, apps: [...m.keys()], groups, best, lines: span(best[0].e) });
}
shared.sort((a, b) => b.best.length - a.best.length || b.apps.length - a.apps.length || a.key.localeCompare(b.key));

// Same selector + body, different context (e.g. layered in one app, unlayered in another).
const bySelBody = new Map();
for (const [key, m] of byKey) {
  for (const [app, list] of m) {
    for (const e of list) {
      const k = `${e.selector} {${e.body}}`;
      if (!bySelBody.has(k)) bySelBody.set(k, new Map());
      const ctx = e.ctx.join(" > ") || "(top level)";
      if (!bySelBody.get(k).has(ctx)) bySelBody.get(k).set(ctx, new Set());
      bySelBody.get(k).get(ctx).add(app);
    }
  }
}
const ctxDrift = [...bySelBody].filter(([, ctxs]) => ctxs.size > 1);

// ---- Configs ---------------------------------------------------------------
const configs = {};
for (const app of names) {
  if (APPS[app].config) configs[app] = await loadConfig(join(appDir(app), APPS[app].config));
}
const alphaWrap = /^color-mix\(in oklch, var\((--[\w-]+)\) calc\(<alpha-value> \* 100%\), transparent\)$/;
function flat(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flat(v, p, out);
    else if (typeof v === "function") out[p] = `[function ${v.name || "anonymous"}]`;
    else out[p] = JSON.stringify(v);
  }
  return out;
}
const cfgFlat = {};
for (const [app, c] of Object.entries(configs)) {
  const { content: _content, plugins, ...rest } = c;
  cfgFlat[app] = flat(rest, "", {});
  cfgFlat[app].plugins = JSON.stringify((plugins ?? []).map((p) => p?.name ?? typeof p));
}
const cfgApps = Object.keys(cfgFlat);
const allPaths = [...new Set(cfgApps.flatMap((a) => Object.keys(cfgFlat[a])))].sort();
const cfgRows = allPaths.map((p) => {
  const vals = Object.fromEntries(cfgApps.filter((a) => p in cfgFlat[a]).map((a) => [a, cfgFlat[a][p]]));
  const tokens = Object.fromEntries(
    Object.entries(vals).map(([a, v]) => {
      const m = JSON.parse(v);
      return [a, typeof m === "string" && alphaWrap.test(m) ? JSON.stringify(m.replace(alphaWrap, "var($1)")) : v];
    }),
  );
  const counts = new Map();
  for (const v of Object.values(vals)) counts.set(v, (counts.get(v) ?? 0) + 1);
  const tcounts = new Map();
  for (const v of Object.values(tokens)) tcounts.set(v, (tcounts.get(v) ?? 0) + 1);
  return {
    path: p,
    present: Object.keys(vals),
    identical: Math.max(...counts.values()),
    sameToken: Math.max(...tcounts.values()),
    vals,
  };
});

// Config keyframes/animation vs app-a's CSS @theme counterparts.
const appACss = readFileSync(join(appDir("app-a"), APPS["app-a"].css[0]), "utf8");
const appAKf = new Map();
const appAAnim = new Map();
for (const e of entries(await parseCss(appACss, "app-a"), "app-a")) {
  if (e.selector.startsWith("@keyframes") && e.ctx.join() === "@theme") appAKf.set(e.selector.slice(11), e.body);
  if (e.selector === "@theme") {
    for (const d of e.node.nodes.filter((n) => n.type === "decl" && n.prop.startsWith("--animate-"))) {
      appAAnim.set(d.prop.slice(10), d.value);
    }
  }
}
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
async function kfToCss(name, frames) {
  const text = `@keyframes ${name} {${Object.entries(frames)
    .map(([sel, decls]) => `${sel} {${Object.entries(decls).map(([k, v]) => `${kebab(k)}: ${v};`).join("")}}`)
    .join("")}}`;
  return entries(await parseCss(text, "cfg"), "cfg")[0].body;
}
const cross = [];
for (const [name, body] of appAKf) {
  const row = { name, appAAnim: appAAnim.get(name), apps: {} };
  for (const [app, c] of Object.entries(configs)) {
    const kf = c.theme?.extend?.keyframes?.[name];
    const an = c.theme?.extend?.animation?.[name];
    row.apps[app] = kf ? `${(await kfToCss(name, kf)) === body ? "kf=" : "kf≠"} ${an === row.appAAnim ? "anim=" : "anim≠"}` : "-";
  }
  cross.push(row);
}

// ---- Report ----------------------------------------------------------------
const md = [];
md.push("# Duplication analysis (generated by `verify/analyze.mjs`)", "");
md.push(
  "Rule = at-rule context chain + selector + body (comments stripped, whitespace collapsed). Line numbers are 1-based in each clone's current HEAD. Regenerate with `node verify/analyze.mjs`.",
  "",
);
md.push("## Inputs", "", "| App | File | Lines | HEAD |", "| --- | --- | --- | --- |");
for (const i of inputs) md.push(`| ${i.app} | \`${i.rel}\` | ${i.lines} | \`${gitHead(i.app).slice(0, 12)}\` |`);
for (const [app] of Object.entries(configs)) {
  const t = readFileSync(join(appDir(app), APPS[app].config), "utf8");
  md.push(`| ${app} | \`${APPS[app].config}\` | ${t.split("\n").length - 1} | \`${gitHead(app).slice(0, 12)}\` |`);
}

md.push("", "## CSS rules present in 2+ apps", "");
md.push(
  "`identical` = apps whose body matches the most common body. `drift` = apps with the same context + selector but another body. Lines = source lines of one copy.",
  "",
  "| Context | Selector | Lines | Identical | Drift |",
  "| --- | --- | --- | --- | --- |",
);
for (const s of shared) {
  const [ctx, sel] = s.key.split(" | ");
  const ident = s.best.map((x) => `${x.app}:${loc(x.e)}`).join(", ");
  const drift = [...s.groups.values()]
    .filter((g) => g !== s.best)
    .flat()
    .map((x) => `${x.app}:${loc(x.e)}`)
    .join(", ");
  md.push(`| ${ctx || "(top level)"} | \`${sel.replace(/\|/g, "\\|").slice(0, 110)}\` | ${s.lines} | ${s.best.length} (${ident}) | ${drift || "-"} |`);
}

md.push("", "### Drift detail (same context + selector in 3+ apps, bodies differ)", "");
for (const s of shared.filter((x) => x.apps.length >= 3 && x.groups.size > 1)) {
  md.push(`- \`${s.key.replace(/\n/g, " ").slice(0, 140)}\``);
  for (const [body, list] of s.groups) md.push(`  - ${list.map((x) => x.app).join(", ")}: \`${body.slice(0, 220)}\``);
}

md.push("", "### Same selector + body in a different context", "");
for (const [k, ctxs] of ctxDrift) {
  md.push(`- \`${k.replace(/\n/g, " ").slice(0, 120)}\`: ${[...ctxs].map(([c, a]) => `${[...a].join("/")} in \`${c}\``).join("; ")}`);
}

md.push("", "## tailwind.config.ts (app-b, app-c, app-d)", "");
md.push(
  "Paths are flattened from the evaluated config (`content` omitted). `same token` treats app-c's `color-mix(in oklch, var(--x) calc(<alpha-value> * 100%), transparent)` wrapper as `var(--x)`.",
  "",
  "| Path | Present | Identical | Same token | Values |",
  "| --- | --- | --- | --- | --- |",
);
for (const r of cfgRows) {
  const vals = Object.entries(r.vals)
    .map(([a, v]) => `${a}=${v.length > 60 ? `${v.slice(0, 57)}...` : v}`)
    .join("<br>")
    .replace(/\|/g, "\\|");
  md.push(`| \`${r.path}\` | ${r.present.join(", ")} | ${r.identical} | ${r.sameToken} | ${r.identical === r.present.length && r.present.length === 3 ? "(all equal)" : vals} |`);
}
const cfg3 = cfgRows.filter((r) => r.identical === 3);
const cfg3Token = cfgRows.filter((r) => r.identical < 3 && r.sameToken === 3);
md.push("", `Summary: ${cfgRows.length} paths; ${cfg3.length} identical in all three configs; ${cfg3Token.length} more identical once app-c's alpha wrapper is ignored.`);

md.push("", "### Config keyframes/animation vs app-a `@theme` (CSS-first)", "");
md.push("| Name | app-a `--animate-*` | " + Object.keys(configs).join(" | ") + " |", "| --- | --- | " + Object.keys(configs).map(() => "---").join(" | ") + " |");
for (const r of cross) md.push(`| ${r.name} | \`${r.appAAnim}\` | ${Object.values(r.apps).join(" | ")} |`);

writeFileSync(join(VERIFY_SRC, "ANALYSIS.tables.md"), md.join("\n") + "\n");
console.log(`wrote ${join(VERIFY_SRC, "ANALYSIS.tables.md")} (${shared.length} shared CSS keys, ${cfgRows.length} config paths)`);
