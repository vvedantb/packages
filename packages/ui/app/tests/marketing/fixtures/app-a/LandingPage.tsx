import { LandingAmbientGraph } from "../stubs";
import { LandingAppStage } from "../stubs";
import { LandingCta } from "./LandingCta";
import { LandingFooter } from "./LandingFooter";
import { LandingHero } from "./LandingHero";
import { LandingHowItWorks } from "../stubs";
import { LandingNav } from "./LandingNav";
import { LandingRecallDemo } from "../stubs";
import { LandingSurfaces } from "../stubs";

export function LandingPage() {
  return (
    <div
      id="top"
      className="relative min-h-[100dvh] bg-background text-foreground"
    >
      <LandingNav />

      <main>
        <div className="landing-atmosphere landing-grain relative overflow-hidden border-b border-separator">
          <LandingAmbientGraph />
          <LandingHero />
        </div>

        <LandingAppStage />
        <LandingRecallDemo />
        <LandingHowItWorks />
        <LandingSurfaces />
        <LandingCta />
      </main>

      <LandingFooter />
    </div>
  );
}
