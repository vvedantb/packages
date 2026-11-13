// Fails when a package.json export points at a missing file.
// Mirrors packages/ui/tokens/scripts/check-exports.mjs.
import { accessSync, readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const targets = Object.values(pkg.exports)
  .flatMap((t) => (typeof t === "string" ? [t] : Object.values(t)))
  .filter((t) => !t.includes("*"));
for (const t of targets) accessSync(new URL(`../${t}`, import.meta.url));
console.log(`@vvedantb/native-ui: ${targets.length} export targets present`);
