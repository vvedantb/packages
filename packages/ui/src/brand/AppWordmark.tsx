import type { AnchorHTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { APP_ICONS } from "./AppIcons";
import type { AppName } from "./svg";

/** The five product apps. `projectv` keeps its Michroma wordmark and never uses `AppWordmark`. */
export type ProductAppName = Exclude<AppName, "projectv">;

export type AppWordmarkProps = Pick<AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel" | "aria-label" | "title" | "id"> & {
  /** Which product app's name to show. The label is always the lowercase app id. */
  app: ProductAppName;
  /** Font size in px (default 24). The icon is `size` px square and the gap is `size * 8 / 24` px. */
  size?: number;
  /** `false` renders the name only (default `true`). */
  icon?: boolean;
  /** When set, the root is an `<a>` with a focus ring. Otherwise it is a `<span>`. */
  href?: string;
  className?: string;
};

const FOCUS_RING =
  "rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Marketing wordmark for a product app: the `Icon*` glyph, then the full lowercase name in Instrument Serif, weight 400.
 * The leading `v` is upright and the rest (`ibot`, `mem`, `erve`, `elth`, `hub`) is italic, as in vmem. The two sit flush.
 * Needs `landing.css` and `--font-instrumentSerif` from the app. Instrument Serif is for app names only.
 */
export function AppWordmark({ app, size = 24, icon = true, href, className, ...rest }: AppWordmarkProps) {
  const Icon = APP_ICONS[app];
  const classes = cn("inline-flex flex-row items-center text-foreground", href && FOCUS_RING, className);
  const style = { gap: (size * 8) / 24 };
  const content = (
    <>
      {icon ? <Icon size={size} /> : null}
      {/* Upright `v` + italic rest must sit flush: no space or gap between them (matches vmem). */}
      <span className="landing-wordmark-text leading-none tracking-tight" style={{ fontSize: size }}>
        v<span className="italic">{app.slice(1)}</span>
      </span>
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
