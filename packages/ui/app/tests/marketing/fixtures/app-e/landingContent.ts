export const APP_E_GITHUB_URL = "https://github.com/vvedantb/app-e";

export const LANDING_NAV_LINKS = [
  { href: "#gateway", label: "Gateway" },
  { href: "#vault", label: "Vault" },
  { href: "#keys", label: "API keys" },
  { href: "#integrations", label: "Integrations" },
  { href: "#connect", label: "Connect" },
] as const;

export const LANDING_HERO_CAPABILITIES = [
  "MCP gateway",
  "Encrypted vault",
  "API keys",
  "app-a skills",
] as const;

/** Catalog presets plus common vault/key names shown on the landing strip. */
export const LANDING_INTEGRATIONS = [
  { name: "Eva" },
  { name: "app-a" },
  { name: "App C" },
  { name: "app-b" },
  { name: "App D" },
  { name: "Notion" },
  { name: "Linear" },
  { name: "Slack" },
  { name: "Gmail" },
  { name: "Google Drive" },
  { name: "Google Calendar" },
  { name: "GitHub" },
  { name: "Vercel" },
  { name: "Cloudflare" },
  { name: "Supabase" },
  { name: "Stripe" },
  { name: "Clerk" },
  { name: "Convex" },
  { name: "X" },
  { name: "Sentry" },
  { name: "Cursor" },
  { name: "OpenAI" },
] as const;
