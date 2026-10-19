import { SignUpButton } from "../stubs";
import { IconArrowRight } from "@tabler/icons-react";
import { Button } from "../../../../../src/index";
import { clerkConfigured } from "../stubs";
import { LandingReveal, landingShellClass } from "./LandingReveal";

export function LandingCta() {
  return (
    <div className="landing-atmosphere landing-grain relative overflow-hidden border-t border-separator">
      <section className={`${landingShellClass} relative z-10 py-20 sm:py-28`}>
        <LandingReveal className="flex flex-col items-center text-center">
          <h2 className="max-w-2xl text-balance font-semibold text-3xl leading-[1.1] tracking-[-0.03em] text-foreground sm:text-5xl">
            Put every MCP behind one key
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-base">
            Connect the catalog, store credentials in the vault, leave skills
            in app-a.
          </p>
          <div className="mt-9">
            {clerkConfigured() ? (
              <SignUpButton mode="modal">
                <Button size="lg" className="sm:min-w-40">
                  Get started
                  <IconArrowRight size={16} aria-hidden />
                </Button>
              </SignUpButton>
            ) : (
              <Button asChild size="lg" className="sm:min-w-40">
                <a href="#instance-key">
                  Open console
                  <IconArrowRight size={16} aria-hidden />
                </a>
              </Button>
            )}
          </div>
        </LandingReveal>
      </section>
    </div>
  );
}
