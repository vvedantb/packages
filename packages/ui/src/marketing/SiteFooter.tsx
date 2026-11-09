import type { ComponentType, ReactNode } from "react";
import { IconBrandGithub, IconBrandInstagram, IconBrandX } from "@tabler/icons-react";
import { APP_ICONS, AppWordmark, projectVAppsColumn, type AppName, type ProductAppName } from "../brand";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { siteFooterClasses, type SiteFooterVariant } from "./marketing-classes";

export type SiteFooterLink = {
  href: string;
  label: string;
  /** Opens in a new tab (`target="_blank" rel="noopener noreferrer"`). */
  external?: boolean;
  /** 20px round image before the label. */
  image?: { src: string; alt: string };
  /** 14px app glyph before the label, in `currentColor` and `aria-hidden`. Wins over `image`. */
  app?: AppName;
};

export type SiteFooterSocial = {
  href: string;
  /** Rendered with the variant's `w-4 h-4` muted class, for example a Tabler brand icon. */
  icon: ComponentType<{ className?: string }>;
  /** `aria-label` on the link. */
  label?: string;
};

/** Text size in px of the built-in `AppWordmark` brand. Fixed: `SiteFooter` has no size prop. */
export const SITE_FOOTER_WORDMARK_SIZE = 16;

/** Default `socials` on the `app` path: X, Instagram and GitHub. */
export const PROJECT_V_SOCIALS: readonly SiteFooterSocial[] = [
  { href: "https://x.com/projectvdotuk", icon: IconBrandX, label: "Project V on X" },
  { href: "https://www.instagram.com/projectvdotuk/", icon: IconBrandInstagram, label: "Project V on Instagram" },
  { href: "https://github.com/projectvdotuk", icon: IconBrandGithub, label: "Project V on GitHub" },
];

/** Default `legalLinks` on the `app` path. */
export const PROJECT_V_LEGAL_LINKS: readonly { href: string; label: string }[] = [
  { href: "https://projectv.uk/privacy", label: "Privacy Policy" },
  { href: "https://projectv.uk/terms", label: "Terms of Service" },
];

export type SiteFooterColumn = { heading: string; links: readonly SiteFooterLink[] };

type SiteFooterCommonProps = {
  tagline: ReactNode;
  /** Link columns to the right of the brand block. */
  columns: readonly SiteFooterColumn[];
  /** Default: the current year. */
  year?: number;
  /**
   * `"muted"` (default) and `"muted-foreground"` pick the secondary text
   * colour class. `"touch"` uses `text-muted-foreground`, `max-sm:hit-target`
   * links and a safe-area bottom padding.
   */
  variant?: SiteFooterVariant;
  /** Under the socials, for example a Sign-in button. Not rendered on the legacy path. */
  actions?: ReactNode;
};

/** Opinionated footer: set `app` and the Project V brand, socials, legal links, Apps column and product-of line follow. */
export type SiteFooterAppProps = SiteFooterCommonProps & {
  /** Product app id. Sets the wordmark (size 16), the copyright name and the product-of line. */
  app: ProductAppName;
  /** Replaces the `AppWordmark`. */
  brand?: ReactNode;
  /** Default `PROJECT_V_SOCIALS`. `[]` hides them. */
  socials?: readonly SiteFooterSocial[];
  /** Default `PROJECT_V_LEGAL_LINKS`. */
  legalLinks?: readonly { href: string; label: string }[];
  /** Overrides the copyright name (default: `app`). */
  name?: string;
  /** Appends the standard Apps column unless `columns` has an "Apps" heading (default `true`). */
  includeAppsColumn?: boolean;
  /** Shows "{app} is a product of Project V." (default `true`). */
  showProductOf?: boolean;
};

