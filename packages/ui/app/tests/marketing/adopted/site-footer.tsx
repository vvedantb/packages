// LandingFooter.tsx of app-b, app-c and app-d after adopting `SiteFooter`.
import { IconBrandGithub, IconBrandLinkedin, IconBrandTwitter } from "@tabler/icons-react";
import { SiteFooter, type SiteFooterLink } from "../../../../src/index";

const LEGAL_LINKS = [
  { href: "https://example.com/privacy", label: "Privacy Policy" },
  { href: "https://example.com/terms", label: "Terms of Service" },
];

const appImage = (name: string, alt: string) => ({ src: `https://example.com/${name}.png`, alt });

// --- app-b: LandingFooter.tsx ---
export function AppBLandingFooter() {
  return (
    <SiteFooter
      brand="APP-B"
      tagline="AI-powered assistant designed to automate tasks, and enhance productivity effortlessly."
      socials={[
        { href: "https://twitter.com", icon: IconBrandTwitter },
        { href: "https://linkedin.com", icon: IconBrandLinkedin },
        { href: "https://github.com", icon: IconBrandGithub },
      ]}
      columns={[
        {
          heading: "Navigation",
          links: [
            { href: "#features", label: "Features" },
            { href: "#tools", label: "Tools" },
            { href: "#benefits", label: "Everything else" },
          ],
        },
        {
          heading: "Apps",
          links: [
            { href: "#home", label: "App B", image: appImage("app-b", "App B") },
            { href: "#features", label: "App D", image: appImage("app-d", "App D") },
            { href: "#pricing", label: "App C", image: appImage("app-c", "App C") },
          ],
        },
      ]}
      name="App B"
      legalLinks={LEGAL_LINKS}
    />
  );
}

// --- app-c: LandingFooter.tsx ---
export function AppCLandingFooter() {
  return (
    <SiteFooter
      variant="muted-foreground"
      brand="APP-C"
      tagline="The ultimate productivity suite — AI notes, tasks, habits, and focus tools in one minimal workspace."
      socials={[
        { href: "https://twitter.com", icon: IconBrandTwitter },
        { href: "https://linkedin.com", icon: IconBrandLinkedin },
        { href: "https://github.com", icon: IconBrandGithub },
      ]}
      columns={[
        {
          heading: "Navigation",
          links: [
            { href: "#features", label: "Features" },
            { href: "#benefits", label: "Benefits" },
            { href: "#testimonials", label: "Testimonials" },
          ],
        },
        {
          heading: "Apps",
          links: [
            { href: "https://app-b.app", label: "App B", external: true, image: appImage("app-b", "App B") },
            { href: "https://app-d.app", label: "App D", external: true, image: appImage("app-d", "App D") },
            { href: "#home", label: "App C", image: appImage("app-c", "App C") },
          ],
        },
      ]}
      name="App C"
      legalLinks={LEGAL_LINKS}
    />
  );
}

// --- app-d: LandingFooter.tsx ---
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.example.app-d";

const APP_D_NAV_LINKS: SiteFooterLink[] = [
  { href: "#features", label: "Features" },
  { href: "#why", label: "Why App D" },
  { href: "#more", label: "More features" },
  { href: PLAY_STORE_URL, label: "Get the app", external: true },
];

export function AppDLandingFooter() {
  return (
    <SiteFooter
      variant="touch"
      brand="APP-D"
      tagline="Track vitals, manage medications, and stay on top of appointments — all from one health app."
      socials={[
        { href: "https://twitter.com", icon: IconBrandTwitter, label: "App D on Twitter" },
        { href: "https://linkedin.com", icon: IconBrandLinkedin, label: "App D on LinkedIn" },
        { href: "https://github.com", icon: IconBrandGithub, label: "App D on GitHub" },
      ]}
      columns={[
        { heading: "Navigation", links: APP_D_NAV_LINKS },
        {
          heading: "Apps",
          links: [
            { href: "https://app-b.example.com", label: "App B", external: true, image: appImage("app-b", "App B") },
            { href: "https://app-d.example.com", label: "App D", image: appImage("app-d", "App D") },
            { href: "https://app-c.example.com", label: "App C", external: true, image: appImage("app-c", "App C") },
          ],
        },
      ]}
      name="App D"
      legalLinks={LEGAL_LINKS}
    />
  );
}
