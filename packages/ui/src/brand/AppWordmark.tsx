import type { AnchorHTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { APP_ICONS } from "./AppIcons";
import type { AppName } from "./svg";

/** The five product apps. `projectv` keeps its Michroma wordmark and never uses `AppWordmark`. */
export type ProductAppName = Exclude<AppName, "projectv">;

export type AppWordmarkProps = Pick<AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel" | "aria-label" | "title" | "id"> & {
  /** Which product app's name to show. The label is always the lowercase app id. */
  app: ProductAppName;
  /** Text font size in px (default 24). The icon is `Math.round(size * 0.875)` px square and the gap is `0.3em`. */
  size?: number;
  /** `false` renders the name only (default `true`). */
  icon?: boolean;
  /** When set, the root is an `<a>` with a focus ring. Otherwise it is a `<span>`. */
  href?: string;
  className?: string;
};

/** Icon size relative to the text font size. */
const ICON_SCALE = 0.875;

const FOCUS_RING =
  "rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Marketing wordmark for a product app: the `Icon*` glyph, then the full lowercase name in Instrument Sans
 * (`--font-sans`), weight 500, upright. Needs `landing.css` for `.landing-wordmark-text`.
 * Only the PROJECT V wordmark uses Michroma. App names use no serif and no italic.
 */
export function AppWordmark({ app, size = 24, icon = true, href, className, ...rest }: AppWordmarkProps) {
  const Icon = APP_ICONS[app];
  const classes = cn("inline-flex flex-row items-center text-foreground", href && FOCUS_RING, className);
  // Font size sits on the root so the `0.3em` gap tracks the text size. The text node inherits it.
  const style = { fontSize: size, gap: "0.3em" };
  const content = (
    <>
      {icon ? <Icon size={Math.round(size * ICON_SCALE)} /> : null}
      <span className="landing-wordmark-text leading-none">{app}</span>
    </>
  );
  if (href) {
    return (
      <a {...rest} href={href} className={classes} style={style} data-app={app}>
        {content}
      </a>
    );
  }
  return (
    <span aria-label={rest["aria-label"]} title={rest.title} id={rest.id} className={classes} style={style} data-app={app}>
      {content}
    </span>
  );
}
AppWordmark.displayName = "AppWordmark";
