// Regenerates brand/pricing-modal/*.png: the multi-plan PricingModal in dark and light, monthly and annual, plus a narrow stacked view.
//
//   node scripts/build-pricing-screenshots.mjs [outDir]
//
// Bundles the real component with esbuild, builds its CSS with Tailwind v4 and the package tokens, and
// shoots it with headless Chrome. Dev only (not shipped): esbuild is found in the pnpm store.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] ?? join(pkg, "brand/pricing-modal"));
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "pricing-shots-"));

const store = join(pkg, "../../node_modules/.pnpm");
const esbuildDir = readdirSync(store).filter((d) => d.startsWith("esbuild@")).sort().at(-1);
const esbuild = createRequire(join(store, esbuildDir, "node_modules/"))("esbuild");
const { compile } = await import(pathToFileURL(createRequire(join(pkg, "package.json")).resolve("@tailwindcss/node")).href);

// Load Instrument Sans (every @font-face Google returns, inlined) so text matches the library, not the system fallback.
const fontCss = await (await fetch("https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&display=block", { headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0 Safari/537.36" } })).text();
let fontFace = fontCss;
for (const [, url] of fontCss.matchAll(/url\(([^)]+)\)/g)) {
  const data = Buffer.from(await (await fetch(url)).arrayBuffer()).toString("base64");
  fontFace = fontFace.replace(url, `data:font/ttf;base64,${data}`);
}
if (!fontFace.includes("data:font/ttf")) throw new Error("Instrument Sans not found");

const entry = join(work, "entry.tsx");
writeFileSync(
  entry,
  `import { createRoot } from "react-dom/client";
import { PricingModal } from ${JSON.stringify(join(pkg, "src/marketing/PricingModal.tsx"))};
const q = new URLSearchParams(location.search);
document.documentElement.classList.toggle("dark", q.get("theme") !== "light");
createRoot(document.getElementById("root")!).render(
  <PricingModal
    open
    onClose={() => undefined}
    title="Plans"
    description="Choose a plan"
    apps={["vibot", "verve", "velth", "vmem", "vhub"]}
    headline="One plan. Every V app."
    finePrint={q.get("period") === "year" ? "Cancel anytime. $120 billed yearly. Save 33%." : "Cancel anytime. Billed monthly."}
    defaultBillingPeriod={q.get("period") === "year" ? "year" : "month"}
    plans={[
      { id: "free", name: "Free", price: { month: "$0", year: "$0" }, current: true, intro: "Start here:",
        highlight: { title: "Core", description: "limited use" },
        benefits: [{ label: "vibot: core chat", icon: "vibot" }, { label: "vmem: basic memory", icon: "vmem" }, { label: "vhub: basic storage", icon: "vhub" }] },
      { id: "pro", name: "V Pro", price: { month: "$15", year: "$10" }, featured: true, ctaLabel: "Upgrade", intro: "Everything in Free, and:",
        highlight: { title: "Shared", description: "usage across every V app" },
        benefits: [{ label: "vibot: higher limits", icon: "vibot" }, { label: "Verve: Pro features", icon: "verve" }, { label: "Velth: Pro features", icon: "velth" }, { label: "vmem: more memory", icon: "vmem" }, { label: "vhub: more storage", icon: "vhub" }] },
    ]}
    renderCheckout={(button) => button}
  />,
);
`,
);
const js = await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  nodePaths: [join(pkg, "node_modules")],
  absWorkingDir: pkg,
});

const candidates = new Set();
for (const dir of ["src/marketing", "src/ui", "src/brand"]) {
  for (const f of readdirSync(join(pkg, dir)).filter((n) => /\.tsx?$/.test(n))) {
    for (const t of readFileSync(join(pkg, dir, f), "utf8").split(/[\s"'`<>={}()]+/)) if (t) candidates.add(t);
  }
}
const compiler = await compile(
  `@import "tailwindcss";\n@import ${JSON.stringify(join(pkg, "tokens/src/tokens.css"))};\n@import ${JSON.stringify(join(pkg, "tokens/src/css/index.css"))};\n`,
  { base: pkg, onDependency: () => undefined },
);
const css = compiler.build([...candidates]);

writeFileSync(
  join(work, "index.html"),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fontFace}</style><style>${css}</style><body class="bg-background font-sans text-foreground"><div id="root"></div><script>${js.outputFiles[0].text.replaceAll("</script", "<\\/script")}</script>`,
);

const shots = [
  ["pricing-2-monthly-dark", "dark", "month", 1280, 820],
  ["pricing-2-annual-dark", "dark", "year", 1280, 820],
  ["pricing-2-monthly-light", "light", "month", 1280, 820],
  ["pricing-2-annual-light", "light", "year", 1280, 820],
  ["pricing-2-mobile-dark", "dark", "month", 390, 1160],
];
const chrome = ["google-chrome", "chromium", "chromium-browser"].find((b) => spawnSync(b, ["--version"]).status === 0);
if (!chrome) throw new Error("Chrome not found");
for (const [name, theme, period, w, h] of shots) {
  const file = join(out, `${name}.png`);
  rmSync(file, { force: true });
  const url = `${pathToFileURL(join(work, "index.html")).href}?theme=${theme}&period=${period}`;
  const r = spawnSync(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", `--user-data-dir=${join(work, "profile")}`, "--hide-scrollbars", "--force-device-scale-factor=2", `--window-size=${w},${h}`, "--virtual-time-budget=3000", `--screenshot=${file}`, url], { encoding: "utf8", timeout: 30000, killSignal: "SIGKILL" });
  // Chrome can stay up after it writes the file, so a timeout kill is fine when the PNG exists.
  if (!existsSync(file) || (r.status !== 0 && r.error?.code !== "ETIMEDOUT")) throw new Error(r.stderr || "no screenshot");
  console.log(file);
}
