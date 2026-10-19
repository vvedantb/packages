// Ported from both apps' loopback tests, plus the page options.
import { describe, expect, it } from "vitest";
import { LOOPBACK_PATH, LOOPBACK_TIMEOUT_MS, startLoopback } from "@vvedantb/mcp-client";

describe("MCP sign-in loopback", () => {
  it("keeps the shared defaults", () => {
    expect(LOOPBACK_PATH).toBe("/callback");
    expect(LOOPBACK_TIMEOUT_MS).toBe(300_000);
  });

  it("listens on 127.0.0.1 with a random port and hands over the code", async () => {
    const loopback = await startLoopback();
    try {
      expect(loopback.redirectUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/callback$/);
      const code = loopback.waitForCode(() => "s1");

      // A request with the wrong state is refused and does not end the wait.
      expect((await fetch(`${loopback.redirectUrl}?code=bad&state=other`)).status).toBe(400);
      const ok = await fetch(`${loopback.redirectUrl}?code=abc&state=s1`);
      expect(ok.status).toBe(200);
      expect(ok.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(await ok.text()).toContain("You can close this window");
      await expect(code).resolves.toBe("abc");
    } finally {
      loopback.close();
    }
  });

  it("rejects a mismatched or missing state and keeps waiting", async () => {
    const loopback = await startLoopback();
    try {
      const code = loopback.waitForCode(() => "right");
      expect((await fetch(`${loopback.redirectUrl}?code=evil&state=wrong`)).status).toBe(400);
      expect((await fetch(`${loopback.redirectUrl}?code=evil`)).status).toBe(400);
      await fetch(`${loopback.redirectUrl}?code=good&state=right`);
      await expect(code).resolves.toBe("good");
    } finally {
      loopback.close();
    }
  });

  it("refuses every request before a state is expected", async () => {
    const loopback = await startLoopback();
    try {
      expect((await fetch(`${loopback.redirectUrl}?code=abc&state=`)).status).toBe(400);
    } finally {
      loopback.close();
    }
  });

  it("answers 404 for other paths and methods", async () => {
    const loopback = await startLoopback();
    try {
      const url = new URL(loopback.redirectUrl);
      expect((await fetch(`${url.origin}/other`)).status).toBe(404);
      expect((await fetch(loopback.redirectUrl, { method: "POST" })).status).toBe(404);
    } finally {
      loopback.close();
    }
  });

  it("rejects when the user cancels, the redirect has no code, or nothing arrives", async () => {
    const loopback = await startLoopback();
    try {
      const cancelled = expect(loopback.waitForCode(() => "s1")).rejects.toThrow("Sign-in was cancelled");
      await fetch(`${loopback.redirectUrl}?error=access_denied&state=s1`);
      await cancelled;
      const empty = expect(loopback.waitForCode(() => "s2")).rejects.toThrow("Sign-in returned no code");
      await fetch(`${loopback.redirectUrl}?state=s2`);
      await empty;
      await expect(loopback.waitForCode(() => "s1", 20)).rejects.toThrow("Sign-in timed out");
    } finally {
      loopback.close();
    }
  });
});

describe("loopback pages", () => {
  const page = (title: string, text: string): string =>
    `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:16px system-ui;margin:3rem"><p>${text}</p></body>`;

  it("uses neutral defaults", async () => {
    const loopback = await startLoopback();
    try {
      void loopback.waitForCode(() => "s").catch(() => undefined);
      expect(await (await fetch(`${loopback.redirectUrl}?code=x&state=bad`)).text()).toBe(
        page("Sign in", "This sign-in link is not valid. Go back to the app and try again."),
      );
      expect(await (await fetch(`${loopback.redirectUrl}?code=x&state=s`)).text()).toBe(page("Sign in", "You can close this window and go back to the app."));
    } finally {
      loopback.close();
    }
  });

  it("renders the app's title and text, keeping defaults for messages it leaves out", async () => {
    const loopback = await startLoopback({
      title: "Example",
      messages: {
        invalid: "This sign-in link is not valid. Go back to Example and try again.",
        success: "You can close this window and go back to Example.",
      },
    });
    try {
      void loopback.waitForCode(() => "s").catch(() => undefined);
      const invalid = await fetch(`${loopback.redirectUrl}?code=x&state=bad`);
      expect(await invalid.text()).toBe(page("Example", "This sign-in link is not valid. Go back to Example and try again."));
      const incomplete = await fetch(`${loopback.redirectUrl}?error=access_denied&state=s`);
      expect(await incomplete.text()).toBe(page("Example", "Sign-in was not completed. You can close this window."));

      void loopback.waitForCode(() => "t").catch(() => undefined);
      const ok = await fetch(`${loopback.redirectUrl}?code=x&state=t`);
      const text = await ok.text();
      expect(text).toBe(page("Example", "You can close this window and go back to Example."));
      expect(text).not.toContain("the app");
    } finally {
      loopback.close();
    }
  });
});
