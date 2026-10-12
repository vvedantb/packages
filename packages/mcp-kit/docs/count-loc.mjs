#!/usr/bin/env node
// Reproduce the LOC table in docs/migration.md.
//
//   node packages/mcp-kit/docs/count-loc.mjs /workspace/cvx
//
// Counts physical lines (blank and comment lines included, like `wc -l`).
// "removable" = lines of the listed files or blocks in each app today.
// "remains"   = lines of the replacement in docs/migrated/<app>/ (the code
//               the app keeps or adds after migrating).
// Blocks are found by a start pattern and end where (), {} and [] balance
// again at the end of a line; strings and comments are skipped.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2];
if (!root) {
  console.error("usage: count-loc.mjs <apps-root containing vmem, vibot, verve, velth, vhub>");
  process.exit(1);
}
const here = dirname(fileURLToPath(import.meta.url));
const lines = (text) => text.replace(/\n$/, "").split("\n").length;
const migrated = (path) => lines(readFileSync(join(here, "migrated", path), "utf8"));

function blockEnd(src, startLine) {
  let depth = 0;
  let opened = false;
  for (let i = startLine; i < src.length; i++) {
    const line = src[i];
    let quote = null;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (quote) {
        if (c === "\\") j++;
        else if (c === quote) quote = null;
        continue;
      }
      if (c === "/" && line[j + 1] === "/") break;
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if ("({[".includes(c)) { depth++; opened = true; }
      else if (")}]".includes(c)) depth--;
    }
    // Template literals may span lines: keep scanning inside them.
    if (quote === "`") {
      let k = i + 1;
      for (; k < src.length && !src[k].includes("`"); k++);
      src = [...src.slice(0, i + 1), ...src.slice(i + 1, k).map(() => ""), src[k].slice(src[k].indexOf("`") + 1), ...src.slice(k + 1)];
      continue;
    }
    if (opened && depth === 0) return i;
  }
  throw new Error(`unbalanced block from line ${startLine + 1}`);
}

