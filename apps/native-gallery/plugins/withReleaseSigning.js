// Expo config plugin: signs `assembleRelease` with the gallery sideload key.
// app.config.js adds it only when ANDROID_KEYSTORE_PATH is set or
// keystore.properties exists, so the e2e build (`build:android:agent`) and
// `expo run:android` keep the debug key.
//
// Each value comes from the environment, else from keystore.properties in
// the repository root (gitignored):
//   ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS,
//   ANDROID_KEY_PASSWORD
// With the plugin on, a release task stops when one is missing, so a V Store
// release never falls back to the debug key.
// scripts/build-android-release.sh checks for the marker line below.
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// Added by apps/native-gallery/plugins/withReleaseSigning.js";

const RELEASE_SIGNING = `
${MARKER}
def releaseSigningProps = new Properties()
def releaseSigningFile = rootProject.file("../../../keystore.properties")
if (releaseSigningFile.exists()) {
    releaseSigningFile.withInputStream { releaseSigningProps.load(it) }
}
def releaseSigning = [
    "ANDROID_KEYSTORE_PATH",
    "ANDROID_KEYSTORE_PASSWORD",
    "ANDROID_KEY_ALIAS",
    "ANDROID_KEY_PASSWORD",
].collectEntries { name -> [(name): System.getenv(name) ?: releaseSigningProps.getProperty(name)] }
def releaseSigningMissing = releaseSigning.findAll { !it.value }.keySet()

android {
    signingConfigs {
        release {
            if (releaseSigningMissing.isEmpty()) {
                storeFile file(releaseSigning.ANDROID_KEYSTORE_PATH)
                storePassword releaseSigning.ANDROID_KEYSTORE_PASSWORD
                keyAlias releaseSigning.ANDROID_KEY_ALIAS
                keyPassword releaseSigning.ANDROID_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}

gradle.taskGraph.whenReady { graph ->
    def release = graph.allTasks.any { it.project == project && it.name.toLowerCase().contains("release") }
    if (release && !releaseSigningMissing.isEmpty()) {
        throw new GradleException("Release signing needs \${releaseSigningMissing.join(", ")} in the environment or keystore.properties in the repository root.")
    }
}
`;

/** @param {import("expo/config").ExpoConfig} config */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents += RELEASE_SIGNING;
    }
    return mod;
  });
};
