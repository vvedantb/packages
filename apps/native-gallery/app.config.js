// Adds the release values to app.json. Without the environment below, the
// config is app.json unchanged, so `expo start`, the e2e build and the strip
// test behave as before.
//
//   VERSION_NAME, VERSION_CODE   set by scripts/build-android-release.sh
//   ANDROID_KEYSTORE_PATH        or keystore.properties in the repo root:
//                                turns on plugins/withReleaseSigning.js
const fs = require("node:fs");
const path = require("node:path");

function versionCode() {
  const parsed = Number(process.env.VERSION_CODE);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

module.exports = ({ config }) => {
  const signed =
    Boolean(process.env.ANDROID_KEYSTORE_PATH) || fs.existsSync(path.join(__dirname, "..", "..", "keystore.properties"));
  const code = versionCode();
  return {
    ...config,
    version: process.env.VERSION_NAME || config.version,
    android: { ...config.android, ...(code ? { versionCode: code } : {}) },
    plugins: [...(config.plugins ?? []), ...(signed ? ["./plugins/withReleaseSigning.js"] : [])],
  };
};
