// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConvexClerkProvider, type ConvexClerkUseAuth } from "../../src/index.js";

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

// The Convex providers are replaced by markers that record their props, so the
// test sees which provider each variant renders and with which `useAuth`.
const seen = vi.hoisted(() => ({ providers: new Array<{ name: string; client: object; useAuth?: object }>() }));

vi.mock("convex/react", () => ({
  ConvexProvider: ({ client, children }: { client: object; children: ReactNode }) => {
    seen.providers.push({ name: "ConvexProvider", client });
    return <div data-provider="ConvexProvider">{children}</div>;
  },
}));

vi.mock("convex/react-clerk", () => ({
  ConvexProviderWithClerk: ({ client, useAuth, children }: { client: object; useAuth: object; children: ReactNode }) => {
    seen.providers.push({ name: "ConvexProviderWithClerk", client, useAuth });
    return <div data-provider="ConvexProviderWithClerk">{children}</div>;
  },
}));

const clerkUseAuth = vi.hoisted(() => () => ({
  isLoaded: true,
  isSignedIn: false,
  getToken: async () => null,
  orgId: undefined,
  orgRole: undefined,
  sessionId: undefined,
  sessionClaims: undefined,
}));
vi.mock("@clerk/clerk-react", () => ({ useAuth: clerkUseAuth }));

afterEach(() => {
  seen.providers.length = 0;
});

// The real client class from the convex package; it connects lazily, and the
// mocked providers never touch it.
const { ConvexReactClient } = await vi.importActual<typeof import("convex/react")>("convex/react");
const client = new ConvexReactClient("https://example.convex.cloud");
const useStableAuth: ConvexClerkUseAuth = () => clerkUseAuth();

function rendered(element: ReactNode) {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(element));
  const result = { html: container.innerHTML, providers: [...seen.providers] };
  act(() => root.unmount());
  seen.providers.length = 0;
  return result;
}

describe("ConvexClerkProvider", () => {
  it("defaults to ConvexProviderWithClerk with Clerk's useAuth (app-d web)", () => {
    const { html, providers } = rendered(<ConvexClerkProvider client={client}>child</ConvexClerkProvider>);
    expect(providers).toEqual([{ name: "ConvexProviderWithClerk", client, useAuth: clerkUseAuth }]);
    expect(html).toBe('<div data-provider="ConvexProviderWithClerk">child</div>');
  });

  it("passes a given useAuth (app-a/app-b/app-c web with useStableAuth, the extensions with their Clerk SDK's)", () => {
    const { providers } = rendered(
      <ConvexClerkProvider client={client} useAuth={useStableAuth}>
        child
      </ConvexClerkProvider>,
    );
    expect(providers).toEqual([{ name: "ConvexProviderWithClerk", client, useAuth: useStableAuth }]);
  });

  it("renders a plain ConvexProvider with clerk={false} (app-d when Clerk failed, app-e when Clerk is not configured)", () => {
    const { html, providers } = rendered(
      <ConvexClerkProvider client={client} clerk={false}>
        child
      </ConvexClerkProvider>,
    );
    expect(providers).toEqual([{ name: "ConvexProvider", client }]);
    expect(html).toBe('<div data-provider="ConvexProvider">child</div>');
  });

  it("renders children alone without a client (app-e without a Convex URL)", () => {
    for (const none of [null, undefined]) {
      const { html, providers } = rendered(<ConvexClerkProvider client={none}>child</ConvexClerkProvider>);
      expect(providers).toEqual([]);
      expect(html).toBe("child");
    }
  });
});