function findBlock(src, selector) {
  const isTool = selector.tool !== undefined;
  for (let i = 0; i < src.length; i++) {
    const hit = isTool
      ? /server\.(tool|registerTool)\(/.test(src[i]) &&
        `${src[i]}\n${src[i + 1] ?? ""}`.includes(`"${selector.tool}"`)
      : selector.start.test(src[i]);
    if (hit) {
      // Include directly preceding comment lines that belong to the block.
      let first = i;
      while (first > 0 && /^\s*\/\//.test(src[first - 1])) first--;
      return { from: first + 1, to: blockEnd(src, i) + 1 };
    }
  }
  throw new Error(`block not found: ${selector.tool ?? selector.start}`);
}

const tool = (name) => ({ tool: name, label: `tool ${name}` });
const decl = (name, re) => ({ start: re, label: name });

const PLAN = {
  vmem: [
    { phase: 1, file: "convex/mcp/native.ts", whole: true, remains: ["vmem/native.ts"] },
    { phase: 1, file: "convex/mcp/nodeActions.ts", blocks: [decl("handleMcpRequest", /^export const handleMcpRequest = /)], remains: ["vmem/nodeActions.handleMcpRequest.ts"] },
  ],
  vibot: [
    { phase: 1, file: "convex/mcp/native.ts", whole: true, remains: ["vibot/native.ts"] },
    { phase: 1, file: "convex/mcp/nodeActions.ts", blocks: [decl("handleMcpRequest", /^export const handleMcpRequest = /)], remains: ["vibot/nodeActions.handleMcpRequest.ts"] },
    { phase: 1, file: "convex/mcp/toolShared.ts", blocks: [decl("TextContent", /^type TextContent = /), decl("textContent", /^function textContent\(/), decl("errorResult", /^export function errorResult\(/), decl("textResult", /^export function textResult\(/)], remains: ["vibot/toolShared.resultHelpers.ts"] },
    { phase: 2, file: "convex/mcp/tools.ts", blocks: ["list_tables", "query_table", "get_document", "count_table", "run_query"].map(tool), remains: ["vibot/tools.explorer.ts"] },
  ],
  verve: [
    { phase: 1, file: "convex/mcp/native.ts", whole: true, remains: ["verve/native.ts"] },
    { phase: 1, file: "convex/mcp/nodeActions.ts", blocks: [decl("handleMcpRequest", /^export const handleMcpRequest = /)], remains: ["verve/nodeActions.handleMcpRequest.ts"] },
    { phase: 1, file: "convex/mcp/tools.ts", blocks: [decl("textResult", /^function textResult\(/), decl("errorResult", /^function errorResult\(/)], remains: ["verve/tools.resultHelpers.ts"] },
    { phase: 2, file: "convex/mcp/tools.ts", blocks: ["list_tables", "query_table", "get_document", "run_query", "count_table"].map(tool), remains: ["verve/tools.explorer.ts"] },
  ],
  velth: [
    { phase: 1, file: "convex/mcp/native.ts", whole: true, remains: ["velth/native.ts"] },
    { phase: 1, file: "convex/mcp/nodeActions.ts", blocks: [decl("handleMcpRequest", /^export const handleMcpRequest = /)], remains: ["velth/nodeActions.handleMcpRequest.ts"] },
    { phase: 1, file: "convex/mcp/toolResult.ts", whole: true, remains: ["velth/toolResult.ts"] },
    {
      phase: 2,
      file: "convex/mcp/tools.ts",
      blocks: [
        decl("filterValueSchema", /^const filterValueSchema = /),
        decl("queryTableSchema", /^const queryTableSchema = /),
        decl("countTableSchema", /^const countTableSchema = /),
        decl("getDocumentSchema", /^const getDocumentSchema = /),
        decl("runQuerySchema", /^const runQuerySchema = /),
        ...["list_tables", "query_table", "count_table", "get_document", "run_query"].map(tool),
      ],
      remains: ["velth/tools.explorer.ts"],
    },
  ],
  vhub: [
    {
      phase: 1,
      file: "convex/mcp/native.ts",
      blocks: [
        decl("optionsHandler", /^export const optionsHandler = /),
        decl("oauthMetadata", /^export const oauthMetadata = /),
        decl("protectedResourceMetadata", /^export const protectedResourceMetadata = /),
        decl("health", /^export const health = /),
      ],
      remains: ["vhub/native.partial.ts"],
    },
  ],
};

const rows = [];
for (const [app, units] of Object.entries(PLAN)) {
  for (const unit of units) {
    const path = join(root, app, "packages/backend", unit.file);
    const src = readFileSync(path, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
    const now = src.length;
    let removable = 0;
    const detail = [];
    if (unit.whole) {
      removable = now;
      detail.push(`whole file 1-${now}`);
    } else {
      for (const selector of unit.blocks) {
        const { from, to } = findBlock(src, selector);
        removable += to - from + 1;
        detail.push(`${selector.label} ${from}-${to}`);
      }
    }
    const remains = unit.remains.reduce((sum, file) => sum + migrated(file), 0);
    rows.push({ app, phase: unit.phase, file: unit.file, now, removable, remains, net: removable - remains, detail });
  }
}

console.log("| app | phase | file | LOC now | removable | remains (wiring) | net |");
console.log("| --- | --- | --- | ---: | ---: | ---: | ---: |");
for (const r of rows) {
  console.log(`| ${r.app} | ${r.phase} | \`${r.file}\` | ${r.now} | ${r.removable} | ${r.remains} | ${r.net >= 0 ? "-" : "+"}${Math.abs(r.net)} |`);
}
const sum = (filter) => rows.filter(filter).reduce((acc, r) => ({ removable: acc.removable + r.removable, remains: acc.remains + r.remains }), { removable: 0, remains: 0 });
console.log("");
console.log("| app | phase 1 net | phase 2 net | total net |");
console.log("| --- | ---: | ---: | ---: |");
let t1 = 0, t2 = 0;
for (const app of Object.keys(PLAN)) {
  const p1 = sum((r) => r.app === app && r.phase === 1);
  const p2 = sum((r) => r.app === app && r.phase === 2);
  const n1 = p1.removable - p1.remains, n2 = p2.removable - p2.remains;
  t1 += n1; t2 += n2;
  console.log(`| ${app} | -${n1} | ${n2 ? `-${n2}` : "0"} | -${n1 + n2} |`);
}
console.log(`| **all** | **-${t1}** | **-${t2}** | **-${t1 + t2}** |`);
console.log("");
console.log("Removed ranges (line numbers in the app file today):");
for (const r of rows) console.log(`- ${r.app} ${r.file}: ${r.detail.join("; ")}`);
