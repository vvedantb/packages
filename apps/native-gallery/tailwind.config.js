const { nativeUiPreset, nativeUiContent } = require("@vvedantb/native-ui/tailwind-preset");

module.exports = {
  content: ["./app/**/*.{js,ts,tsx}", "./src/**/*.{js,ts,tsx}", nativeUiContent()],
  presets: [nativeUiPreset({ injectCssVariables: true })],
  theme: { extend: {} },
};
