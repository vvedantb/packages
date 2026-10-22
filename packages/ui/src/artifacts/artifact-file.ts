import { toast } from "sonner";
import { ARTIFACT_FORMAT_FILES, artifactFileName, type ArtifactFormat } from "@vvedantb/server";

/** Saves `body` as a file named after `title`, with the extension and MIME type of `format`. */
export function downloadArtifactBody(title: string, format: ArtifactFormat, body: string): void {
  const url = URL.createObjectURL(new Blob([body], { type: ARTIFACT_FORMAT_FILES[format].mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = artifactFileName(title, format);
  link.click();
  URL.revokeObjectURL(url);
}

/** Copies `body` to the clipboard and toasts the outcome. */
export async function copyArtifactBody(body: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(body);
    toast.success("Copied");
  } catch {
    toast.error("Couldn't copy");
  }
}

export function openArtifactInNewTab(href: string): void {
  window.open(href, "_blank", "noopener");
}
