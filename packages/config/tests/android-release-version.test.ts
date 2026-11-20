import { describe, expect, it } from "vitest";
import {
  compareSemver,
  highestSemver,
  pickAndroidReleaseVersion,
  publishedVersionNames,
  type PickAndroidReleaseVersionInput,
} from "../src/index.js";

const base: PickAndroidReleaseVersionInput = {
  tagPrefix: "eva-v",
  versionCodeFloor: "1000",
  versionNameSource: "default_version_name",
  appVersion: "1.0.0",
  published: { tags: ["eva-v1.0.1", "eva-v1.0.9", "eva-v1.0.10"], highestVersionCode: 1042 },
};

function pick(overrides: Partial<PickAndroidReleaseVersionInput>) {
  return pickAndroidReleaseVersion({ ...base, ...overrides });
}

describe("semver helpers", () => {
  it("compares numerically, not as text", () => {
    expect(compareSemver("1.0.10", "1.0.9")).toBeGreaterThan(0);
    expect(highestSemver(["1.0.9", "1.0.10", "0.9.99"])).toBe("1.0.10");
    expect(highestSemver([])).toBeUndefined();
  });

  it("derives names from tag suffixes and ignores non-semver tags", () => {
    expect(
      publishedVersionNames("eva-v", ["eva-v1.0.1", "eva-v1.0.2-beta", "eva-vlatest", "eva-v01.0.0", "other-1.0.0"]),
    ).toStrictEqual(["1.0.1"]);
  });
});

describe("pickAndroidReleaseVersion default_version_name", () => {
  it("bumps the patch of the highest published version and the versionCode", () => {
    expect(pick({})).toStrictEqual({
      versionName: "1.0.11",
      versionCode: 1043,
      tag: "eva-v1.0.11",
      previousTag: "eva-v1.0.10",
    });
  });

  it("uses the app.config floor when it is higher than every published version", () => {
    expect(pick({ appVersion: "2.0.0" }).versionName).toBe("2.0.1");
  });

  it("starts from the floor with an empty history", () => {
    expect(pick({ published: { tags: [] } })).toStrictEqual({
      versionName: "1.0.1",
      versionCode: 1000,
      tag: "eva-v1.0.1",
      previousTag: "",
    });
  });

  it("ignores non-semver tags for versionName", () => {
    const result = pick({ published: { tags: ["eva-vlatest", "eva-v1.0.3-rc1", "eva-v1.0.2"], highestVersionCode: 1005 } });
    expect(result.versionName).toBe("1.0.3");
    expect(result.previousTag).toBe("eva-v1.0.2");
  });

  it("counts a missing release.json as versionCode 1, raised to the floor", () => {
    const result = pick({ published: { tags: ["eva-v1.0.1"], highestVersionCode: undefined } });
    expect(result.versionCode).toBe(1000);
    expect(pick({ versionCodeFloor: "1", published: { tags: ["eva-v1.0.1"] } }).versionCode).toBe(2);
  });

  it("takes the version input", () => {
    expect(pick({ inputVersion: "3.1.0" })).toMatchObject({ versionName: "3.1.0", tag: "eva-v3.1.0" });
    expect(() => pick({ inputVersion: "3.1" })).toThrow("version must look like 1.0.1.");
  });

  it("throws when the app.config floor is not semver", () => {
    expect(() => pick({ appVersion: "" })).toThrow("DEFAULT_VERSION_NAME");
  });
});

describe("pickAndroidReleaseVersion app_json", () => {
  const appJson: Partial<PickAndroidReleaseVersionInput> = {
    versionNameSource: "app_json",
    appVersion: "1.0.0",
  };

  it("bumps the highest published version when expo.version is lower", () => {
    expect(pick(appJson)).toMatchObject({ versionName: "1.0.11", previousTag: "eva-v1.0.10" });
  });

  it("uses expo.version when it is higher than the bump", () => {
    expect(pick({ ...appJson, appVersion: "1.1.0" }).versionName).toBe("1.1.0");
  });

  it("uses expo.version with nothing published", () => {
    expect(pick({ ...appJson, appVersion: "1.4.0", published: { tags: [] } })).toMatchObject({
      versionName: "1.4.0",
      versionCode: 1000,
      previousTag: "",
    });
  });

  it("bumps when expo.version is missing", () => {
    expect(pick({ ...appJson, appVersion: undefined }).versionName).toBe("1.0.11");
    expect(() => pick({ ...appJson, appVersion: undefined, published: { tags: [] } })).toThrow(
      "versionName must be X.Y.Z",
    );
  });

  it("rejects a version that is already published", () => {
    expect(() => pick({ ...appJson, inputVersion: "1.0.9" })).toThrow(
      "versionName 1.0.9 is already published in eva-v1.0.9.",
    );
  });

  it("rejects a version that is not higher than the highest published", () => {
    expect(() => pick({ ...appJson, inputVersion: "1.0.5" })).toThrow(
      "versionName 1.0.5 must be higher than 1.0.10",
    );
  });
});

describe("pickAndroidReleaseVersion tag push", () => {
  it("uses the tag's version and keeps the pushed tag", () => {
    expect(pick({ tagPush: "eva-v1.2.0" })).toMatchObject({ versionName: "1.2.0", tag: "eva-v1.2.0" });
  });

  it("rejects a tag without the prefix or without a semver suffix", () => {
    expect(() => pick({ tagPush: "other-v1.0.0" })).toThrow("does not start with eva-v");
    expect(() => pick({ tagPush: "eva-vnext" })).toThrow("must be eva-v followed by a versionName");
  });

  it("rejects a version input that differs from the tag", () => {
    expect(() => pick({ tagPush: "eva-v1.2.0", inputVersion: "1.3.0" })).toThrow(
      "The version input (1.3.0) does not match the tag eva-v1.2.0.",
    );
  });
});

describe("pickAndroidReleaseVersion versionCode", () => {
  it("is the higher of highest published + 1 and the floor", () => {
    expect(pick({ versionCodeFloor: "5000" }).versionCode).toBe(5000);
    expect(pick({ versionCodeFloor: "10" }).versionCode).toBe(1043);
  });

  it("lets the version_code input raise but not lower the minimum", () => {
    expect(pick({ inputVersionCode: "2000" }).versionCode).toBe(2000);
    expect(() => pick({ inputVersionCode: "1042" })).toThrow("must be a whole number of at least 1043");
    expect(() => pick({ inputVersionCode: "abc" })).toThrow("version_code 'abc'");
  });

  it("rejects a bad floor", () => {
    expect(() => pick({ versionCodeFloor: "0" })).toThrow("version_code_floor must be a whole number from 1.");
    expect(() => pick({ versionCodeFloor: "" })).toThrow("version_code_floor");
  });
});
