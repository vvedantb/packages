import { describe, expect, it } from "vitest";
import { z } from "zod";
import { z as z3 } from "zod3";
import {
  ARTIFACT_BODY_MAX_CHARS,
  ARTIFACT_FORMATS,
  ARTIFACT_TYPES,
  createArtifactSchemas,
  type ArtifactDetailRow,
  type ArtifactListRow,
  type ArtifactSchemas,
  type FlashcardsBodyV1,
  type QuizBodyV1,
} from "@vvedantb/server";

const quiz: QuizBodyV1 = {
  title: "Capitals",
  questions: [
    { id: "q1", prompt: "France?", options: ["Paris", "Lyon"], correctIndex: 0 },
    { id: "q2", prompt: "Italy?", options: ["Milan", "Rome", "Turin", "Naples", "Pisa"], correctIndex: 1 },
  ],
};
const deck: FlashcardsBodyV1 = { title: "Law", cards: [{ id: "c1", front: "Tort", back: "A civil wrong" }] };

const row: ArtifactListRow = {
  id: "a1",
  title: "Capitals",
  type: "quiz",
  format: "json",
  schemaVersion: 1,
  stateSpec: { stateVersion: 1, keys: ["answers", "score"], template: "quiz" },
  currentVersion: 3,
  size: 120,
  origin: { client: "chat", externalId: "old-1" },
  createdAt: 1,
  updatedAt: 2,
  teamId: "t1",
};

function suite(label: string, schemas: ArtifactSchemas) {
  describe(`createArtifactSchemas (${label})`, () => {
    it("has the type and format enums", () => {
      expect(ARTIFACT_TYPES).toEqual(["document", "report", "slides", "infographic", "mindmap", "quiz", "flashcards", "diagram", "code"]);
      expect(ARTIFACT_FORMATS).toEqual(["html", "markdown", "svg", "code", "json"]);
      for (const type of ARTIFACT_TYPES) expect(schemas.artifactType.parse(type)).toBe(type);
      expect(schemas.artifactType.safeParse("note").success).toBe(false);
      expect(schemas.artifactFormat.safeParse("pdf").success).toBe(false);
    });

    it("round-trips quiz and flashcards v1 bodies through JSON", () => {
      expect(schemas.quizBodyV1.parse(JSON.parse(JSON.stringify(quiz)))).toEqual(quiz);
      expect(schemas.flashcardsBodyV1.parse(JSON.parse(JSON.stringify(deck)))).toEqual(deck);
      expect(schemas.validateArtifactBody("quiz", "json", JSON.stringify(quiz))).toEqual({ ok: true, json: quiz });
      expect(schemas.validateArtifactBody("flashcards", "json", JSON.stringify(deck), 1)).toEqual({ ok: true, json: deck });
    });

    it("rejects malformed quiz bodies", () => {
      const q = quiz.questions[0];
      const bad = [
        { ...quiz, questions: [] },
        { ...quiz, questions: [{ ...q, options: ["only"] }] },
        { ...quiz, questions: [{ ...q, options: ["a", "b", "c", "d", "e", "f"] }] },
        { ...quiz, questions: [{ ...q, correctIndex: 2 }] },
        { ...quiz, questions: [{ ...q, correctIndex: 0.5 }] },
        { ...quiz, questions: [{ ...q, prompt: "  " }] },
        { questions: quiz.questions },
      ];
      for (const body of bad) expect(schemas.quizBodyV1.safeParse(body).success, JSON.stringify(body)).toBe(false);
      const result = schemas.validateArtifactBody("quiz", "json", JSON.stringify(bad[3]));
      expect(result).toEqual({ ok: false, error: "Invalid quiz body: correctIndex must point at an option at questions.0.correctIndex" });
    });

    it("rejects malformed flashcards bodies", () => {
      expect(schemas.flashcardsBodyV1.safeParse({ ...deck, cards: [] }).success).toBe(false);
      expect(schemas.flashcardsBodyV1.safeParse({ ...deck, cards: [{ id: "c1", front: "x" }] }).success).toBe(false);
    });

    it("validateArtifactBody: json only for typed types and known versions; size cap for all", () => {
      expect(schemas.validateArtifactBody("document", "html", "<p>x</p>")).toEqual({ ok: true });
      expect(schemas.validateArtifactBody("mindmap", "json", "{}")).toEqual({ ok: false, error: "A mindmap artifact cannot have a json body." });
      expect(schemas.validateArtifactBody("quiz", "json", JSON.stringify(quiz), 2)).toEqual({
        ok: false,
        error: "Unknown quiz body schema version 2.",
      });
      expect(schemas.validateArtifactBody("quiz", "json", "{ nope")).toEqual({ ok: false, error: "Artifact body is not valid JSON." });
      expect(schemas.validateArtifactBody("code", "code", "x".repeat(ARTIFACT_BODY_MAX_CHARS)).ok).toBe(true);
      expect(schemas.validateArtifactBody("code", "code", "x".repeat(ARTIFACT_BODY_MAX_CHARS + 1))).toEqual({
        ok: false,
        error: "Artifact body exceeds 400,000 characters.",
      });
    });

    it("parses list and detail rows and strips unknown keys", () => {
      expect(schemas.listRow.parse({ ...row, body: "x", userId: "u" })).toEqual(row);
      const detail: ArtifactDetailRow = { ...row, body: JSON.stringify(quiz) };
      expect(schemas.detailRow.parse(detail)).toEqual(detail);
      expect(schemas.listRow.parse({ ...row, description: undefined, stateSpec: undefined, teamId: undefined })).toMatchObject({ id: "a1" });
      expect(schemas.listRow.safeParse({ ...row, description: "x".repeat(281) }).success).toBe(false);
      expect(schemas.listRow.safeParse({ ...row, origin: {} }).success).toBe(false);
      expect(schemas.detailRow.safeParse(row).success).toBe(false);
    });

    it("limits the state spec to 32 keys of up to 64 characters", () => {
      const keys = Array.from({ length: 32 }, (_, i) => `k${String(i)}`);
      expect(schemas.stateSpec.parse({ stateVersion: 1, keys })).toEqual({ stateVersion: 1, keys });
      expect(schemas.stateSpec.safeParse({ stateVersion: 1, keys: [...keys, "k32"] }).success).toBe(false);
      expect(schemas.stateSpec.safeParse({ stateVersion: 1, keys: ["k".repeat(65)] }).success).toBe(false);
      expect(schemas.stateSpec.safeParse({ stateVersion: 1, keys: [], template: "slides" }).success).toBe(false);
    });
  });
}

suite("zod 4", createArtifactSchemas(z));
// This file compiles against zod 4 types; a zod 3.25 app's own types are checked in tests-node/esm-exports.mjs.
// @ts-expect-error zod 3's namespace type differs from the zod 4 types this test file compiles against
suite("zod 3.25", createArtifactSchemas(z3));

describe("composition", () => {
  it("the schemas compose with the app's own", () => {
    const schemas = createArtifactSchemas(z);
    const saveArgs = z.object({ type: schemas.artifactType, format: schemas.artifactFormat, stateSpec: schemas.stateSpec.optional() });
    expect(saveArgs.parse({ type: "quiz", format: "json" })).toEqual({ type: "quiz", format: "json" });
  });
});
