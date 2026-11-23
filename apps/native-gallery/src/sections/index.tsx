import type { ComponentType } from "react";
import { AiChatGallery } from "@vvedantb/native-ui/ai-gallery";
import { ParityGallery } from "@vvedantb/native-ui/gallery";
import { AiCardsSection } from "./ai-cards";
import { BrandSection } from "./brand";
import { EntriesSection } from "./entries";
import { FormsSection } from "./forms";
import { GlassSection } from "./glass";
import { LayoutSection } from "./layout";
import { UpdatesSection } from "./updates";

export type SectionDef = {
  id: string;
  title: string;
  Component: ComponentType;
};

/** Scrolling sections, reached from the home list at `/section/<id>`. */
export const SECTIONS: SectionDef[] = [
  { id: "forms", title: "Forms, chips, lists and empty states", Component: FormsSection },
  { id: "glass", title: "Floating, glass and tab bar", Component: GlassSection },
  { id: "layout", title: "Layout, settings and artifacts", Component: LayoutSection },
  { id: "brand", title: "Brand marks", Component: BrandSection },
  { id: "updates", title: "Update prompt and checker", Component: UpdatesSection },
  { id: "entries", title: "Entry points and coverage", Component: EntriesSection },
  { id: "ai-cards", title: "AI cards, sheets and Markdown", Component: AiCardsSection },
];

/** Full-screen routes: `/parity`, `/ai`, `/auth`, `/layering`, `/keyboard`, `/bottom-sheet`, `/chat-hold`, `/shared-transition` (and `/shared-transition/<id>`). */
export const SCREENS = [
  { id: "parity", title: "Parity gallery (ParityGallery)" },
  { id: "ai", title: "AI chat (AiChatGallery)" },
  { id: "auth", title: "Auth on mocked Clerk" },
  { id: "layering", title: "Layering stress" },
  { id: "keyboard", title: "Keyboard and composer" },
  { id: "bottom-sheet", title: "Bottom sheet" },
  { id: "chat-hold", title: "Long chat with hold menus" },
  { id: "shared-transition", title: "Shared element transition" },
] as const;

export { AiChatGallery, ParityGallery };
