import { familyApp } from "../brand/familyApps";

/** The Project V phone apps, in display order. */
export type ProjectVMobileAppId = "vibot" | "verve" | "velth" | "vmem" | "vstore";

export type ProjectVMobileApp = {
  id: ProjectVMobileAppId;
  /** Display name. */
  name: string;
  /** One line for a settings row. */
  description: string;
  /** Android application id. */
  androidPackage: string;
  /** The app's URL scheme, without `://`. */
  scheme: string;
  /** Home page of the app: the fallback when neither the app nor V Store is installed. */
  website: string;
};

/**
 * V Store's home screen. V Store's `app/[id]` route takes the app's Convex
 * document `_id`, not its catalog id or Android package, and native-ui cannot
 * know live Convex ids. So the store step opens V Store's home, not the app's page.
 */
export const VSTORE_HOME_URL = "vstore://";

// Names and sites come from `FAMILY_APPS` where it has the app. V Store is not
// a family app there (that file is a byte-identical copy of `@vvedantb/ui`).
const vibot = familyApp("vibot");
const verve = familyApp("verve");
const velth = familyApp("velth");
const vmem = familyApp("vmem");

/** The five Project V phone apps, in display order. */
export const PROJECT_V_MOBILE_APPS: readonly ProjectVMobileApp[] = [
  {
    id: "vibot",
    name: vibot.name,
    description: "AI chat, agents and tools",
    androidPackage: "com.projectvdotuk.vibot",
    scheme: "vibot",
    website: vibot.url,
  },
  {
    id: "verve",
    name: verve.name,
    description: "Notes, pages and writing",
    androidPackage: "com.projectvdotuk.verve",
    scheme: "verve",
    website: verve.url,
  },
  {
    id: "velth",
    name: velth.name,
    description: "Health insights and camera scans",
    androidPackage: "com.projectvdotuk.velth",
    scheme: "velth",
    website: velth.url,
  },
  {
    id: "vmem",
    name: vmem.name,
    description: "Your personal memory",
    androidPackage: "com.projectvdotuk.vmem",
    scheme: "vmem",
    website: vmem.url,
  },
  {
    id: "vstore",
    name: "V Store",
    description: "Install Project V apps",
    androidPackage: "com.projectvdotuk.vstore",
    scheme: "vstore",
    website: "https://v-store-chi.vercel.app",
  },
];

/** Entry of `PROJECT_V_MOBILE_APPS` for an app. */
export function projectVMobileApp(id: ProjectVMobileAppId): ProjectVMobileApp {
  return PROJECT_V_MOBILE_APPS.find((app) => app.id === id)!;
}

/** The phone apps other than `current`, in display order. */
export function otherProjectVMobileApps(current?: ProjectVMobileAppId): ProjectVMobileApp[] {
  return PROJECT_V_MOBILE_APPS.filter((app) => app.id !== current);
}

/** Android intent URL that opens the installed app with this package. */
export function androidIntentUrl(app: ProjectVMobileApp): string {
  return `intent://#Intent;scheme=${app.scheme};package=${app.androidPackage};end`;
}

/** How `openProjectVApp` opened an app. */
export type ProjectVOpenTarget = "app" | "store" | "website";

/** One URL to try, in order. `check`: ask `canOpenURL` first; otherwise try `openURL` and move on if it fails. */
export type ProjectVOpenStep = {
  target: ProjectVOpenTarget;
  url: string;
  check: boolean;
};

/**
 * The URLs `openProjectVApp` tries, in order: the app's scheme; on Android an
 * intent to its package; V Store's home (`VSTORE_HOME_URL`); the website.
 */
export function projectVAppOpenSteps(id: ProjectVMobileAppId, os: string): ProjectVOpenStep[] {
  const app = projectVMobileApp(id);
  const steps: ProjectVOpenStep[] = [{ target: "app", url: `${app.scheme}://`, check: true }];
  if (os === "android") steps.push({ target: "app", url: androidIntentUrl(app), check: false });
  if (id !== "vstore") steps.push({ target: "store", url: VSTORE_HOME_URL, check: true });
  steps.push({ target: "website", url: app.website, check: false });
  return steps;
}

/** The part of React Native `Linking` that `openProjectVApp` uses. */
export type ProjectVLinking = {
  canOpenURL(url: string): Promise<boolean>;
  openURL(url: string): Promise<unknown>;
};

/**
 * Opens a Project V app: the app if installed, else V Store's home if V Store
 * is installed, else its website. Resolves to what it opened, or
 * `null` when every URL failed. Pass React Native `Linking` and `Platform.OS`.
 *
 * `canOpenURL` needs the schemes declared by the calling app:
 * `LSApplicationQueriesSchemes` on iOS and `<queries>` on Android 11+.
 */
export async function openProjectVApp(
  id: ProjectVMobileAppId,
  linking: ProjectVLinking,
  os: string,
): Promise<ProjectVOpenTarget | null> {
  for (const step of projectVAppOpenSteps(id, os)) {
    try {
      if (step.check && !(await linking.canOpenURL(step.url))) continue;
      await linking.openURL(step.url);
      return step.target;
    } catch {
      // Not installed, or no handler: try the next URL.
    }
  }
  return null;
}
