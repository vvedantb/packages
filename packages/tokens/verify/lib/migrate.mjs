// Applies a verify/migrations/<app>.json spec to an app stylesheet / config.
// Every removed block must equal (CSS) the block of the same context +
// selector in the shared file it is replaced by, so a wrong match fails.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PKG_DIR } from "./env.mjs";
import { atLabel, ctxOf, loadPostcss, norm, parseCss } from "./css.mjs";

export const IMPORT_PREFIX = "@vvedantb/tokens/css/";

export function sharedPath(via) {
  return via === "tokens.css" ? join(PKG_DIR, "src/tokens.css") : join(PKG_DIR, "src/css", via);
}

export function keyOf(node) {
  const label = node.type === "rule" ? norm(node.selector) : atLabel(node);
  return `${ctxOf(node).join(" > ")} | ${label}`;
}

// Canonical text of a node (comments dropped, whitespace normalised).
export function canon(node) {
  if (node.type === "comment") return null;
  if (node.type === "decl") return `${node.prop}: ${norm(node.value)}${node.important ? " !important" : ""}`;
  const kids = (node.nodes ?? []).map(canon).filter(Boolean).join("; ");
  if (node.type === "rule") return `${norm(node.selector)} {${kids}}`;
  return node.nodes ? `${atLabel(node)} {${kids}}` : `${atLabel(node)};`;
}

// Declaration items of a rule; `@apply a b` counts as items `@apply a`, `@apply b`.
function items(node) {
  const out = [];
  for (const c of node.nodes ?? []) {
    if (c.type === "decl") out.push(canon(c));
    else if (c.type === "atrule" && c.name === "apply") for (const cls of c.params.split(/\s+/)) out.push(`@apply ${cls}`);
    else if (c.type !== "comment") out.push(canon(c));
  }
  return out;
}

/** Replaces `var(--tokens-x, fallback)` with the app's value or the fallback. */
export function resolveParams(text, params) {
  let out = "";
  let i = 0;
  for (;;) {
    const at = text.indexOf("var(--tokens-", i);
    if (at < 0) return out + text.slice(i);
    out += text.slice(i, at);
    let depth = 0;
    let j = at + 3;
    for (; j < text.length; j++) {
      if (text[j] === "(") depth++;
      else if (text[j] === ")" && --depth === 0) break;
    }
    const inner = text.slice(at + 4, j);
    const comma = inner.indexOf(",");
    const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
    const fallback = comma < 0 ? "" : inner.slice(comma + 1).trim();
    out += name in params ? norm(params[name]) : resolveParams(fallback, params);
    i = j + 1;
  }
}

function index(root) {
  const map = new Map();
  root.walk((n) => {
    if (n.type === "decl" || n.type === "comment") return;
    const k = keyOf(n);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(n);
  });
  return map;
}

function only(map, key, where) {
  const list = map.get(key) ?? [];
  if (list.length !== 1) throw new Error(`${where}: expected exactly one \`${key}\`, found ${list.length}`);
  return list[0];
}

function attachedComment(node) {
  const prev = node.prev();
  return prev?.type === "comment" && !/\n\s*\n/.test(node.raws.before ?? "") ? prev : null;
}

function topLevel(node) {
  let n = node;
  while (n.parent?.type !== "root") n = n.parent;
  return n;
}

const startLine = (n) => (attachedComment(n) ?? n).source.start.line;

/**
 * Applies one CSS file section of a spec. Returns the migrated text plus a
 * report of what was removed / inserted (with original line numbers).
 */
