import { LandingCta } from "./LandingCta";
import { LandingConnect } from "../stubs";
import { LandingFeatures } from "../stubs";
import { LandingFooter } from "./LandingFooter";
import { LandingHero } from "./LandingHero";
import { LandingIntegrations } from "../stubs";
import { LandingNav } from "./LandingNav";

export function LandingPage() {
  return (
    <div
      id="top"
      className="relative min-h-[100dvh] bg-background text-foreground"
    >
      <LandingNav />
      <main>
        <div className="landing-atmosphere landing-grain relative overflow-hidden border-b border-separator">
          <LandingHero />
        </div>
        <LandingFeatures />
        <LandingIntegrations />
        <LandingConnect />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
