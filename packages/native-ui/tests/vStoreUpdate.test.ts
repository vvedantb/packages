import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchVStoreUpdate, V_STORE_SITE_URL } from "../src/updateCheck";

const FALLBACK = "vstore://updates";

/** Makes `fetch` answer once with this status and JSON body, and returns the spy. */
function answer(status: number, body: object) {
  const spy = vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchVStoreUpdate", () => {
  it("offers V Store's version when it is newer, with the app's download link", async () => {
    const spy = answer(200, { packageName: "com.example.notes", versionName: "1.4.0" });
    const update = await fetchVStoreUpdate(
      { packageName: "com.example.notes", downloadUrl: (version) => `https://example.com/notes-${version}.apk` },
      "1.3.2",
      FALLBACK,
    );
    expect(update).toEqual({ version: "1.4.0", url: "https://example.com/notes-1.4.0.apk" });
    expect(spy.mock.calls[0]?.[0]).toBe(`${V_STORE_SITE_URL}/latest-version?package=com.example.notes`);
  });

  it("uses the fallback link when the app has no download link", async () => {
    answer(200, { packageName: "com.example.notes", versionName: "1.4.0" });
    expect(await fetchVStoreUpdate({ packageName: "com.example.notes" }, "1.3.2", FALLBACK)).toEqual({
      version: "1.4.0",
      url: FALLBACK,
    });
  });

  it("offers nothing for the same version, an unknown app or another answer", async () => {
    answer(200, { packageName: "com.example.notes", versionName: "1.3.2" });
    expect(await fetchVStoreUpdate({ packageName: "com.example.notes" }, "1.3.2", FALLBACK)).toBeNull();
    answer(404, { error: "This app is not in the V Store catalog." });
    expect(await fetchVStoreUpdate({ packageName: "com.example.other" }, "1.3.2", FALLBACK)).toBeNull();
    answer(200, { version: "9.9.9" });
    expect(await fetchVStoreUpdate({ packageName: "com.example.notes" }, "1.3.2", FALLBACK)).toBeNull();
  });
});
