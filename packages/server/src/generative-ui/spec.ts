/**
 * Boundary parser for a stored generative UI spec.
 *
 * Panels are stored as a JSON string, so every renderer has to re-establish
 * the shape. The schema is narrower than json-render's own `Spec`: composition
 * only emits the fields listed here (no `visible`, `repeat` or `watch`), so
 * anything else in a stored row is corruption, not a feature.
 */

import type { Spec } from "@json-render/core";
import { z } from "zod";

/** Action params a composed spec carries: plain JSON scalars, never bindings. */
const actionParam = z.union([z.string(), z.number(), z.boolean()]);

const actionBinding = z.object({
  action: z.string(),
  params: z.record(z.string(), actionParam).optional(),
});

const element = z.object({
  type: z.string(),
  props: z.record(z.string(), z.unknown()),
  children: z.array(z.string()).optional(),
  slots: z.record(z.string(), z.array(z.string())).optional(),
  on: z.record(z.string(), actionBinding).optional(),
});

/** Annotated, so a drift between this schema and json-render fails the build. */
const specSchema: z.ZodType<Spec> = z.object({
  root: z.string(),
  elements: z.record(z.string(), element),
  state: z.record(z.string(), z.unknown()).optional(),
});

/** Parses a stored spec string. Null for anything unusable, including a missing root. */
export function parseGenerativeUiSpec(serialized: string): Spec | null {
  let json: unknown;
  try {
    json = JSON.parse(serialized);
  } catch {
    return null;
  }
  const parsed = specSchema.safeParse(json);
  if (!parsed.success) return null;
  // A spec whose root is missing renders as an empty box: treat it as unusable,
  // so the panel shows its fallback instead of a blank card.
  if (!parsed.data.elements[parsed.data.root]) return null;
  return parsed.data;
}

/**
 * True for an `http:` or `https:` URL. A link a panel opens or loads must
 * never be `javascript:` or `data:`; zod's `.url()` alone accepts both.
 */
export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
