import { describe, expect, it, vi } from "vitest";
import {
  convexSiteToCloudUrl,
  createConvexAdminClient,
  parseConvexApiResponse,
} from "@vvedantb/server";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

describe("convexSiteToCloudUrl", () => {
  it("rewrites a .convex.site URL to .convex.cloud", () => {
    expect(convexSiteToCloudUrl("https://happy-animal-123.convex.site")).toBe(
      "https://happy-animal-123.convex.cloud",
    );
  });

  it("leaves a cloud or self-hosted URL unchanged", () => {
    expect(convexSiteToCloudUrl("https://happy-animal-123.convex.cloud")).toBe(
      "https://happy-animal-123.convex.cloud",
    );
    expect(convexSiteToCloudUrl("http://127.0.0.1:3210")).toBe("http://127.0.0.1:3210");
  });
});

describe("parseConvexApiResponse", () => {
  it("returns value and log lines on success", () => {
    expect(parseConvexApiResponse({ status: "success", value: [1, 2], logLines: ["a"] })).toEqual({
      value: [1, 2],
      logLines: ["a"],
    });
  });

  it("defaults missing log lines to an empty array", () => {
    expect(parseConvexApiResponse({ status: "success", value: null }).logLines).toEqual([]);
  });

  it("throws the error message on an error status", () => {
    expect(() => parseConvexApiResponse({ status: "error", errorMessage: "boom" })).toThrow("boom");
  });

  it("throws on a non-object or unknown status", () => {
    expect(() => parseConvexApiResponse("nope")).toThrow();
    expect(() => parseConvexApiResponse({ status: "weird" })).toThrow();
  });
});

const CLOUD = "https://happy-animal-123.convex.cloud";
const KEY = "deploy-key-abc";

describe("runTestFunction", () => {
  it("posts the bundle with the admin key and returns the value", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ status: "success", value: { count: 3 }, logLines: ["[log] hi"] }),
    );
    const client = createConvexAdminClient({ cloudUrl: CLOUD, adminKey: KEY, fetch: fetchMock });

    const result = await client.runTestFunction("export default query(...)");

    expect(result).toEqual({ value: { count: 3 }, logLines: ["[log] hi"] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${CLOUD}/api/run_test_function`);
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body));
    expect(body.adminKey).toBe(KEY);
    expect(body.args).toEqual({});
    expect(body.bundle).toEqual({ path: "testQuery.js", source: "export default query(...)" });
    expect(body.format).toBe("convex_encoded_json");
  });

  it("passes through args and a custom bundle path", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ status: "success", value: null }),
    );
    const client = createConvexAdminClient({ cloudUrl: CLOUD, adminKey: KEY, fetch: fetchMock });

    await client.runTestFunction("src", { args: { limit: 10 }, path: "q.js" });

    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body));
    expect(body.args).toEqual({ limit: 10 });
    expect(body.bundle.path).toBe("q.js");
  });

  it("strips a trailing slash from the cloud URL", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ status: "success", value: null }),
    );
    const client = createConvexAdminClient({ cloudUrl: `${CLOUD}/`, adminKey: KEY, fetch: fetchMock });

    await client.runTestFunction("src");

    expect(fetchMock.mock.calls[0]![0]).toBe(`${CLOUD}/api/run_test_function`);
  });

  it("throws the query error message (so it can be formatted for MCP)", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ status: "error", errorMessage: "Too many bytes read" }),
    );
    const client = createConvexAdminClient({ cloudUrl: CLOUD, adminKey: KEY, fetch: fetchMock });

    await expect(client.runTestFunction("src")).rejects.toThrow("Too many bytes read");
  });

  it("throws on a non-ok HTTP response", async () => {
    const fetchMock = vi.fn(async () => jsonResponse("unauthorized", false, 401));
    const client = createConvexAdminClient({ cloudUrl: CLOUD, adminKey: KEY, fetch: fetchMock });

    await expect(client.runTestFunction("src")).rejects.toThrow("401");
  });
});

describe("listTables", () => {
  const declaredSchema = JSON.stringify({
    tables: [
      { tableName: "messages", indexes: [] },
      { tableName: "users", indexes: [] },
    ],
  });

  function backendFetch(): typeof globalThis.fetch {
    return vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith("/api/shapes2")) {
        return jsonResponse({ messages: { type: "Object" }, drafts: { type: "Object" } });
      }
      if (url.endsWith("/api/query")) {
        return jsonResponse({ status: "success", value: { active: declaredSchema } });
      }
      throw new Error(`unexpected url ${url}`);
    }) as unknown as typeof globalThis.fetch;
  }

  it("merges inferred shapes and the declared schema, sorted by name", async () => {
    const client = createConvexAdminClient({ cloudUrl: CLOUD, adminKey: KEY, fetch: backendFetch() });

    const tables = await client.listTables();

    expect(tables.map((t) => t.name)).toEqual(["drafts", "messages", "users"]);
    const messages = tables.find((t) => t.name === "messages")!;
    expect(messages.inferredShape).toEqual({ type: "Object" });
    expect(messages.declaredSchema).toMatchObject({ tableName: "messages" });
    // Inferred-only table: declared schema is null.
    expect(tables.find((t) => t.name === "drafts")!.declaredSchema).toBeNull();
    // Declared-only table: inferred shape is null.
    expect(tables.find((t) => t.name === "users")!.inferredShape).toBeNull();
  });

  it("drops tables the hideTable predicate rejects", async () => {
    const client = createConvexAdminClient({ cloudUrl: CLOUD, adminKey: KEY, fetch: backendFetch() });

    const tables = await client.listTables({ hideTable: (name) => name === "drafts" });

    expect(tables.map((t) => t.name)).toEqual(["messages", "users"]);
  });

  it("sends the Convex admin auth header to the system endpoints", async () => {
    const fetchMock = backendFetch() as unknown as ReturnType<typeof vi.fn>;
    const client = createConvexAdminClient({ cloudUrl: CLOUD, adminKey: KEY, fetch: fetchMock });

    await client.listTables();

    for (const call of fetchMock.mock.calls) {
      const init = call[1] as RequestInit | undefined;
      const headers = (init?.headers ?? {}) as Record<string, string>;
      expect(headers.Authorization).toBe(`Convex ${KEY}`);
    }
  });
});
