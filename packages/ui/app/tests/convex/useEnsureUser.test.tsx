// @vitest-environment happy-dom
import { useConvexAuth, useMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEnsureUser } from "../../src/index.js";

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

// Convex auth and the mutation are mocked: the test drives `isAuthenticated`
// and counts mutation calls for the hook and for app-a's and app-b's effect.
const state = vi.hoisted(() => ({
  isAuthenticated: false,
  calls: new Array<object>(),
  result: (): Promise<null> => Promise.resolve(null),
}));

vi.mock("convex/react", () => {
  const mutate = (args: object) => {
    state.calls.push(args);
    return state.result();
  };
  return {
    useConvexAuth: () => ({ isLoading: false, isAuthenticated: state.isAuthenticated }),
    // Stable per reference, like Convex's useMutation.
    useMutation: () => mutate,
  };
});

const ensureUserExists = makeFunctionReference<"mutation", Record<string, never>, { userId: string; wasCreated: boolean }>(
  "users:ensureUserExists",
);

/** app-a `EnsureUser` / app-b `_authed` effect, ported. */
function AppEnsureUser() {
  const { isAuthenticated } = useConvexAuth();
  const ensure = useMutation(ensureUserExists);
  useEffect(() => {
    if (isAuthenticated) {
      ensure({}).catch(console.error);
    }
  }, [isAuthenticated, ensure]);
  return null;
}

function KitEnsureUser() {
  useEnsureUser(ensureUserExists);
  return null;
}

afterEach(() => {
  state.isAuthenticated = false;
  state.calls.length = 0;
  state.result = () => Promise.resolve(null);
  vi.restoreAllMocks();
});

/** Mount, then rerender through the given auth states; return the mutation calls and error logs. */
async function run(Component: () => null, sequence: boolean[]) {
  const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
  state.calls.length = 0;
  const [first = false, ...rest] = sequence;
  state.isAuthenticated = first;
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<Component />));
  for (const next of rest) {
    state.isAuthenticated = next;
    act(() => root.render(<Component />));
  }
  await Promise.resolve();
  await Promise.resolve();
  act(() => root.unmount());
  const result = { calls: [...state.calls], errors: errors.mock.calls.map((call) => call.map(String)) };
  errors.mockRestore();
  return result;
}

const sequences: boolean[][] = [
  [false],
  [true],
  [false, true],
  [true, true, true],
  [true, false, true],
  [false, false, true, false],
];

describe("useEnsureUser", () => {
  for (const sequence of sequences) {
    it(`auth ${sequence.join(" → ")}: same calls as app-a/app-b`, async () => {
      expect(await run(KitEnsureUser, sequence)).toEqual(await run(AppEnsureUser, sequence));
    });
  }

  it("calls with {} once per sign-in", async () => {
    expect((await run(KitEnsureUser, [false, true, true, false, true])).calls).toEqual([{}, {}]);
  });

  it("logs a rejected mutation with console.error like the apps", async () => {
    state.result = () => Promise.reject(new Error("boom"));
    const ours = await run(KitEnsureUser, [true]);
    const theirs = await run(AppEnsureUser, [true]);
    expect(ours).toEqual(theirs);
    expect(ours.errors).toEqual([["Error: boom"]]);
  });
});
