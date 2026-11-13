import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseHierarchy, compactTree, resolveTarget, focusedNode, inputTextChunks, shellQuote,
  normaliseClockCmd, agentUrl, parseAgentResult, parseForeground, parseBounds, decodeEntities,
} from "./lib.mjs";

const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8");
const home = parseHierarchy(fx("home.xml"));
const kb = parseHierarchy(fx("keyboard.xml"));

test("parseBounds", () => {
  assert.deepEqual(parseBounds("[0,63][1080,2337]"), [0, 63, 1080, 2337]);
  assert.equal(parseBounds("nope"), null);
});

test("decodeEntities", () => {
  assert.equal(decodeEntities("a &amp; b &lt;c&gt; &#10; &#x41;"), "a & b <c> \n A");
});

test("parseHierarchy reads every node with depth and entities", () => {
  assert.equal(home.length, 10);
  const row = home.find((n) => n.id === "link-layering");
  assert.equal(row.desc, "Layering & overlays");
  assert.deepEqual(row.center, [540, 486]);
  assert.equal(row.clickable, true);
  assert.equal(row.depth, 3);
  assert.equal(home.find((n) => n.text === "Layering & overlays" && !n.id).depth, 4);
  assert.equal(home.find((n) => n.id === "home").scrollable, true);
});

test("parseHierarchy keeps newlines in text and roles", () => {
  const input = kb.find((n) => n.id === "composer-input");
  assert.equal(input.text, "line one\nline two");
  assert.equal(input.role, "input");
  assert.equal(kb.find((n) => n.id === "composer-send").role, "button");
});

test("compactTree drops bare wrappers and zero-area nodes", () => {
  const out = compactTree(home);
  assert.ok(!out.some((n) => n.id === "link-hidden"));
  assert.ok(!out.some((n) => !n.id && !n.text && !n.desc));
  assert.deepEqual(out.find((n) => n.id === "toggle-dark"), {
    id: "toggle-dark", desc: "Dark mode", role: "view", bounds: [900, 300, 1032, 384], clickable: true,
  });
  assert.equal(out.find((n) => n.id === "composer-send"), undefined);
  assert.equal(compactTree(kb).find((n) => n.id === "composer-send").enabled, false);
});

test("resolveTarget: x,y", () => {
  assert.deepEqual(resolveTarget(home, "120, 340"), { ok: true, x: 120, y: 340, node: null, tier: "point", matches: 1 });
});

test("resolveTarget: testID, exact and suffix", () => {
  const r = resolveTarget(home, "link-keyboard");
  assert.equal(r.tier, "id");
  assert.deepEqual([r.x, r.y], [540, 642]);
  const withPkg = [{ ...home[3], id: "dev.vvedantb.nativegallery:id/toggle-dark" }];
  assert.equal(resolveTarget(withPkg, "toggle-dark").ok, true);
  assert.equal(resolveTarget(withPkg, "dark").ok, false);
});

test("resolveTarget: label by content-desc, text and substring", () => {
  assert.equal(resolveTarget(home, "Dark mode").node.id, "toggle-dark");
  assert.equal(resolveTarget(home, "Larger text").tier, "label");
  const sub = resolveTarget(home, "layering");
  assert.equal(sub.tier, "label-contains");
  assert.equal(sub.node.id, "link-layering");
  assert.equal(resolveTarget(home, "text=Larger text").matches, 1);
  assert.equal(resolveTarget(home, "desc=Keyboard").node.id, "link-keyboard");
});

test("resolveTarget: skips hidden nodes, prefers enabled, reports misses", () => {
  assert.equal(resolveTarget(home, "link-hidden").ok, false);
  assert.equal(resolveTarget(home, "Hidden row").ok, false);
  const r = resolveTarget(kb, "Send");
  assert.equal(r.matches, 2);
  assert.equal(r.node.id, "dd-send"); // composer-send is disabled
  assert.match(resolveTarget(home, "zzz").error, /no node matches/);
  assert.equal(resolveTarget(home, "").ok, false);
});

test("focusedNode", () => {
  assert.equal(focusedNode(kb).id, "composer-input");
  assert.equal(focusedNode(home), null);
});

test("inputTextChunks escapes spaces, quotes, percent and newlines", () => {
  assert.deepEqual(inputTextChunks("a b"), [{ text: "'a%sb'" }]);
  assert.deepEqual(inputTextChunks("it's 5%"), [{ text: `'it'\\''s%s5%25'` }]);
  assert.deepEqual(inputTextChunks("one\ntwo"), [{ text: "'one'" }, { key: 66 }, { text: "'two'" }]);
  assert.throws(() => inputTextChunks("café"), /ASCII/);
});

test("shellQuote", () => assert.equal(shellQuote("a'b"), `'a'\\''b'`));

test("normaliseClockCmd", () => {
  assert.equal(normaliseClockCmd("freeze"), "freeze");
  assert.equal(normaliseClockCmd("+250"), "+250");
  assert.equal(normaliseClockCmd("250"), "+250");
  assert.throws(() => normaliseClockCmd("bogus"));
});

test("agentUrl encodes +", () => {
  assert.equal(agentUrl("nativegallery", "clock", { cmd: "+100", id: "x" }), "nativegallery://agent/clock?cmd=%2B100&id=x");
});

test("parseAgentResult picks the line for the id and survives broken lines", () => {
  const log = fx("logcat.txt");
  assert.deepEqual(parseAgentResult(log, "a1").state, { frozen: true, now: 0 });
  assert.equal(parseAgentResult(log, "b2").cmd, "+100");
  assert.equal(parseAgentResult(log, "missing"), null);
  assert.equal(parseAgentResult(log).id, "b2");
});

test("parseForeground", () => {
  const out = "  mResumedActivity: ActivityRecord{1a2b u0 dev.vvedantb.nativegallery/.MainActivity t12}\n";
  assert.deepEqual(parseForeground(out), { package: "dev.vvedantb.nativegallery", activity: "dev.vvedantb.nativegallery.MainActivity" });
  assert.equal(parseForeground("nothing"), null);
});
