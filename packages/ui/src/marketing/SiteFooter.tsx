import type { ComponentType, ReactNode } from "react";
import { APP_ICONS, type AppName } from "../brand";
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

export type SiteFooterProps = {
  /** Wordmark text above the tagline. */
  brand: ReactNode;
  tagline: ReactNode;
  /** Icon buttons under the tagline. Always open in a new tab. */
  socials: readonly SiteFooterSocial[];
  /** Link columns to the right of the brand block. */
  columns: readonly { heading: string; links: readonly SiteFooterLink[] }[];
  /** Name in "Copyright © {year} {name}". */
  name: string;
  /** Default: the current year. */
  year?: number;
  /** Bottom-right links, for example Privacy Policy and Terms of Service. Always open in a new tab. */
  legalLinks: readonly { href: string; label: string }[];
  /**
   * `"muted"` (default) and `"muted-foreground"` pick the secondary text
   * colour class. `"touch"` uses `text-muted-foreground`, `max-sm:hit-target`
   * links and a safe-area bottom padding.
   */
  variant?: SiteFooterVariant;
};

/** Marketing site footer: brand, socials, link columns, then copyright and legal links under a separator. */
export function SiteFooter({
  brand,
  tagline,
  socials,
  columns,
  name,
  year = new Date().getFullYear(),
  legalLinks,
  variant = "muted",
}: SiteFooterProps) {
  const c = siteFooterClasses[variant];
  return (
    <footer className={c.footer}>
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-12">
            <div className="flex-1 lg:flex-none">
              <div className="text-lg font-michroma font-normal tracking-wider mb-3 md:mb-4">{brand}</div>
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
