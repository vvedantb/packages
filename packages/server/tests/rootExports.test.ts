import { describe, expect, it } from "vitest";
import * as root from "@vvedantb/server";
import * as convex from "../src/convex/index.js";
import * as cryptoPrimitives from "../src/crypto/index.js";
import * as mcp from "../src/mcp/index.js";

describe("@vvedantb/server root export", () => {
  const parts = { convex, crypto: cryptoPrimitives, mcp };

  it("has no name in two folders", () => {
    const seen = new Map<string, string>();
    for (const [folder, mod] of Object.entries(parts)) {
      for (const name of Object.keys(mod)) {
        expect(seen.get(name), `${name} in ${folder}`).toBeUndefined();
        seen.set(name, folder);
      }
    }
  });

  it("re-exports every runtime export of each folder, and nothing else", () => {
    const expected = Object.values(parts).flatMap((mod) => Object.keys(mod));
    expect(Object.keys(root).sort()).toEqual(expected.sort());
    for (const mod of Object.values(parts)) {
      for (const [name, value] of Object.entries(mod)) {
        expect(Object.entries(root).find(([key]) => key === name)?.[1], name).toBe(value);
      }
    }
  });
});