export async function migrateCss(text, file, section, params = {}) {
  const postcss = await loadPostcss();
  const root = await parseCss(text, file);
  const appIdx = index(root);
  const sharedIdx = new Map();
  const shared = async (via) => {
    if (!sharedIdx.has(via)) sharedIdx.set(via, index(await parseCss(readFileSync(sharedPath(via), "utf8"), via)));
    return sharedIdx.get(via);
  };

  const removals = []; // { node, via, key, lines }
  const trims = []; // { node, props, via, key, lines }
  for (const r of section.remove ?? []) {
    const sIdx = await shared(r.via);
    for (const key of r.keys ?? []) {
      const node = only(appIdx, key, `${file} (app)`);
      const ref = only(sIdx, key, `${r.via} (shared)`);
      if (r.via === "tokens.css") {
        const have = new Set(items(ref));
        const extra = items(node).filter((x) => !have.has(x));
        if (extra.length) throw new Error(`${file}: \`${key}\` is not covered by tokens.css: ${extra.join("; ")}`);
      } else {
        const want = resolveParams(canon(ref), params);
        if (canon(node) !== want) {
          throw new Error(`${file}: \`${key}\` differs from ${r.via}\n  app:    ${canon(node)}\n  shared: ${want}`);
        }
      }
      removals.push({ node, via: r.via, key, lines: [startLine(node), node.source.end.line] });
    }
    for (const [key, props] of Object.entries(r.trim ?? {})) {
      const node = only(appIdx, key, `${file} (app)`);
      const ref = only(sIdx, key, `${r.via} (shared)`);
      const refDecls = ref.nodes.filter((d) => d.type === "decl");
      // tokens.css trims may be a subset (the app rule also keeps its own variables)
      if (r.via !== "tokens.css" && refDecls.map((d) => d.prop).join() !== props.join()) {
        throw new Error(`${r.via}: \`${key}\` declares ${refDecls.map((d) => d.prop).join(", ")}, spec trims ${props.join(", ")}`);
      }
      const decls = props.map((p) => {
        const found = node.nodes.filter((d) => d.type === "decl" && d.prop === p);
        if (found.length !== 1) throw new Error(`${file}: \`${key}\` has ${found.length} \`${p}\` declarations`);
        const ref1 = refDecls.find((d) => d.prop === p);
        if (!ref1) throw new Error(`${r.via}: \`${key}\` has no \`${p}\``);
        const want = resolveParams(canon(ref1), params);
        if (canon(found[0]) !== want) throw new Error(`${file}: \`${key}\` ${p} differs: ${canon(found[0])} vs ${want}`);
        return found[0];
      });
      trims.push({
        node,
        decls,
        via: r.via,
        key,
        props,
        lines: decls.map((d) => d.source.start.line),
      });
    }
  }

  // Insert imports before touching the tree, anchored on the original nodes.
  const inserts = [];
  for (const imp of section.imports ?? []) {
    if (imp.split) {
      // close the top-level block after `split`, import, then reopen it
      const at = only(appIdx, imp.split, `${file} (split)`);
      const block = at.parent;
      if (block.parent?.type !== "root") throw new Error(`${file}: split point \`${imp.split}\` is not a direct child of a top-level block`);
      const prev = inserts.at(-1);
      const node = postcss.atRule({ name: "import", params: `"${IMPORT_PREFIX}${imp.file}"`, raws: { afterName: " " } });
      if (prev?.split === at) {
        node.raws.before = "\n";
        prev.node.after(node);
      } else {
        const rest = [];
        for (let n = at.next(); n; n = n.next()) rest.push(n);
        node.raws.before = "\n\n";
        block.after(node);
        if (rest.length) {
          const block2 = block.clone({ nodes: [] });
          block2.raws.before = "\n\n";
          for (const n of rest) block2.append(n);
          node.after(block2);
        }
      }
      inserts.push({ node, split: at, file: imp.file, line: at.source.end.line, side: "split", text: `@import "${IMPORT_PREFIX}${imp.file}";` });
      continue;
    }
    const anchorNode = topLevel(only(appIdx, imp.before ?? imp.after, `${file} (anchor)`));
    const anchor = imp.after ? anchorNode : (attachedComment(anchorNode) ?? anchorNode);
    const node = postcss.atRule({ name: "import", params: `"${IMPORT_PREFIX}${imp.file}"` });
    const prevInsert = inserts.at(-1);
    const chained = prevInsert && prevInsert.anchor === anchor && prevInsert.side === (imp.after ? "after" : "before");
    node.raws.before = chained ? "\n" : imp.after || /\n/.test(anchor.raws.before ?? "") ? "\n\n" : "";
    node.raws.afterName = " ";
    if (chained) prevInsert.node.after(node);
    else if (imp.after) anchor.after(node);
    else anchor.before(node);
    inserts.push({
      node,
      anchor,
      side: imp.after ? "after" : "before",
      file: imp.file,
      line: imp.after ? anchor.source.end.line : anchor.source.start.line,
      text: `@import "${IMPORT_PREFIX}${imp.file}";`,
    });
  }
  // the first node after an inserted run keeps a blank line before it
  for (const ins of inserts) {
    const next = ins.node.next();
    if (next && !inserts.some((x) => x.node === next) && !/\n\s*\n/.test(next.raws.before ?? "")) next.raws.before = "\n\n";
  }

  // Parameter lines on an existing rule (e.g. the app's :root).
  const added = [];
  if (section.params) {
    const target = only(appIdx, section.params.into, `${file} (params)`);
    for (const [prop, value] of Object.entries(section.params.values)) {
      const last = target.nodes.filter((n) => n.type === "decl").at(-1);
      const decl = postcss.decl({ prop, value, raws: { before: last?.raws.before ?? "\n  " } });
      target.append(decl);
      added.push({ text: `${prop}: ${value};`, line: target.source.start.line, into: section.params.into });
    }
  }

  for (const t of trims) for (const d of t.decls) remove(d);
  for (const r of removals) remove(r.node);

  // a container whose last child is now a declaration needs its semicolon
  root.walk((n) => {
    if (n.nodes && n.last?.type === "decl") n.raws.semicolon = true;
  });
  return { text: root.toString(), removals, trims, inserts, added };
}

function isEmpty(node) {
  return !(node.nodes ?? []).some((c) => c.type !== "comment");
}

function remove(node) {
  if (!node.parent) return;
  const parent = node.parent;
  const comment = attachedComment(node);
  for (const n of comment ? [comment, node] : [node]) {
    const next = n.next();
    if (!n.prev() && next) next.raws.before = n.raws.before;
    n.remove();
  }
  if (parent.type !== "root" && isEmpty(parent)) remove(parent);
}

/** Text edits for a TS config: each `find` must occur exactly once. */
export function migrateText(text, file, edits) {
  let out = text;
  const report = [];
  for (const e of edits) {
    const at = out.indexOf(e.find);
    if (at < 0 || out.indexOf(e.find, at + 1) >= 0) {
      throw new Error(`${file}: edit "${e.find.split("\n")[0].trim()}..." must match exactly once`);
    }
    const origAt = text.indexOf(e.find);
    const line = text.slice(0, origAt).split("\n").length;
    report.push({ ...e, lines: [line, line + e.find.replace(/\n$/, "").split("\n").length - 1] });
    out = out.slice(0, at) + e.replace + out.slice(at + e.find.length);
  }
  return { text: out, report };
}
