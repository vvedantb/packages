// jsonResponse and createOriginAllowlistCors against the local copies two
// apps have in convex/http.ts today (ported under neutral names).
import { describe, expect, it } from "vitest";
import { createOriginAllowlistCors, jsonResponse, type JsonInput } from "@vvedantb/server";

const ALLOWED_ORIGINS = ["https://app.example.test", "http://localhost:3000", "http://127.0.0.1:3000"];

function refCorsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : "",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
  };
}

function refPreflightHeaders(origin: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function refJsonResponse(data: JsonInput, status: number, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

// A third app's variant: (data, request, status = 200) with request-derived CORS spread last.
function refJsonResponseWithRequest(data: Record<string, string>, request: Request, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...refCorsHeaders(request.headers.get("origin") ?? "") },
  });
}

async function snapshot(response: Response) {
  return {
    status: response.status,
    headers: [...response.headers.entries()],
    body: await response.text(),
  };
}

const ORIGINS = ["https://app.example.test", "http://localhost:3000", "https://evil.example", "", "null", "HTTPS://APP.EXAMPLE.TEST"];

describe("createOriginAllowlistCors", () => {
  const cors = createOriginAllowlistCors(ALLOWED_ORIGINS);

  it.each(ORIGINS)("matches the local copy for origin %j, key order included", (origin) => {
    expect(Object.entries(cors.headers(origin))).toEqual(Object.entries(refCorsHeaders(origin)));
    expect(Object.entries(cors.preflightHeaders(origin))).toEqual(
      Object.entries(refPreflightHeaders(origin)),
    );
  });

  it("sends an empty Allow-Origin on normal responses and omits it on preflight for other origins", () => {
    expect(cors.headers("https://evil.example")["Access-Control-Allow-Origin"]).toBe("");
    expect("Access-Control-Allow-Origin" in cors.preflightHeaders("https://evil.example")).toBe(false);
  });
});

describe("jsonResponse", () => {
  const cases: [JsonInput, number, Record<string, string> | undefined][] = [
    [{ error: "Unauthorized" }, 401, undefined],
    [[{ id: 1, details: [] }], 200, refCorsHeaders("https://app.example.test")],
    [{ results: ["a"] }, 200, { "Content-Type": "text/plain" }],
    ["text", 500, {}],
    [null, 200, undefined],
  ];

  it.each(cases)("matches the local copy for %j", async (data, status, extra) => {
    expect(await snapshot(jsonResponse(data, status, extra))).toEqual(
      await snapshot(refJsonResponse(data, status, extra)),
    );
  });

  it("covers the (data, request, status) variant through extraHeaders", async () => {
    const request = new Request("https://x.test/", { headers: { origin: "http://localhost:3000" } });
    expect(
      await snapshot(jsonResponse({ ok: "yes" }, 200, refCorsHeaders(request.headers.get("origin") ?? ""))),
    ).toEqual(await snapshot(refJsonResponseWithRequest({ ok: "yes" }, request)));
  });
});
