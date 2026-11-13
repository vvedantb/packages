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

function Shell() {
  const scheme = useScheme();
  const pathname = usePathname();
  return (
    <>
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
