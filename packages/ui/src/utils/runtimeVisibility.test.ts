import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "runtimeVisibility.ts"), "utf8");
const beam = readFileSync(join(here, "..", "ui", "border-beam.tsx"), "utf8");
const beamCss = readFileSync(join(here, "..", "..", "tokens", "src", "css", "border-beam.css"), "utf8");
const loading = readFileSync(join(here, "..", "ui", "loading-state.tsx"), "utf8");

/**
 * A bare `closest('[aria-hidden="true"]')` treats an element's own decorative
 * chrome as a parked subtree: BorderBeam and LoadingState mark their chrome
 * aria-hidden, so every visible beam and grid would pause on attach.
 */
describe("parked-subtree pause skips decorative animation chrome", () => {
  it("does not treat an element's own aria-hidden chrome as parked", () => {
    expect(source).toContain('[aria-hidden="true"]:not([data-anim-chrome])');
    expect(source).not.toContain('closest(\'[aria-hidden="true"]\')');
    expect(beam).toContain("data-anim-chrome");
    expect(beamCss).toContain('[aria-hidden="true"]:not([data-anim-chrome]) .beam::before');
    expect(loading).toContain("data-anim-chrome");
  });
});
