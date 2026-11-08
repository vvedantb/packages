import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import type * as ExpoConstants from "expo-constants";
import type * as ExpoDevice from "expo-device";
import type * as ExpoNotifications from "expo-notifications";

// `expo-notifications`, `expo-constants` and `expo-device` are optional peers.
// Metro bundles a `require` placed directly in a `try` block as an optional
// dependency, so a missing peer does not break the bundle.

export type ExpoNotificationsModule = typeof ExpoNotifications;
export type ExpoConstantsModule = typeof ExpoConstants;
export type ExpoDeviceModule = typeof ExpoDevice;

let notifications: ExpoNotificationsModule | null | undefined;
let constants: ExpoConstantsModule | null | undefined;
let device: ExpoDeviceModule | null | undefined;

/** `expo-notifications`, or `null` when the optional peer is not installed. */
export function loadNotifications(): ExpoNotificationsModule | null {
  if (notifications === undefined) {
    try {
      notifications = require("expo-notifications") as ExpoNotificationsModule;
    } catch {
      notifications = null;
    }
  }
  return notifications;
}

/** `expo-constants` (its default export is the `Constants` object), or `null` when not installed. */
export function loadConstants(): ExpoConstantsModule | null {
  if (constants === undefined) {
    try {
      constants = require("expo-constants") as ExpoConstantsModule;
    } catch {
      constants = null;
    }
  }
  return constants;
}

/** `expo-device`, or `null` when the optional peer is not installed. */
export function loadDevice(): ExpoDeviceModule | null {
  if (device === undefined) {
    try {
      device = require("expo-device") as ExpoDeviceModule;
    } catch {
      device = null;
    }
  }
  return device;
}

export type ExpoPushPlatform = "ios" | "android";
export type ExpoPushRegisterArgs = { token: string; platform: ExpoPushPlatform };

/** A tapped push: the notification's request id and its `data` object. */
export type ExpoPushTap = {
  identifier: string;
  data: Record<string, unknown>;
  response: ExpoNotifications.NotificationResponse;
};

export type GetExpoPushTokenOptions = {
  /** Show the permission prompt when it was never answered. */
  ask: boolean;
  /** Android channel id, also used as its name. Default `"default"`. */
  channelName?: string;
};

/**
 * The Expo push token for this device, or `null` when push is not possible:
 * a peer is missing, a simulator or emulator, no permission, no EAS project id
 * (`expo.extra.eas.projectId`), or no FCM credentials in this Android build.
 */
export async function getExpoPushToken({ ask, channelName = "default" }: GetExpoPushTokenOptions): Promise<string | null> {
  const Notifications = loadNotifications();
  const constantsModule = loadConstants();
  const deviceModule = loadDevice();
  if (!Notifications || !constantsModule || !deviceModule) return null;
  if (!deviceModule.isDevice) return null;
  const projectId: unknown = constantsModule.default.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== "string" || projectId === "") return null;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(channelName, {
      name: channelName,
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (ask && (await Notifications.requestPermissionsAsync()).granted);
  if (!granted) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    // No google-services.json in this build: FCM cannot issue a token.
    return null;
  }
}

let foregroundHandlerSet = false;

/** Shows pushes as banners while the app is open. Runs once; the hook calls it. */
export function showPushesInForeground(): void {
  const Notifications = loadNotifications();
  if (!Notifications || foregroundHandlerSet) return;
  foregroundHandlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export type UseExpoPushRegistrationOptions = {
  /**
   * Saves the token on your backend, for example `useMutation(api.push.register)`.
   * Called once on mount, with the latest function.
   */
  register: (args: ExpoPushRegisterArgs) => Promise<unknown>;
  /** Called when the user taps a push, including the tap that cold-started the app. Once per push. */
  onNotificationTap?: (tap: ExpoPushTap) => void;
  /** Android channel id, also used as its name. Default `"default"`. */
  channelName?: string;
  /** Show the permission prompt when it was never answered. Default `true`. */
  ask?: boolean;
  /** Show pushes as banners while the app is open. Default `true`. */
  showInForeground?: boolean;
};

function toTap(response: ExpoNotifications.NotificationResponse | null | undefined): ExpoPushTap | null {
  if (!response) return null;
  const { identifier, content } = response.notification.request;
  const data = content.data;
  return { identifier, data: typeof data === "object" && data !== null ? data : {}, response };
}

/**
 * Mount once under your auth gate. Registers this device's token through
 * `register` and reports taps on pushes through `onNotificationTap`. Does
 * nothing when a peer is missing. Navigation is yours: route from
 * `tap.data` in the callback.
 */
export function useExpoPushRegistration(options: UseExpoPushRegistrationOptions): void {
  const { channelName, ask = true, showInForeground = true } = options;
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    if (showInForeground) showPushesInForeground();
    let cancelled = false;
    void getExpoPushToken({ ask, channelName }).then((token) => {
      if (token && !cancelled) {
        void latest.current.register({ token, platform: Platform.OS === "ios" ? "ios" : "android" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ask, channelName, showInForeground]);

  useEffect(() => {
    const Notifications = loadNotifications();
    if (!Notifications) return;
    const seen = new Set<string>();
    const deliver = (response: ExpoNotifications.NotificationResponse | null | undefined) => {
      const tap = toTap(response);
      if (!tap || seen.has(tap.identifier)) return;
      seen.add(tap.identifier);
      latest.current.onNotificationTap?.(tap);
    };
    let cancelled = false;
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!cancelled) deliver(response);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(deliver);
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
}
