import type { AppName } from "./svg";

export type FamilyApp = {
  app: AppName;
  /** Display name. */
  name: string;
  /** Home page of the app. */
  url: string;
};

/** Single source for family app display names and sites, in display order. */
export const FAMILY_APPS: readonly FamilyApp[] = [
  { app: "vibot", name: "Vibot", url: "https://vibot.projectv.uk/" },
  { app: "verve", name: "Verve", url: "https://verve.projectv.uk/" },
  { app: "velth", name: "Velth", url: "https://velth.projectv.uk/" },
  { app: "vmem", name: "Vmem", url: "https://vmem.projectv.uk/" },
  { app: "vhub", name: "Vhub", url: "https://vhub.projectv.uk/" },
  { app: "projectv", name: "Project V", url: "https://projectv.uk/" },
];

/** Entry of `FAMILY_APPS` for an app. */
export function familyApp(app: AppName): FamilyApp {
  return FAMILY_APPS.find((entry) => entry.app === app)!;
}
