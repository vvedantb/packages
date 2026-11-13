import { describe, expect, it, vi } from "vitest";
import { FAMILY_APPS } from "../src/brand/familyApps";
import {
  PROJECT_V_MOBILE_APPS,
  androidIntentUrl,
  openProjectVApp,
  otherProjectVMobileApps,
  projectVAppOpenSteps,
  projectVMobileApp,
  VSTORE_HOME_URL,
  type ProjectVLinking,
} from "../src/settings/projectVMobileApps";

/** A `Linking` stub: `installed` schemes pass `canOpenURL`; `openURL` rejects URLs in `failing`. */
function linking(installed: string[], failing: string[] = []) {
  const opened: string[] = [];
  const stub: ProjectVLinking = {
    canOpenURL: vi.fn(async (url: string) => installed.some((scheme) => url.startsWith(`${scheme}://`))),
    openURL: vi.fn(async (url: string) => {
      if (failing.some((prefix) => url.startsWith(prefix))) throw new Error(`No activity for ${url}`);
      opened.push(url);
    }),
  };
  return { stub, opened };
}

describe("PROJECT_V_MOBILE_APPS", () => {
  it("lists the five phone apps in order", () => {
    expect(PROJECT_V_MOBILE_APPS.map((app) => app.id)).toEqual(["vibot", "verve", "velth", "vmem", "vstore"]);
    expect(PROJECT_V_MOBILE_APPS.map((app) => app.name)).toEqual(["vibot", "Verve", "Velth", "vmem", "V Store"]);
  });

  it("has the Android packages, schemes and websites", () => {
    for (const app of PROJECT_V_MOBILE_APPS) {
      expect(app.androidPackage).toBe(`com.projectvdotuk.${app.id}`);
      expect(app.scheme).toBe(app.id);
      expect(app.description.length).toBeGreaterThan(0);
      expect(app.description).not.toMatch(/\n/);
    }
    expect(projectVMobileApp("vstore").website).toBe("https://v-store-chi.vercel.app");
    // The family apps take their name and site from FAMILY_APPS.
    for (const id of ["vibot", "verve", "velth", "vmem"] as const) {
      const family = FAMILY_APPS.find((entry) => entry.app === id)!;
      expect(projectVMobileApp(id).name).toBe(family.name);
      expect(projectVMobileApp(id).website).toBe(family.url);
    }
  });

  it("leaves out the current app", () => {
    expect(otherProjectVMobileApps("velth").map((app) => app.id)).toEqual(["vibot", "verve", "vmem", "vstore"]);
    expect(otherProjectVMobileApps("vstore").map((app) => app.id)).toEqual(["vibot", "verve", "velth", "vmem"]);
    expect(otherProjectVMobileApps()).toHaveLength(5);
  });

  it("builds the V Store and Android intent URLs", () => {
    // V Store's `app/[id]` takes a Convex `_id`, so the store step opens its home.
    expect(VSTORE_HOME_URL).toBe("vstore://");
    expect(androidIntentUrl(projectVMobileApp("verve"))).toBe(
      "intent://#Intent;scheme=verve;package=com.projectvdotuk.verve;end",
    );
  });
});

describe("projectVAppOpenSteps", () => {
  it("tries the app, then V Store, then the website on iOS", () => {
    expect(projectVAppOpenSteps("vibot", "ios")).toEqual([
      { target: "app", url: "vibot://", check: true },
      { target: "store", url: "vstore://", check: true },
      { target: "website", url: "https://vibot.projectv.uk", check: false },
    ]);
  });

  it("adds the package intent on Android", () => {
    expect(projectVAppOpenSteps("velth", "android").map((step) => step.url)).toEqual([
      "velth://",
      "intent://#Intent;scheme=velth;package=com.projectvdotuk.velth;end",
      "vstore://",
      "https://velth.projectv.uk",
    ]);
  });

  it("does not send V Store to itself", () => {
    expect(projectVAppOpenSteps("vstore", "ios").map((step) => step.target)).toEqual(["app", "website"]);
  });
});

describe("openProjectVApp", () => {
  it("opens the app when it is installed", async () => {
    const { stub, opened } = linking(["verve", "vstore"]);
    await expect(openProjectVApp("verve", stub, "ios")).resolves.toBe("app");
    expect(opened).toEqual(["verve://"]);
  });

  it("opens V Store's home when only V Store is installed", async () => {
    const { stub, opened } = linking(["vstore"]);
    await expect(openProjectVApp("vmem", stub, "ios")).resolves.toBe("store");
    expect(opened).toEqual(["vstore://"]);
  });

  it("falls back to the website", async () => {
    const { stub, opened } = linking([]);
    await expect(openProjectVApp("vibot", stub, "ios")).resolves.toBe("website");
    expect(opened).toEqual(["https://vibot.projectv.uk"]);
  });

  it("opens the package intent on Android when the scheme check fails", async () => {
    const { stub, opened } = linking([]);
    await expect(openProjectVApp("velth", stub, "android")).resolves.toBe("app");
    expect(opened).toEqual(["intent://#Intent;scheme=velth;package=com.projectvdotuk.velth;end"]);
  });

  it("moves on from a failed intent to V Store, then the website on Android", async () => {
    const store = linking(["vstore"], ["intent:"]);
    await expect(openProjectVApp("velth", store.stub, "android")).resolves.toBe("store");
    expect(store.opened).toEqual(["vstore://"]);
    const web = linking([], ["intent:"]);
    await expect(openProjectVApp("velth", web.stub, "android")).resolves.toBe("website");
    expect(web.opened).toEqual(["https://velth.projectv.uk"]);
  });

  it("treats a rejected canOpenURL as not installed, and resolves null when nothing opens", async () => {
    const stub: ProjectVLinking = {
      canOpenURL: vi.fn(async () => {
        throw new Error("not declared");
      }),
      openURL: vi.fn(async () => {
        throw new Error("no browser");
      }),
    };
    await expect(openProjectVApp("verve", stub, "ios")).resolves.toBeNull();
    expect(stub.openURL).toHaveBeenCalledWith("https://verve.projectv.uk");
  });
});