/** Legacy footer: you pass every part. Prefer `SiteFooterAppProps`. */
export type SiteFooterLegacyProps = SiteFooterCommonProps & {
  app?: undefined;
  /**
   * @deprecated Set `app` instead: the footer renders `AppWordmark`. Without `app` the brand sits in the Michroma wrapper.
   */
  brand: ReactNode;
  /** @deprecated Set `app` for the Project V defaults (`PROJECT_V_SOCIALS`). Icon buttons under the tagline; always open in a new tab. */
  socials: readonly SiteFooterSocial[];
  /** @deprecated Set `app`: the copyright name is then the app id. Name in "Copyright © {year} {name}". */
  name: string;
  /** @deprecated Set `app` for `PROJECT_V_LEGAL_LINKS`. Bottom-right links; always open in a new tab. */
  legalLinks: readonly { href: string; label: string }[];
  includeAppsColumn?: undefined;
  showProductOf?: undefined;
};

export type SiteFooterProps = SiteFooterAppProps | SiteFooterLegacyProps;

/** Marketing site footer: brand, socials, link columns, then copyright and legal links under a separator. */
export function SiteFooter(props: SiteFooterProps) {
  const { tagline, year = new Date().getFullYear(), variant = "muted", actions } = props;
  const c = siteFooterClasses[variant];
  const modern = props.app !== undefined;
  const brandNode = modern ? (
    <div className="mb-3 md:mb-4">{props.brand ?? <AppWordmark app={props.app} size={SITE_FOOTER_WORDMARK_SIZE} />}</div>
  ) : (
    <div className="text-lg font-michroma font-normal tracking-wider mb-3 md:mb-4">{props.brand}</div>
  );
  const socials = modern ? (props.socials ?? PROJECT_V_SOCIALS) : props.socials;
  const legalLinks = modern ? (props.legalLinks ?? PROJECT_V_LEGAL_LINKS) : props.legalLinks;
  const name = modern ? (props.name ?? props.app) : props.name;
  const hasApps = props.columns.some((column) => column.heading.toLowerCase() === "apps");
  const columns: readonly SiteFooterColumn[] = modern && (props.includeAppsColumn ?? true) && !hasApps ? [...props.columns, projectVAppsColumn()] : props.columns;
  const showProductOf = modern && (props.showProductOf ?? true);
  return (
    <footer className={c.footer}>
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-12">
            <div className="flex-1 lg:flex-none">
              {brandNode}
              <p className={c.tagline}>{tagline}</p>
              <div className="flex gap-3 md:gap-4">
                {socials.map(({ href, icon: Icon, label }) => (
                  <a key={href} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                    <Button variant="ghost" size="icon" className={c.socialButton}>
                      <Icon className={c.socialIcon} />
                    </Button>
                  </a>
                ))}
              </div>
              {modern && actions ? <div className="mt-3 md:mt-4">{actions}</div> : null}
            </div>

            <div className="flex flex-col sm:flex-row gap-8 md:gap-12 lg:gap-16 xl:gap-20">
              {columns.map((column) => (
                <div key={column.heading} className="flex-1 sm:flex-none">
                  <h4 className={c.heading}>{column.heading}</h4>
                  <div className={c.links}>
                    {column.links.map((link) => {
                      const AppIcon = link.app ? APP_ICONS[link.app] : null;
                      return (
                        <a
                          key={link.label}
                          href={link.href}
                          {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className={AppIcon || link.image ? c.imageLink : c.link}
                        >
                          {AppIcon ? (
                            <AppIcon size={14} />
                          ) : link.image ? (
                            <img
                              src={link.image.src}
                              alt={link.image.alt}
                              width={20}
                              height={20}
                              className="rounded-full object-cover w-5 h-5 md:w-5 md:h-5"
                            />
                          ) : null}
                          {link.label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-6 md:my-8 bg-separator" />

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0">
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <p className={c.copyright}>
                Copyright &copy; {year}
                {` ${name}`}
              </p>
              <p className={c.rights}>All rights reserved.</p>
              {showProductOf ? (
                <p className={c.rights}>
                  {props.app} is a product of{" "}
                  <a href="https://projectv.uk" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    Project V
                  </a>
                  .
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1 text-center sm:text-right">
              {legalLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={c.legalLink}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
