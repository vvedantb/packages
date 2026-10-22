import { wrapArtifactHtml, type ArtifactGuestOptions } from "./protocol.js";
import type { ArtifactFormat } from "./schemas.js";
import type { ArtifactStateMap } from "./stateOps.js";
import { htmlFromArtifactTemplate, type ArtifactTemplateName } from "./templates.js";

export type WrapArtifactDocumentOptions = ArtifactGuestOptions & {
  /** Heading for a built-in template when the body has no title. Default "Artifact". */
  title?: string;
  /** From `stateSpec.template`. Tried first for any format; `json` bodies without one try both templates. */
  template?: ArtifactTemplateName;
};

/** The body format for a fenced code block's language: html, svg and markdown render; anything else is code. */
export function formatFromLanguage(language: string | undefined): "html" | "markdown" | "svg" | "code" {
  const normalized = (language ?? "html").toLowerCase();
  if (normalized === "html" || normalized === "htm") return "html";
  if (normalized === "svg") return "svg";
  if (normalized === "md" || normalized === "markdown") return "markdown";
  return "code";
}

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function plainTextDocument(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><style>body{font-family:system-ui,sans-serif;margin:16px;white-space:pre-wrap}</style></head><body><pre>${escapeText(body)}</pre></body></html>`;
}

/** A full HTML document for `body` before the guest is injected. Markdown and code show as escaped text. */
function previewDocument(body: string, format: ArtifactFormat, options: WrapArtifactDocumentOptions): string {
  if (options.template !== undefined || format === "json") {
    const templated = htmlFromArtifactTemplate({
      title: options.title ?? "Artifact",
      content: body,
      template: options.template,
    });
    if (templated) return templated;
  }
  if (format === "svg") {
    return `<!doctype html><html><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#fff">${body}</body></html>`;
  }
  if (format === "html") {
    return body.includes("<html")
      ? body
      : `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{font-family:system-ui,sans-serif;margin:16px}</style></head><body>${body}</body></html>`;
  }
  return plainTextDocument(body);
}

/**
 * The `srcdoc` for an artifact: the body as a document (a built-in template
 * for quiz and flashcards JSON), with the CSP and the guest state bootstrap
 * (snapshot plus `stateGlobalAliases`) at the start of <head>. Render it in an
 * iframe with `sandbox="allow-scripts"` and no `allow-same-origin`.
 */
export function wrapArtifactDocument(
  body: string,
  format: ArtifactFormat,
  snapshot?: ArtifactStateMap,
  options: WrapArtifactDocumentOptions = {},
): string {
  return wrapArtifactHtml(previewDocument(body, format, options), snapshot, options);
}

/** File extension and MIME type for downloading a body of each format. */
export const ARTIFACT_FORMAT_FILES: Record<ArtifactFormat, { extension: string; mime: string }> = {
  html: { extension: "html", mime: "text/html" },
  markdown: { extension: "md", mime: "text/markdown" },
  svg: { extension: "svg", mime: "image/svg+xml" },
  code: { extension: "txt", mime: "text/plain" },
  json: { extension: "json", mime: "application/json" },
};

/** A download file name: the title with characters that file systems refuse replaced by "-", plus the format's extension. */
export function artifactFileName(title: string, format: ArtifactFormat): string {
  return `${title.replace(/[/\\?%*:|"<>]/g, "-")}.${ARTIFACT_FORMAT_FILES[format].extension}`;
}
