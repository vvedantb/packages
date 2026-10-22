import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";
import { CodeBlock } from "../ai-elements/code-block";
import { cn } from "../utils/cn";
import { ArtifactFrame, type ArtifactFrameProps } from "./artifact-frame";
import type { ArtifactDocument } from "./types";

const streamdownPlugins = { cjk, code, math, mermaid };

export type ArtifactRenderProps = Pick<ArtifactFrameProps, "store" | "stateGlobalAliases"> & {
  artifact: Pick<ArtifactDocument, "title" | "format" | "language" | "stateSpec" | "body">;
  className?: string;
};

/**
 * An artifact body by format: Markdown with Streamdown, code with `CodeBlock`,
 * and HTML, SVG and typed JSON (quiz, flashcards) in an `ArtifactFrame`.
 */
export function ArtifactRender({ artifact, store, stateGlobalAliases, className }: ArtifactRenderProps) {
  if (artifact.format === "markdown") {
    return (
      <div className={cn("overflow-auto p-4", className)}>
        <Streamdown plugins={streamdownPlugins}>{artifact.body}</Streamdown>
      </div>
    );
  }
  if (artifact.format === "code") {
    return (
      <CodeBlock
        code={artifact.body}
        language={artifact.language ?? "text"}
        className={cn("overflow-auto rounded-none", className)}
      />
    );
  }
  return (
    <ArtifactFrame
      body={artifact.body}
      format={artifact.format}
      title={artifact.title}
      template={artifact.stateSpec?.template}
      store={store}
      stateGlobalAliases={stateGlobalAliases}
      className={cn("h-72 w-full", className)}
    />
  );
}
