import type { ArtifactDetailRow, ArtifactListRow } from "@vvedantb/server";

/** What a card or list row shows. Any `ArtifactListRow` fits; the body is never needed. */
export type ArtifactSummary = Pick<ArtifactListRow, "id" | "title" | "description" | "type" | "format" | "updatedAt">;

/** What the viewer renders: the summary fields it shows plus the body of the version on screen. */
export type ArtifactDocument = Pick<
  ArtifactDetailRow,
  "id" | "title" | "type" | "format" | "language" | "stateSpec" | "currentVersion" | "body"
>;

/** One entry in the versions menu. */
export type ArtifactVersionSummary = {
  version: number;
  createdAt: number;
  /** The title the artifact had at this version, when it differs. */
  title?: string;
};
