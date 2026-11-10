import "../global.css";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PortalHost } from "@rn-primitives/portal";
import { useScheme } from "../src/useScheme";
import { Toaster } from "@vvedantb/native-ui/toast";
import { tokens } from "@vvedantb/native-ui/theme";
import { GalleryProvider } from "../src/GalleryContext";
import { useEffect } from "react";

// Agent builds only (EXPO_PUBLIC_NATIVE_UI_AGENT=1): a test clock, a deep-link bridge
// and reduced motion. Metro inlines the flag, so the default bundle has none of this.
const agent =
  process.env.EXPO_PUBLIC_NATIVE_UI_AGENT === "1"
    ? (require("../src/agent/install") as typeof import("../src/agent/install"))
    : null;
const AgentMotion =
  process.env.EXPO_PUBLIC_NATIVE_UI_AGENT === "1"
    ? (require("../src/agent/AgentMotion") as typeof import("../src/agent/AgentMotion")).AgentMotion
    : null;
agent?.installAgent();

function Shell() {
  const scheme = useScheme();
  const pathname = usePathname();
  useEffect(() => {
    agent?.setAgentRoute(pathname);
  }, [pathname]);
  return (
    <>
      {AgentMotion ? <AgentMotion /> : null}
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tokens.color.background[scheme] },
        }}
      />
      {/* One PortalHost at the root, outside any Modal: `Select` renders into it. */}
      <PortalHost />
      {/* ParityGallery mounts its own Toaster; a second one would draw every toast twice. */}
      {pathname === "/parity" ? null : <Toaster />}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GalleryProvider>
          <BottomSheetModalProvider>
            <Shell />
          </BottomSheetModalProvider>
        </GalleryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
