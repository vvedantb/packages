const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
const root = path.resolve(__dirname, "../..");
const nativeUiDir = path.join(root, "packages/native-ui");
const clerkMock = path.join(__dirname, "src/mocks/clerk.tsx");

config.watchFolders = [root];

// The package source lives outside this app and its peers are installed here,
// so resolve every bare import from the app. That also keeps one copy of React.
// Clerk is replaced by a mock: the gallery needs no Clerk keys or network.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@clerk/clerk-expo") {
    return { type: "sourceFile", filePath: clerkMock };
  }
  const bare = !moduleName.startsWith(".") && !path.isAbsolute(moduleName);
  if (bare && context.originModulePath.startsWith(nativeUiDir)) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(__dirname, "index.js") },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
