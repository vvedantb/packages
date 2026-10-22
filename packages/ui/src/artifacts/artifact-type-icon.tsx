import {
  IconCards,
  IconChartInfographic,
  IconCode,
  IconFileText,
  IconListCheck,
  IconPresentation,
  IconReport,
  IconSchema,
  IconSitemap,
  type TablerIcon,
} from "@tabler/icons-react";
import type { ArtifactType } from "@vvedantb/server";
import { cn } from "../utils/cn";

const ICONS: Record<ArtifactType, TablerIcon> = {
  document: IconFileText,
  report: IconReport,
  slides: IconPresentation,
  infographic: IconChartInfographic,
  mindmap: IconSitemap,
  quiz: IconListCheck,
  flashcards: IconCards,
  diagram: IconSchema,
  code: IconCode,
};

/** Display name of each artifact type, for filters and labels. */
export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  document: "Document",
  report: "Report",
  slides: "Slides",
  infographic: "Infographic",
  mindmap: "Mind map",
  quiz: "Quiz",
  flashcards: "Flashcards",
  diagram: "Diagram",
  code: "Code",
};

export type ArtifactTypeIconProps = {
  type: ArtifactType;
  /** Pixel size. Default 16. */
  size?: number;
  stroke?: number;
  className?: string;
};

/** Tabler icon for an artifact type. Decorative (`aria-hidden`); muted by default. */
export function ArtifactTypeIcon({ type, size = 16, stroke, className }: ArtifactTypeIconProps) {
  const TypeIcon = ICONS[type];
  return (
    <TypeIcon
      size={size}
      stroke={stroke}
      aria-hidden
      data-artifact-type={type}
      className={cn("shrink-0 text-muted-foreground", className)}
    />
  );
}
