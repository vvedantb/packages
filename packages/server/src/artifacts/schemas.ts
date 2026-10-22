// Type-only: the app passes its own `z`, so the schemas compose with the
// app's other schemas and zod stays an optional peer (3.25+ or 4).
import type { z } from "zod";
import { ARTIFACT_BODY_MAX_CHARS, ARTIFACT_STATE_MAX_KEY_LENGTH, ARTIFACT_STATE_MAX_KEYS } from "./limits.js";
import type { ArtifactTemplateName, Flashcard, QuizQuestion } from "./templates.js";

/** What the artifact is, for filters and icons. */
export const ARTIFACT_TYPES = [
  "document",
  "report",
  "slides",
  "infographic",
  "mindmap",
  "quiz",
  "flashcards",
  "diagram",
  "code",
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

/** How the body renders. `json` is only for typed bodies (`ARTIFACT_JSON_TYPES`). */
export const ARTIFACT_FORMATS = ["html", "markdown", "svg", "code", "json"] as const;
export type ArtifactFormat = (typeof ARTIFACT_FORMATS)[number];

/** Types with a typed JSON body, and the body schema versions each accepts. */
export const ARTIFACT_JSON_TYPES = { quiz: [1], flashcards: [1] } as const;

export const ARTIFACT_TITLE_MAX_CHARS = 200;
export const ARTIFACT_DESCRIPTION_MAX_CHARS = 280;

/** Which state keys an artifact uses, and the built-in template that renders it. */
export type ArtifactStateSpec = {
  stateVersion: number;
  keys: string[];
  template?: ArtifactTemplateName;
};

export type QuizBodyV1 = { title: string; questions: QuizQuestion[] };
export type FlashcardsBodyV1 = { title: string; cards: Flashcard[] };

/** Who wrote the artifact: a free client name, and its id in that client when it was imported. */
export type ArtifactOrigin = { client: string; externalId?: string };

/** A list row: metadata only, never the body. Ids are strings so any store and any client can use it. */
export type ArtifactListRow = {
  id: string;
  title: string;
  description?: string;
  type: ArtifactType;
  format: ArtifactFormat;
  language?: string;
  schemaVersion: number;
  stateSpec?: ArtifactStateSpec;
  currentVersion: number;
  /** Body size in bytes. */
  size: number;
  origin: ArtifactOrigin;
  createdAt: number;
  updatedAt: number;
  teamId?: string;
};

/** A detail row: the list row plus the body of the version read. */
export type ArtifactDetailRow = ArtifactListRow & { body: string };

export type ArtifactBodyValidation =
  | { ok: true; json?: QuizBodyV1 | FlashcardsBodyV1 }
  | { ok: false; error: string };

export type ArtifactSchemas = {
  artifactType: z.ZodType<ArtifactType>;
  artifactFormat: z.ZodType<ArtifactFormat>;
  stateSpec: z.ZodType<ArtifactStateSpec>;
  quizBodyV1: z.ZodType<QuizBodyV1>;
  flashcardsBodyV1: z.ZodType<FlashcardsBodyV1>;
  listRow: z.ZodType<ArtifactListRow>;
  detailRow: z.ZodType<ArtifactDetailRow>;
  /**
   * Checks a body before it is saved: at most `ARTIFACT_BODY_MAX_CHARS`, and
   * for `json` a known type and schema version (default 1) whose parsed body
   * matches the typed schema. Returns the parsed JSON body when there is one.
   */
  validateArtifactBody(type: ArtifactType, format: ArtifactFormat, body: string, schemaVersion?: number): ArtifactBodyValidation;
};

function isJsonType(type: ArtifactType): type is keyof typeof ARTIFACT_JSON_TYPES {
  return Object.hasOwn(ARTIFACT_JSON_TYPES, type);
}

function parseJson(body: string): { ok: true; value: object | string | number | boolean | null } | { ok: false } {
  try {
    const value: object | string | number | boolean | null = JSON.parse(body);
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

/** The artifact schemas, built with the app's `z`. */
export function createArtifactSchemas(zod: typeof z): ArtifactSchemas {
  const text = zod.string().trim().min(1);
  const artifactType = zod.enum(ARTIFACT_TYPES);
  const artifactFormat = zod.enum(ARTIFACT_FORMATS);
  const stateSpec = zod.object({
    stateVersion: zod.number().int().min(1),
    keys: zod.array(zod.string().min(1).max(ARTIFACT_STATE_MAX_KEY_LENGTH)).max(ARTIFACT_STATE_MAX_KEYS),
    template: zod.enum(["quiz", "flashcards"]).optional(),
  });
  const quizBodyV1 = zod.object({
    title: text,
    questions: zod
      .array(
        zod
          .object({
            id: text,
            prompt: text,
            options: zod.array(text).min(2).max(5),
            correctIndex: zod.number().int().min(0),
          })
          .refine((question) => question.correctIndex < question.options.length, {
            message: "correctIndex must point at an option",
            path: ["correctIndex"],
          }),
      )
      .min(1),
  });
  const flashcardsBodyV1 = zod.object({
    title: text,
    cards: zod.array(zod.object({ id: text, front: text, back: text })).min(1),
  });
  const listRowShape = {
    id: zod.string(),
    title: zod.string().min(1).max(ARTIFACT_TITLE_MAX_CHARS),
    description: zod.string().max(ARTIFACT_DESCRIPTION_MAX_CHARS).optional(),
    type: artifactType,
    format: artifactFormat,
    language: zod.string().optional(),
    schemaVersion: zod.number().int().min(1),
    stateSpec: stateSpec.optional(),
    currentVersion: zod.number().int().min(1),
    size: zod.number().int().min(0),
    origin: zod.object({ client: zod.string().min(1), externalId: zod.string().optional() }),
    createdAt: zod.number(),
    updatedAt: zod.number(),
    teamId: zod.string().optional(),
  };
  const listRow = zod.object(listRowShape);
  const detailRow = zod.object({ ...listRowShape, body: zod.string().max(ARTIFACT_BODY_MAX_CHARS) });

  function validateArtifactBody(
    type: ArtifactType,
    format: ArtifactFormat,
    body: string,
    schemaVersion = 1,
  ): ArtifactBodyValidation {
    if (body.length > ARTIFACT_BODY_MAX_CHARS) {
      return { ok: false, error: `Artifact body exceeds ${ARTIFACT_BODY_MAX_CHARS.toLocaleString("en-GB")} characters.` };
    }
    if (format !== "json") return { ok: true };
    if (!isJsonType(type)) return { ok: false, error: `A ${type} artifact cannot have a json body.` };
    const versions: readonly number[] = ARTIFACT_JSON_TYPES[type];
    if (!versions.includes(schemaVersion)) {
      return { ok: false, error: `Unknown ${type} body schema version ${String(schemaVersion)}.` };
    }
    const parsed = parseJson(body);
    if (!parsed.ok) return { ok: false, error: "Artifact body is not valid JSON." };
    const result = type === "quiz" ? quizBodyV1.safeParse(parsed.value) : flashcardsBodyV1.safeParse(parsed.value);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => `${issue.message} at ${issue.path.join(".") || "body"}`);
      return { ok: false, error: `Invalid ${type} body: ${issues.join("; ")}` };
    }
    return { ok: true, json: result.data };
  }

  return { artifactType, artifactFormat, stateSpec, quizBodyV1, flashcardsBodyV1, listRow, detailRow, validateArtifactBody };
}
