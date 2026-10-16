// Compile-time check of the preset's public types (tsc only, not run).
import preset, { cssVar, tokensPreset, type TokensPreset } from "../src/tailwind-preset.mjs";

const alpha = (name: string) => `color-mix(in oklch, var(--${name}) calc(<alpha-value> * 100%), transparent)`;
const custom: TokensPreset = tokensPreset({ color: alpha });
const presets: TokensPreset[] = [preset, custom, tokensPreset(), tokensPreset({ color: cssVar })];
export const darkModes: "class"[] = presets.map((p) => p.darkMode);
