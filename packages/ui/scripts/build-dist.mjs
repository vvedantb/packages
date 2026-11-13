// Builds `dist/` with React Compiler (see the repo's scripts/build-dist.mjs):
// `src` and the `app`, `shell` and `tokens` sources it imports, at the same paths under
// `dist`, with JSX compiled to plain JavaScript. `--update` rewrites
// compiler-baseline.json.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDist } from "../../../scripts/build-dist.mjs";

await buildDist({
  root: join(dirname(fileURLToPath(import.meta.url)), ".."),
  dirs: ["src", "app/src", "shell/src", "tokens/src"],
  jsx: "automatic",
});
