import { expect, it } from "bun:test";
// @ts-expect-error plain .mjs module with no type declarations
import plugin from "../oxlint/plugin.mjs";

it("registers every shared rule under the vvedantb plugin", () => {
  expect(plugin.meta.name).toBe("vvedantb");
  expect(Object.keys(plugin.rules).sort()).toEqual([
    "no-conditional-tests",
    "no-double-cast",
    "no-inline-object-type-assertion",
    "no-inline-zod-schema",
    "no-is-record",
    "no-json-parse",
    "no-settings-description",
    "no-source-text-in-tests",
    "no-ts-nocheck",
    "no-unknown-shape-probing",
    "no-value-block-in-try",
    "prefer-schema-inferred-types",
  ]);
  for (const rule of Object.values<{ create?: unknown }>(plugin.rules)) {
    expect(typeof rule.create).toBe("function");
  }
});
