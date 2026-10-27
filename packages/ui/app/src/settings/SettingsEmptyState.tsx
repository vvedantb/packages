import type { ComponentType, ReactNode } from "react";
import { useUiConfig } from "../../../src/ui/ui-config";

const ICON_CLASS = "mb-5 text-muted-foreground opacity-50";

/** `UiConfig.SettingsEmptyState`: replaces the built-in classes of a part. */
export interface SettingsEmptyStateConfig {
  classes?: {
    /** The icon above the title (colour, opacity, spacing). */
    icon?: string;
  };
}

interface SettingsEmptyStateProps {
  /** Tabler icon component, rendered muted above the copy. */
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  /** One line on what to do about it. */
  description?: string;
  /** Primary call to action, e.g. the same button as the section header. */
  action?: ReactNode;
}

/**
 * The "nothing here yet" state for a settings section body.
 *
 * Sits inside a SettingsSection rather than floating on the canvas, so an empty
 * list still reads as part of the card it belongs to.
 * Shared across apps.
 */
export function SettingsEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: SettingsEmptyStateProps) {
  const iconClass =
    useUiConfig("SettingsEmptyState")?.classes?.icon ?? ICON_CLASS;
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <Icon size={28} className={iconClass} />
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      {description ? (
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
