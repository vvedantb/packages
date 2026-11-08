import Module from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

// None of the three peers is installed here, so the missing-peer path is real.
// The present-peer cases hand `require` stubs through Node's module loader.

const platform = vi.hoisted(() => ({ OS: "ios" }));
vi.mock("react-native", () => ({ Platform: platform }));

// Run effects at once and capture their cleanups, so the hook runs without a renderer.
const effects = vi.hoisted(() => ({ cleanups: [] as Array<() => void> }));
vi.mock("react", () => ({
  useRef: <T>(value: T) => ({ current: value }),
  useEffect: (fn: () => void | (() => void)) => {
    const cleanup = fn();
    if (cleanup) effects.cleanups.push(cleanup);
  },
}));

type Load = (this: unknown, request: string, ...rest: unknown[]) => unknown;
const nodeModule = Module as unknown as { _load: Load };
const realLoad = nodeModule._load;

function providePeers(peers: Record<string, unknown>) {
  nodeModule._load = function (request, ...rest) {
    return request in peers ? peers[request] : realLoad.call(this, request, ...rest);
  };
}

afterEach(() => {
  nodeModule._load = realLoad;
  platform.OS = "ios";
  effects.cleanups.length = 0;
  vi.resetModules();
});

function peers(over: { isDevice?: boolean; projectId?: unknown; granted?: boolean; askGranted?: boolean } = {}) {
  const { isDevice = true, projectId = "eas-1", granted = true, askGranted = true } = over;
  let listener: ((response: unknown) => void) | undefined;
  const remove = vi.fn();
  const notifications = {
    AndroidImportance: { HIGH: 4 },
    setNotificationChannelAsync: vi.fn(async () => null),
    getPermissionsAsync: vi.fn(async () => ({ granted })),
    requestPermissionsAsync: vi.fn(async () => ({ granted: askGranted })),
    getExpoPushTokenAsync: vi.fn(async () => ({ data: "ExponentPushToken[abc]" })),
    setNotificationHandler: vi.fn(),
    getLastNotificationResponseAsync: vi.fn(async () => null as unknown),
    addNotificationResponseReceivedListener: vi.fn((fn: (response: unknown) => void) => {
      listener = fn;
      return { remove };
    }),
  };
  const modules = {
    "expo-notifications": notifications,
    "expo-constants": { default: { expoConfig: { extra: { eas: { projectId } } } } },
    "expo-device": { isDevice },
  };
  providePeers(modules);
  return { notifications, emit: (r: unknown) => listener?.(r), remove };
}

const tapResponse = (identifier: string, data: unknown) => ({
  notification: { request: { identifier, content: { data } } },
});
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("getExpoPushToken", () => {
  it("returns null with no peer installed", async () => {
    const { getExpoPushToken, loadNotifications } = await import("../src/push");
    expect(loadNotifications()).toBeNull();
    expect(await getExpoPushToken({ ask: true })).toBeNull();
  });

  it("returns the token and sets the Android channel", async () => {
    platform.OS = "android";
    const { notifications } = peers();
    const { getExpoPushToken } = await import("../src/push");
    expect(await getExpoPushToken({ ask: false, channelName: "Eva" })).toBe("ExponentPushToken[abc]");
    expect(notifications.setNotificationChannelAsync).toHaveBeenCalledWith("Eva", { name: "Eva", importance: 4 });
    expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: "eas-1" });
  });

  it("skips the channel on iOS", async () => {
    const { notifications } = peers();
    const { getExpoPushToken } = await import("../src/push");
    await getExpoPushToken({ ask: false });
    expect(notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it("is null on a simulator or without a project id", async () => {
    peers({ isDevice: false });
    expect(await (await import("../src/push")).getExpoPushToken({ ask: true })).toBeNull();
    vi.resetModules();
    peers({ projectId: "" });
    expect(await (await import("../src/push")).getExpoPushToken({ ask: true })).toBeNull();
  });

  it("asks for permission only when `ask` is set", async () => {
    const first = peers({ granted: false, askGranted: true });
    const { getExpoPushToken } = await import("../src/push");
    expect(await getExpoPushToken({ ask: false })).toBeNull();
    expect(first.notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(await getExpoPushToken({ ask: true })).toBe("ExponentPushToken[abc]");
  });
});

describe("useExpoPushRegistration", () => {
  it("registers the token with the platform, once", async () => {
    platform.OS = "android";
    peers();
    const register = vi.fn(async () => null);
    const { useExpoPushRegistration } = await import("../src/push");
    useExpoPushRegistration({ register });
    await flush();
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith({ token: "ExponentPushToken[abc]", platform: "android" });
  });

  it("does nothing, and does not throw, with no peer installed", async () => {
    const register = vi.fn();
    const onNotificationTap = vi.fn();
    const { useExpoPushRegistration } = await import("../src/push");
    expect(() => useExpoPushRegistration({ register, onNotificationTap })).not.toThrow();
    await flush();
    expect(register).not.toHaveBeenCalled();
  });

  it("reports the cold-start tap and live taps, once per push, and unsubscribes", async () => {
    const { notifications, emit, remove } = peers();
    notifications.getLastNotificationResponseAsync.mockResolvedValue(tapResponse("n1", { target: "c1" }));
    const onNotificationTap = vi.fn();
    const { useExpoPushRegistration } = await import("../src/push");
    useExpoPushRegistration({ register: async () => null, onNotificationTap });
    await flush();
    emit(tapResponse("n1", { target: "c1" }));
    emit(tapResponse("n2", "not an object"));
    expect(onNotificationTap.mock.calls.map(([tap]) => [tap.identifier, tap.data])).toEqual([
      ["n1", { target: "c1" }],
      ["n2", {}],
    ]);
    for (const cleanup of effects.cleanups) cleanup();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("shows foreground banners unless turned off", async () => {
    const first = peers();
    const { useExpoPushRegistration } = await import("../src/push");
    useExpoPushRegistration({ register: async () => null, showInForeground: false });
    expect(first.notifications.setNotificationHandler).not.toHaveBeenCalled();
    useExpoPushRegistration({ register: async () => null });
    useExpoPushRegistration({ register: async () => null });
    expect(first.notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
  });
});
