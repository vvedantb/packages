import type { ActionFeatures, BannerFeatures, SkillChipPreview } from "./types";
import { matchesSlashQuery } from "./composerSlashTrigger";

export type SlashGroup = "Actions" | "Skills";

const SLASH_GROUPS: ReadonlyArray<SlashGroup> = ["Actions", "Skills"];

export type SlashIconKey = "plus" | "paperclip" | "lock" | "book" | "file";

type SlashActionKey =
  | "new-chat"
  | "attach"
  | "privacy"
  | "artifacts"
  | "new-artifact";

type SlashItemBase = {
  id: string;
  label: string;
  description?: string;
  group: SlashGroup;
  icon: SlashIconKey;
  keywords: string[];
  active?: boolean;
  badge?: string;
  preview?: SkillChipPreview;
};

export type ComposerSlashItem =
  | (SlashItemBase & { kind: "action"; action: SlashActionKey })
  | (SlashItemBase & { kind: "skill-hub"; skillId: string })
  | (SlashItemBase & { kind: "skill-manual"; skillId: string });

type HubSkill = {
  _id: string;
  name: string;
  description: string;
  slug: string;
  icon?: string;
  kind?: "style" | "persona";
  installed: boolean;
  enabled: boolean;
};

type ManualSkill = {
  _id: string;
  name: string;
  description: string;
  activation: string;
};

export function buildComposerSlashItems(args: {
  actionFeatures: ActionFeatures;
  bannerFeatures: BannerFeatures;
  showFileUpload: boolean;
  includeNewChat: boolean;
  hubSkills: HubSkill[];
  manualSkills: ManualSkill[];
  selectedManualIds: ReadonlyArray<string>;
  extraItems?: ComposerSlashItem[];
  includeArtifacts?: boolean;
}): ComposerSlashItem[] {
  const actions: ComposerSlashItem[] = [];
  if (args.includeNewChat) {
    actions.push({
      id: "action:new-chat",
      label: "new-chat",
      description: "Start a new conversation",
      group: "Actions",
      kind: "action",
      action: "new-chat",
      icon: "plus",
      keywords: ["new", "chat", "reset"],
    });
  }
  if (args.showFileUpload) {
    actions.push({
      id: "action:attach",
      label: "attach",
      description: "Attach a file or image",
      group: "Actions",
      kind: "action",
      action: "attach",
      icon: "paperclip",
      keywords: ["file", "upload", "image", "pdf"],
    });
  }
  actions.push(
    toggleAction(
      "privacy",
      "private",
      "Temporary chat that stays out of the sidebar",
      "lock",
      ["privacy", "temporary"],
      args.bannerFeatures.privacy,
    ),
  );
  if (args.includeArtifacts !== false) {
    actions.push({
      id: "action:artifacts",
      label: "artifacts",
      description: "Open your Artifacts library",
      group: "Actions",
      kind: "action",
      action: "artifacts",
      icon: "file",
      keywords: ["artifact", "document", "html"],
    });
    actions.push({
      id: "action:new-artifact",
      label: "new-artifact",
      description: "Create a new artifact",
      group: "Actions",
      kind: "action",
      action: "new-artifact",
      icon: "file",
      keywords: ["artifact", "create", "new"],
    });
  }

  const hubItems: ComposerSlashItem[] = args.hubSkills
    .filter((skill) => skill.installed)
    .map((skill) => ({
      id: `skill-hub:${skill._id}`,
      label: skill.slug || skill.name,
      description: skill.description,
      group: "Skills",
      kind: "skill-hub",
      skillId: skill._id,
      icon: "book",
      keywords: [skill.name, skill.slug],
      active: skill.enabled,
      badge: "Skill",
      preview: {
        id: skill._id,
        kind: "hub",
        name: skill.name,
        description: skill.description,
        icon: skill.icon,
        sourceLabel: skill.kind === "persona" ? "Persona" : "Hub",
        installed: skill.installed,
        enabled: skill.enabled,
      },
    }));
  const manualItems: ComposerSlashItem[] = args.manualSkills
    .filter((skill) => skill.activation === "manual")
    .map((skill) => ({
      id: `skill-manual:${skill._id}`,
      label: skill.name,
      description: skill.description,
      group: "Skills",
      kind: "skill-manual",
      skillId: skill._id,
      icon: "book",
      keywords: [skill.name],
      active: args.selectedManualIds.includes(skill._id),
      badge: "Manual",
      preview: {
        id: skill._id,
        kind: "manual",
        name: skill.name,
        description: skill.description,
        sourceLabel: "Custom",
        installed: true,
        enabled: args.selectedManualIds.includes(skill._id),
      },
    }));
  const skills = [...hubItems, ...manualItems].sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  const extras = args.extraItems ?? [];
  return [...actions, ...skills, ...extras];
}

export function filterAndGroupSlashItems(
  items: ComposerSlashItem[],
  query: string,
): Array<{ group: SlashGroup; items: ComposerSlashItem[] }> {
  const filtered = items.filter((item) => matchesSlashQuery(item, query));
  return SLASH_GROUPS.flatMap((group) => {
    const groupItems = filtered.filter((item) => item.group === group);
    return groupItems.length > 0 ? [{ group, items: groupItems }] : [];
  });
}

function toggleAction(
  action: SlashActionKey,
  label: string,
  description: string,
  icon: SlashIconKey,
  keywords: string[],
  active: boolean,
): ComposerSlashItem {
  return {
    id: `action:${action}`,
    label,
    description,
    group: "Actions",
    kind: "action",
    action,
    icon,
    keywords,
    active,
  };
}
