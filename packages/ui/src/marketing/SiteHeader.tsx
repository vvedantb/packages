import { useEffect, useState, type ReactNode } from "react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { AppWordmark, type ProductAppName } from "../brand/AppWordmark";
import { GitHubIcon } from "../logos";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../utils/cn";
import { landingClasses, landingShellClass } from "./marketing-classes";

/** Wordmark text size in px. The icon is `Math.round(20 * 1.4)` = 28px. There is no size prop. */
export const SITE_HEADER_WORDMARK_SIZE = 20;

const MAX_LINKS = 4;

export type SiteHeaderLink = { label: string; href: string };

export type SiteHeaderProps = {
  /** Product app id for `AppWordmark`. */
  app: ProductAppName;
  /** Home link `href`. Default `#home`. */
  homeHref?: string;
  /** `aria-label` of the home wordmark link. */
  homeLabel: string;
  /** Up to 4 section links, shown from `md`. More than 4 logs a development warning. */
  links: readonly SiteHeaderLink[];
  /**
   * Exactly one call to action, for example the app's Clerk "Sign in" or "Open <App>" button, or "Get the app".
   * Pass a `Button` with the default variant, `size="sm"` and `className="rounded-full"`. It shows in the bar from `md`
   * and below `md` it sits full width in the menu.
   */
  cta: ReactNode;
  /** Optional GitHub URL. An icon button from `sm`, and the last item in the mobile menu. */
  githubUrl?: string;
  className?: string;
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function SiteHeaderMenu({ links, cta, githubUrl }: Pick<SiteHeaderProps, "links" | "cta" | "githubUrl">) {
  const [open, setOpen] = useState(false);
  const Icon = open ? IconX : IconMenu2;
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={open ? "Close menu" : "Open menu"} className="md:hidden">
          <Icon size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[70dvh] w-[calc(100vw-2.5rem)] max-w-none overflow-y-auto sm:w-[calc(100vw-4rem)]"
      >
        {links.slice(0, MAX_LINKS).map((link) => (
          <DropdownMenuItem key={link.href} asChild className="max-sm:py-2.5">
            <a href={link.href}>{link.label}</a>
          </DropdownMenuItem>
        ))}
        <div data-site-header-cta="" className="p-1 [&>*]:w-full">
          {cta}
        </div>
        {githubUrl ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="max-sm:py-2.5">
              <a href={githubUrl} target="_blank" rel="noreferrer">
                <GitHubIcon size={16} />
                GitHub
              </a>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Marketing header for the Project V apps: sticky, blurred, `AppWordmark` at `SITE_HEADER_WORDMARK_SIZE`, up to four
 * links, one `cta` and an optional GitHub button. Below `md` the links, the CTA and GitHub move into one dropdown menu.
 * Plain markup with no motion, so any app can use it.
 */
export function SiteHeader({ app, homeHref = "#home", homeLabel, links, cta, githubUrl, className }: SiteHeaderProps) {
  const tooMany = links.length > MAX_LINKS;
  useEffect(() => {
    if (!tooMany) return;
    const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV;
    if (nodeEnv === "production") return;
    console.warn(`[SiteHeader] SiteHeader supports at most ${MAX_LINKS} links. Received ${links.length}.`);
  }, [tooMany, links.length]);

  const shown = links.slice(0, MAX_LINKS);
  return (
    <header className={cn("sticky top-0 z-50 border-b border-separator bg-background/80 backdrop-blur-md", className)}>
      <div className={cn(landingShellClass, "flex h-14 items-center justify-between gap-3 sm:h-16")}>
        <a href={homeHref} className={cn("group min-w-0 shrink-0 rounded-lg", focusRing)} aria-label={homeLabel}>
          <AppWordmark app={app} size={SITE_HEADER_WORDMARK_SIZE} />
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Page">
          {shown.map((link) => (
            <a key={link.href} href={link.href} className={landingClasses.navLink}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          {githubUrl ? (
            <Button asChild variant="ghost" size="icon-sm" className="hidden sm:inline-flex">
              <a href={githubUrl} target="_blank" rel="noreferrer" aria-label={`${app} on GitHub`}>
                <GitHubIcon size={18} />
              </a>
            </Button>
          ) : null}
          <div className="hidden md:flex">{cta}</div>
          <SiteHeaderMenu links={shown} cta={cta} githubUrl={githubUrl} />
        </div>
      </div>
    </header>
  );
}
