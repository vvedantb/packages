// Rule-level view of a stylesheet: every leaf block keyed by its at-rule
// context chain + selector, with a normalised body for equality checks.
import { scratchImport } from "./env.mjs";

let postcss;
export async function loadPostcss() {
  postcss ??= (await scratchImport("postcss")).default;
  return postcss;
}

export function norm(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([(),{};])\s*/g, "$1")
    .replace(/,/g, ", ")
    .trim();
}

export function atLabel(node) {
  return `@${node.name}${node.params ? ` ${norm(node.params)}` : ""}`;
}

// Parent chain of a node, outermost first ("@layer base", "@media ...", or a
// parent selector for nested rules).
export function ctxOf(node) {
  const out = [];
  for (let p = node.parent; p && p.type !== "root"; p = p.parent) {
    out.unshift(p.type === "atrule" ? atLabel(p) : norm(p.selector));
  }
  return out;
}

function bodyOf(node) {
  const parts = [];
  for (const c of node.nodes ?? []) {
    if (c.type === "decl") parts.push(`${c.prop}: ${norm(c.value)}${c.important ? " !important" : ""}`);
    else if (c.type === "atrule" && !c.nodes) parts.push(atLabel(c));
  }
  return parts.join("; ");
}

function hasOwnBody(node) {
  return (node.nodes ?? []).some((c) => c.type === "decl" || (c.type === "atrule" && !c.nodes));
}

/**
 * Leaf entries: rules (and at-rules such as @utility) with their own
 * declarations, plus whole @keyframes / @property / @custom-variant blocks.
 */
export function entries(root, file) {
  const out = [];
  const opaque = (n) => n.type === "atrule" && ["keyframes", "property"].includes(n.name);
  root.walk((node) => {
    for (let p = node.parent; p; p = p.parent) if (opaque(p)) return;
    if (opaque(node)) {
      const inner = (node.nodes ?? []).map((n) => n.toString()).join(" ");
      out.push(entry(node, file, `@${node.name} ${norm(node.params)}`, norm(inner)));
      return;
    }
    if (node.type === "atrule" && !node.nodes && node.parent?.type === "root") {
      // top-level statements (@import, @config, @plugin, @custom-variant ...)
      out.push(entry(node, file, atLabel(node), ""));
      return;
    }
    if (node.type === "rule" && hasOwnBody(node)) {
      out.push(entry(node, file, norm(node.selector), bodyOf(node)));
    } else if (node.type === "atrule" && node.nodes && hasOwnBody(node) && node.name !== "theme") {
      out.push(entry(node, file, "", bodyOf(node), [...ctxOf(node), atLabel(node)]));
    } else if (node.type === "atrule" && node.name === "theme") {
      out.push(entry(node, file, "@theme", bodyOf(node)));
    }
  });
  return out;
}

function entry(node, file, selector, body, ctx = ctxOf(node)) {
  return {
    file,
    ctx,
    selector,
    body,
    key: `${ctx.join(" > ")} | ${selector}`,
    start: node.source?.start?.line,
    end: node.source?.end?.line,
    node,
  };
}

export async function parseCss(text, from) {
  const pc = await loadPostcss();
  return pc.parse(text, { from });
}
