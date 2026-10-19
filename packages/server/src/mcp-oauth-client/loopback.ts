import type { Server } from "node:http";

// The redirect target for sign-in: a one-shot HTTP server on 127.0.0.1 with a random port.
// Node only. `node:http` is imported when the server starts, never at module
// load, so the package root stays loadable in Convex's V8 runtime.

export const LOOPBACK_PATH = "/callback";
export const LOOPBACK_TIMEOUT_MS = 5 * 60_000;

/** The text of the pages the browser shows. Inserted as HTML, unescaped. */
export type LoopbackMessages = {
  /** 400: the request does not carry the expected `state`. */
  invalid: string;
  /** 200: the redirect carried `error`, or no `code`. */
  incomplete: string;
  /** 200: the code was received. */
  success: string;
};

export type LoopbackOptions = {
  /** The page `<title>`. Default `"Sign in"`. */
  title?: string;
  messages?: Partial<LoopbackMessages>;
};

const DEFAULT_TITLE = "Sign in";

const DEFAULT_MESSAGES: LoopbackMessages = {
  invalid: "This sign-in link is not valid. Go back to the app and try again.",
  incomplete: "Sign-in was not completed. You can close this window.",
  success: "You can close this window and go back to the app.",
};

export type Loopback = {
  /** The exact redirect_uri to register and send, for example http://127.0.0.1:51234/callback. */
  redirectUrl: string;
  /** Resolves with the authorisation code. `expectedState` is read when the request arrives, so it may be set later. */
  waitForCode: (expectedState: () => string | undefined, timeoutMs?: number) => Promise<string>;
  close: () => void;
};

/** Starts listening on 127.0.0.1 with a free port. Call close when the sign-in ends. */
export async function startLoopback(options: LoopbackOptions = {}): Promise<Loopback> {
  const title = options.title ?? DEFAULT_TITLE;
  const messages = { ...DEFAULT_MESSAGES, ...options.messages };
  const page = (text: string): string =>
    `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:16px system-ui;margin:3rem"><p>${text}</p></body>`;
  let deliver: (result: { code: string } | { error: string }) => void = () => undefined;
  let expected: () => string | undefined = () => undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const html = { "content-type": "text/html; charset=utf-8" };
  const { createServer } = await loadNodeHttp();
  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (req.method !== "GET" || url.pathname !== LOOPBACK_PATH) {
      res.writeHead(404).end();
      return;
    }
    const state = expected();
    const error = url.searchParams.get("error");
    const code = url.searchParams.get("code");
    // A request without the state we sent is not our redirect: ignore it and keep waiting.
    if (!state || url.searchParams.get("state") !== state) {
      res.writeHead(400, html).end(page(messages.invalid));
      return;
    }
    if (error || !code) {
      res.writeHead(200, html).end(page(messages.incomplete));
      deliver({ error: error ? "Sign-in was cancelled" : "Sign-in returned no code" });
      return;
    }
    res.writeHead(200, html).end(page(messages.success));
    deliver({ code });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Loopback server has no port");
  const close = (): void => {
    clearTimeout(timer);
    server.close();
    server.closeAllConnections();
  };
  return {
    redirectUrl: `http://127.0.0.1:${String(address.port)}${LOOPBACK_PATH}`,
    close,
    waitForCode: (expectedState, timeoutMs = LOOPBACK_TIMEOUT_MS) => {
      expected = expectedState;
      return new Promise<string>((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Sign-in timed out")), timeoutMs);
        deliver = (result) => {
          clearTimeout(timer);
          if ("code" in result) resolve(result.code);
          else reject(new Error(result.error));
        };
      });
    },
  };
}

// The import sits directly in a try block: esbuild (Convex's bundler) and Metro
// then treat `node:http` as optional instead of failing a non-Node build.
async function loadNodeHttp() {
  try {
    return await import("node:http");
  } catch (error) {
    throw new Error("startLoopback needs Node.js (node:http)", { cause: error });
  }
}
