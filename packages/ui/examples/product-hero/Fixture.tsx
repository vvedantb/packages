import { useEffect, useState } from "react";
// The client entry, so the fixture runs without building `@vvedantb/server`.
import { ProductHero, type ProductHeroProps } from "../../src/client";

type AppId = "vibot" | "verve" | "velth" | "vmem" | "vhub";

type ExampleConfig = Pick<ProductHeroProps, "title" | "tagline" | "primaryCta" | "secondaryCta" | "signIn" | "visualLabel" | "userCount">;

const V_STORE_DOWNLOAD_URL = "https://projectv.uk/download/v-store";

// The live headlines and taglines from docs/audits/v-apps-hero-audit.md. App names live only in this example.
const EXAMPLES: Record<AppId, ExampleConfig> = {
  vibot: {
    title: "Make a bot. Keep the chat going.",
    tagline: "Each bot has its own ongoing chat and its own memory. vibot is your default bot. It sends each message to the bot that should answer.",
    primaryCta: { label: "Try vibot free", href: "#try-vibot-free" },
    secondaryCta: { label: "See what it does", href: "#see-what-it-does" },
    signIn: { href: "#sign-in" },
    visualLabel: "Rings orbiting a glowing core",
    userCount: 1284, // In an app: from a Convex action wrapping `clerk.users.getCount()`. `undefined` while loading.
  },
  verve: {
    title: "Minimal by design, powerful by action",
    tagline: "verve replaces the five apps you switch between. Write with AI that knows your notes, track what you have to do, and keep the dates and habits that matter in view.",
    primaryCta: { label: "Get started", href: "#get-started" },
    signIn: { href: "#sign-in" },
    userCount: 1284,
  },
  velth: {
    title: "Your health, your control",
    tagline: "Log a blood pressure reading in ten seconds. Scan the meter instead of typing. Never miss a dose. Walk into your next appointment with the whole picture, not a vague memory.",
    primaryCta: { label: "Try the demo", href: "#demo" },
    secondaryCta: { label: "Download on V Store", href: V_STORE_DOWNLOAD_URL, rel: "nofollow" },
    // The live site has no Sign in, so none here: this case covers the zero path.
  },
  vmem: {
    title: "Memory your agents can actually use",
    tagline: "Store context from chats and tools, connect it in a graph, and retrieve the slice that matters — with a Context Trace that shows why each memory matched.",
    primaryCta: { label: "Get started", href: "#get-started" },
    signIn: { href: "#sign-in" },
    visualLabel: "Rings orbiting a glowing core",
  },
  vhub: {
    title: "Every agent. One hub.",
    tagline:
      "Sign in, connect your MCP servers once (vmem, verve, vibot, velth, or any streamable-HTTP MCP) and keep agent API keys in an encrypted vault. Your agents get a single /mcp endpoint with only your tools. Everything is private to your account.",
    primaryCta: { label: "Get started", href: "#get-started" },
    signIn: {}, // No href: renders a button, which covers the `onClick` path.
  },
};

const params = new URLSearchParams(window.location.search);
const requested = params.get("app");
const app: AppId = requested && requested in EXAMPLES ? (requested as AppId) : "vibot";

/** Placeholder concept visual: CSS pulse and orbit rings. Not an app replica. */
function OrbitVisual() {
  return (
    <div className="orbit" data-testid="orbit-visual">
      <span className="orbit-ring orbit-ring-3"><span className="orbit-dot" /></span>
      <span className="orbit-ring orbit-ring-2"><span className="orbit-dot" /></span>
      <span className="orbit-ring orbit-ring-1"><span className="orbit-dot" /></span>
      <span className="orbit-core" />
    </div>
  );
}

export function Fixture() {
  const [clicked, setClicked] = useState("none");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", params.get("theme") === "dark");
  }, []);

  // Each action records its click so a browser test can assert it. Hash links still navigate.
  const track = (name: string, cta?: ExampleConfig["primaryCta"]) => cta && { ...cta, onClick: () => setClicked(name) };
  const config = EXAMPLES[app];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <ProductHero
        title={config.title}
        tagline={config.tagline}
        primaryCta={track("primary", config.primaryCta)!}
        secondaryCta={track("secondary", config.secondaryCta)}
        signIn={config.signIn && { ...config.signIn, onClick: () => setClicked("sign-in") }}
        visual={<OrbitVisual />}
        visualLabel={config.visualLabel}
        userCount={config.userCount}
      />
      <p className="mx-auto max-w-6xl px-5 text-xs text-muted-foreground" data-testid="hero-status">
        Last click: {clicked}
      </p>
    </main>
  );
}
