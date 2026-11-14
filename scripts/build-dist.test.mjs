// build-dist must not ship a worklet that calls a compiler-hoisted `_temp`
// function: the UI thread cannot call it, and the app crashes ("Tried to
// synchronously call a Remote Function"; a tab indicator crashed this way).
import { transformAsync } from "@babel/core";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { compileFile } from "./build-dist.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));
// The app's worklets plugin, as the gallery (and Eva) run it.
const workletsPlugin = createRequire(join(here, "../apps/native-gallery/package.json")).resolve("react-native-worklets/plugin");
const logger = { logEvent() {} };

test("worklets keep their helper functions inline after React Compiler", async () => {
  const code = await compileFile(join(here, "fixtures/worklet-hook.ts"), { jsx: "preserve", logger });
  // The fixture must trigger the hoisting, or this test proves nothing.
  assert.match(code, /function _temp\d*\(/, "React Compiler no longer hoists the fixture's arrows");

  const { code: workletized } = await transformAsync(code, {
    babelrc: false,
    configFile: false,
    // The plugin reads the file to name the worklets; the fixture is that file.
    filename: join(here, "fixtures/worklet-hook.ts"),
    plugins: [workletsPlugin],
  });
  const closures = [...workletized.matchAll(/__closure = (\{[^;]*\});/g)].map((match) => match[1]);
  assert.equal(closures.length, 3, "expected three worklets: useAnimatedStyle, onUpdate and the \"worklet\" function");
  for (const closure of closures) assert.doesNotMatch(closure, /\b_temp\d*\b/, `a worklet captures a hoisted function: ${closure}`);
});
