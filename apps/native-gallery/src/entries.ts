// One static import per native-ui entry point (the tailwind preset is CommonJS and is
// loaded by `tailwind.config.js`). Importing them all makes Metro prove that each entry
// resolves and loads on a device. The `/entries` screen lists what each one exports.
import * as root from "@vvedantb/native-ui";
import * as ai from "@vvedantb/native-ui/ai";
import * as aiGallery from "@vvedantb/native-ui/ai-gallery";
import * as ambient from "@vvedantb/native-ui/ambient";
import * as auth from "@vvedantb/native-ui/auth";
import * as blur from "@vvedantb/native-ui/blur";
import * as bottomSheet from "@vvedantb/native-ui/bottom-sheet";
import * as brand from "@vvedantb/native-ui/brand";
import * as button from "@vvedantb/native-ui/button";
import * as dateTime from "@vvedantb/native-ui/date-time";
import * as expoRouter from "@vvedantb/native-ui/expo-router";
import * as expoWebRoot from "@vvedantb/native-ui/expo-web-root";
import * as floating from "@vvedantb/native-ui/floating";
import * as gallery from "@vvedantb/native-ui/gallery";
import * as haptics from "@vvedantb/native-ui/haptics";
import * as layout from "@vvedantb/native-ui/layout";
import * as markdown from "@vvedantb/native-ui/markdown";
import * as marketing from "@vvedantb/native-ui/marketing";
import * as pageTitle from "@vvedantb/native-ui/page-title";
import * as passwordInput from "@vvedantb/native-ui/password-input";
import * as primitives from "@vvedantb/native-ui/primitives";
import * as push from "@vvedantb/native-ui/push";
import * as searchInput from "@vvedantb/native-ui/search-input";
import * as tabBar from "@vvedantb/native-ui/tab-bar";
import * as theme from "@vvedantb/native-ui/theme";
import * as toast from "@vvedantb/native-ui/toast";

export const ENTRY_MODULES: Record<string, Record<string, unknown>> = {
  ".": root,
  "/ai": ai,
  "/ai-gallery": aiGallery,
  "/ambient": ambient,
  "/auth": auth,
  "/blur": blur,
  "/bottom-sheet": bottomSheet,
  "/brand": brand,
  "/button": button,
  "/date-time": dateTime,
  "/expo-router": expoRouter,
  "/expo-web-root": expoWebRoot,
  "/floating": floating,
  "/gallery": gallery,
  "/haptics": haptics,
  "/layout": layout,
  "/markdown": markdown,
  "/marketing": marketing,
  "/page-title": pageTitle,
  "/password-input": passwordInput,
  "/primitives": primitives,
  "/push": push,
  "/search-input": searchInput,
  "/tab-bar": tabBar,
  "/theme": theme,
  "/toast": toast,
};
