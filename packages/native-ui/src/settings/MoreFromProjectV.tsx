import { Linking, Platform, Text, View } from "react-native";
import { APP_ICONS } from "../brand/AppIcons";
import { AppMark } from "../brand/AppMark";
import type { AppName } from "../brand/svg";
import { cn } from "../cn";
import { textStyle, typeStyle } from "../controlStyles";
import { ListRow } from "../ListRow";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { SettingsSection } from "./SettingsSection";
import {
  openProjectVApp,
  otherProjectVMobileApps,
  type ProjectVMobileAppId,
  type ProjectVOpenTarget,
} from "./projectVMobileApps";

/**
 * The mark for each phone app. V Store has no mark of its own (it was left out
 * of the brand marks in 0.3.9), so it shows the Project V mark.
 */
const MARK: Record<ProjectVMobileAppId, AppName> = {
  vibot: "vibot",
  verve: "verve",
  velth: "velth",
  vmem: "vmem",
  vstore: "projectv",
};

export type FromProjectVProps = {
  className?: string;
  testID?: string;
};

/** A small muted "from Project V" line with the Project V mark, for the end of a settings screen. */
export function FromProjectV({ className, testID }: FromProjectVProps) {
  const scheme = useScheme();
  const muted = tokens.color.muted[scheme];
  const ProjectVMark = APP_ICONS.projectv;
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel="from Project V"
      className={cn("flex-row items-center justify-center gap-1.5 py-2", className)}
    >
      <Text className="text-sm font-instrument-sans" style={textStyle("muted", scheme)}>
        from
      </Text>
      <ProjectVMark size={14} color={muted} />
      <Text
        className="text-sm font-instrument-sans-semibold"
        style={[textStyle("muted", scheme), typeStyle("semibold")]}
      >
        Project V
      </Text>
    </View>
  );
}

export type MoreFromProjectVProps = {
  /** The app showing the section. It is left out of the list. */
  current: ProjectVMobileAppId;
  /** `"section"` (default): a settings section listing the other apps. `"footer"`: only the small "from Project V" line. */
  variant?: "section" | "footer";
  /** Section title. Default "More from Project V". */
  title?: string;
  /** Called after a row opens something: the app, V Store or its website (`null` if nothing opened). */
  onOpen?: (id: ProjectVMobileAppId, target: ProjectVOpenTarget | null) => void;
  className?: string;
};

/**
 * Settings section listing the other Project V phone apps, each with its mark,
 * name and one line. A row opens the app if it is installed, else V Store's
 * home, else its website (`openProjectVApp`).
 */
export function MoreFromProjectV({
  current,
  variant = "section",
  title = "More from Project V",
  onOpen,
  className,
}: MoreFromProjectVProps) {
  if (variant === "footer") return <FromProjectV className={className} />;
  return (
    <SettingsSection title={title} bodyVariant="list" className={className}>
      <View className="flex-col gap-1 p-1">
        {otherProjectVMobileApps(current).map((app) => (
          <ListRow
            key={app.id}
            testID={`more-from-project-v-${app.id}`}
            title={app.name}
            meta={app.description}
            leading={<AppMark app={MARK[app.id]} size={28} />}
            accessibilityLabel={`${app.name}, ${app.description}`}
            onPress={() => {
              void openProjectVApp(app.id, Linking, Platform.OS).then((target) => onOpen?.(app.id, target));
            }}
          />
        ))}
      </View>
    </SettingsSection>
  );
}
