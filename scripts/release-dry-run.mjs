// Release dry run. Nothing is published and nothing needs the registry.
// For each non-private package under packages/*:
//   1. `pnpm pack --dry-run` lists the tarball files. It exits 0 even when
//      the version is already on npm (unlike `publish --dry-run`).
//   2. Every concrete `exports` target and every `bin` target must exist.
//      Glob targets (`*`) are noted, not resolved.
// Build, typecheck and test run separately and stay fatal.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const summaryPath = process.env.DRY_RUN_SUMMARY ?? "/tmp/publish-dry-run-summary.txt";

function targets(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (value && typeof value === "object") Object.values(value).forEach((v) => targets(v, out));
  return out;
}

const summary = [];
const log = (line = "") => {
  console.log(line);
  summary.push(line);
};
let failures = 0;

const dirs = readdirSync(join(root, "packages"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(root, "packages", d.name));

for (const dir of dirs) {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (pkg.private) {
    log(`SKIP ${pkg.name} (private)`);
    continue;
  }
  log(`\n== ${pkg.name}@${pkg.version} ==`);

  // 1. Pack dry run. execFileSync throws on non-zero exit.
  const out = execFileSync("pnpm", ["pack", "--dry-run"], { cwd: dir, encoding: "utf8" });
  console.log(out);
  const notice = out.split("Tarball Contents")[1]?.split("Tarball Details")[0] ?? out;
  const fileCount = notice.split("\n").filter((l) => l.trim() && !/^Tarball/.test(l)).length;
  log(`pack --dry-run: exit 0, ${fileCount} files listed`);

  // 2. Exports and bins.
  log("exports:");
  log(JSON.stringify(pkg.exports ?? null, null, 2));
  const paths = [...targets(pkg.exports), ...targets(pkg.bin)];
  const unique = [...new Set(paths)].filter((p) => p.startsWith("./") || pkg.bin);
  let checked = 0;
  let globs = 0;
  const missing = [];
  for (const p of unique) {
    if (p.includes("*")) {
      globs++;
      continue;
    }
    checked++;
    if (!existsSync(join(dir, p))) missing.push(p);
  }
  log(`exports/bin targets: ${checked} concrete checked, ${globs} glob patterns noted (not resolved), ${missing.length} missing`);
  for (const m of missing) log(`  MISSING ${m}`);
  failures += missing.length;
}

log(failures ? `\nFAIL: ${failures} missing target(s)` : "\nOK: all concrete targets exist");
writeFileSync(summaryPath, summary.join("\n") + "\n");
process.exit(failures ? 1 : 0);
