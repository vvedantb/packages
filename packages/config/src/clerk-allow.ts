// Adds a Chrome extension's origin to a Clerk instance's allowed origins through the Clerk
// Backend API: GET /v1/instance, add `chrome-extension://<id>` to `allowed_origins`, PATCH
// /v1/instance with the whole list. The secret key is read from the environment and never printed.

export type ClerkAllowResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

/** The part of `fetch` the CLI uses. */
export type ClerkAllowFetch = (
  url: string,
  init: { method: "GET" | "PATCH"; headers: Record<string, string>; body?: string },
) => Promise<ClerkAllowResponse>;

export type ClerkAllowIo = {
  log: (message: string) => void;
  error: (message: string) => void;
  env: Readonly<Record<string, string | undefined>>;
  fetch: ClerkAllowFetch;
};

export const CLERK_INSTANCE_URL = "https://api.clerk.com/v1/instance";

/** Chrome extension IDs are 32 letters from a to p. */
const EXTENSION_ID = /^[a-p]{32}$/;

const USAGE = `Usage: vvedantb-clerk-allow <extension-id>

  Adds chrome-extension://<extension-id> to the allowed origins of the Clerk
  instance whose secret key is in CLERK_SECRET_KEY. Origins already allowed
  are kept. Run it once per Clerk instance (development and production).
  <extension-id>  The 32-letter ID shown in chrome://extensions.`;

type Instance = { origins: string[]; environment?: string };

function errorDetail(body: string): string {
  try {
    const { errors } = JSON.parse(body) as { errors?: { message?: string; long_message?: string }[] };
    const messages = (errors ?? []).map((e) => e.long_message ?? e.message).filter(Boolean);
    return messages.length > 0 ? `: ${messages.join("; ")}` : "";
  } catch {
    return "";
  }
}

function readInstance(body: string): Instance {
  let data: { allowed_origins?: unknown; environment_type?: unknown };
  try {
    data = JSON.parse(body) as typeof data;
  } catch {
    throw new Error("GET /v1/instance did not return JSON. Nothing was changed.");
  }
  const origins = data.allowed_origins === null ? [] : data.allowed_origins;
  // Without the current list, a PATCH with only the new origin could drop the others.
  if (!Array.isArray(origins) || !origins.every((o) => typeof o === "string")) {
    throw new Error("GET /v1/instance returned no allowed_origins list. Nothing was changed.");
  }
  return { origins, environment: typeof data.environment_type === "string" ? data.environment_type : undefined };
}

/** Run the CLI. Returns the process exit code: 0 done, 1 Clerk API failure, 2 bad arguments or environment. */
export async function runClerkAllow(argv: readonly string[], io: ClerkAllowIo): Promise<number> {
  if (argv[0] === "--help" || argv[0] === "-h") {
    io.log(USAGE);
    return 0;
  }
  const option = argv.find((arg) => arg.startsWith("-"));
  if (option !== undefined) {
    io.error(`Unknown option: ${option}\n${USAGE}`);
    return 2;
  }
  const [id] = argv;
  if (id === undefined || argv.length > 1) {
    io.error(`${id === undefined ? "Missing the" : "Pass one"} extension ID.\n${USAGE}`);
    return 2;
  }
  // The argument is not echoed: it could be a key pasted by mistake.
  if (!EXTENSION_ID.test(id)) {
    io.error("The extension ID must be 32 letters from a to p, as shown in chrome://extensions.");
    return 2;
  }
  const secret = io.env.CLERK_SECRET_KEY;
  if (!secret) {
    io.error("CLERK_SECRET_KEY is not set.");
    return 2;
  }
  if (!secret.startsWith("sk_")) {
    io.error("CLERK_SECRET_KEY does not hold a Clerk secret key (sk_...).");
    return 2;
  }

  const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
  const request = async (method: "GET" | "PATCH", body?: object) => {
    const response = await io.fetch(CLERK_INSTANCE_URL, body ? { method, headers, body: JSON.stringify(body) } : { method, headers });
    const text = await response.text();
    if (!response.ok) throw new Error(`${method} /v1/instance failed with HTTP ${response.status}${errorDetail(text)}`);
    return text;
  };

  const origin = `chrome-extension://${id}`;
  try {
    const { origins, environment } = readInstance(await request("GET"));
    const instance = environment ? `the ${environment} instance` : "the instance";
    if (origins.includes(origin)) {
      io.log(`${origin} is already allowed on ${instance}.`);
      return 0;
    }
    await request("PATCH", { allowed_origins: [...origins, origin] });
    io.log(`Added ${origin} to the allowed origins of ${instance} (${origins.length + 1} in total).`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.error(`Clerk API: ${message.split(secret).join("[redacted]")}`);
    return 1;
  }
}
