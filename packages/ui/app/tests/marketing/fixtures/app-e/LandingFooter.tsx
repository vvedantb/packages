import { SignInButton } from "../stubs";
import { Button } from "../../../../../src/index";
import { AppIcon } from "../stubs";
import { AppELandingWordmark } from "../stubs";
import { clerkConfigured } from "../stubs";
import { LANDING_NAV_LINKS, APP_E_GITHUB_URL } from "./landingContent";
import { landingShellClass } from "./LandingReveal";

export function LandingFooter() {
  return (
    <footer className="border-t border-separator">
      <div
        className={`${landingShellClass} flex flex-col gap-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-10 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div>
          <AppELandingWordmark />
          <p className="mt-3 max-w-sm text-pretty text-xs leading-relaxed text-muted">
            Your own hub for MCP connections and agent secrets. Skills in
            app-a.
          </p>
        </div>
        <nav
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
          aria-label="Footer"
        >
          {LANDING_NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="max-sm:py-1 text-sm text-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          {clerkConfigured() ? (
            <SignInButton mode="modal">
              <Button
                variant="link"
                className="h-auto p-0 text-sm text-muted hover:text-foreground"
              >
                Sign in
              </Button>
            </SignInButton>
          ) : (
            <a
              href="#instance-key"
              className="max-sm:py-1 text-sm text-muted hover:text-foreground"
            >
              Sign in
            </a>
          )}
          <a
            href={APP_E_GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="app-e on GitHub"
            className="max-sm:py-1 text-muted hover:text-foreground"
          >
            <AppIcon name="GitHub" size={18} framed={false} />
          </a>
        </nav>
      </div>
    </footer>
  );
}
