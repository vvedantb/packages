// Builds `dist/` with React Compiler (see the repo's scripts/build-dist.mjs).
// JSX stays JSX: NativeWind's `className` styling needs the app's own JSX
// transform (`jsxImportSource: "nativewind"`). `--update` rewrites
// compiler-baseline.json.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDist } from "../../../scripts/build-dist.mjs";

await buildDist({ root: join(dirname(fileURLToPath(import.meta.url)), ".."), dirs: ["src"], flat: true, jsx: "preserve" });
