import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";

/** Console and working directory handed in by the bin, so tests can capture output. */
export type CheckSharedUiIo = {
  log: (message: string) => void;
  error: (message: string) => void;
  cwd: () => string;
};

export type CheckSharedUiOptions = {
  /** Repo root. Paths below are relative to it. */
  root: string;
  /** Package that exports the shared components. */
  packageName: string;
  /** Components that count as the shared footer. */
  footerComponents: readonly string[];
  /** Directories whose footer files must render a shared footer. */
  footerDirs: readonly string[];
  /** Directories whose footer files are only checked for banned patterns. */
  footerScanDirs: readonly string[];
  /** Path segments to skip when looking for footer files, such as `sidebar`. */
  footerExclude: readonly string[];
  /** Hosts whose bare root URL is a placeholder social link. */
  socialHosts: readonly string[];
  /** Pages that must render the shared header. */
  headerPages: readonly string[];
  /** The shared header component. */
  headerComponent: string;
  /** Directories searched for local landing navigation files. */
  navDirs: readonly string[];
  /** A file whose name starts with one of these is a local landing nav. */
  localNavNames: readonly string[];
  /** Directory names never entered. */
  skip: readonly string[];
};

export const DEFAULT_SKIP = [
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".output",
  ".expo",
  ".git",
];

export const DEFAULT_OPTIONS = {
  packageName: "@vvedantb/ui",
  footerComponents: ["SiteFooter", "LandingFooter"],
  footerDirs: ["apps/web"],
  footerScanDirs: [] as string[],
  footerExclude: [] as string[],
  socialHosts: ["twitter.com", "x.com", "linkedin.com", "github.com"],
  headerPages: [] as string[],
  headerComponent: "SiteHeader",
  navDirs: ["apps"],
  localNavNames: ["LandingNav"],
  skip: [] as string[],
} satisfies Omit<CheckSharedUiOptions, "root">;

const USAGE = `Usage: vvedantb-check-shared-ui [options]

Checks that an app uses the shared site header and footer from @vvedantb/ui.

Footer (every *Footer*.tsx or *Footer*.jsx file, test files excluded):
  - no bare social root link, such as "https://x.com/" or "https://linkedin.com"
  - no size prop on <AppWordmark>
  - files in a --footer-dir render a shared footer component from the package

Header (each --header-page):
  - renders the shared header component, imported from the package
  - no local landing navigation file (name starts with --local-nav-name)

Options (repeatable ones add to the list; the first use replaces the default):
  --root <dir>             Repo root. Default: current directory.
  --package <name>         Shared package. Default: @vvedantb/ui.
  --footer-component <n>   Shared footer component. Default: SiteFooter, LandingFooter.
  --footer-dir <dir>       Footer files here must render a shared footer. Default: apps/web.
  --footer-scan-dir <dir>  Footer files here only get the banned-pattern checks. Default: none.
  --footer-exclude <seg>   Skip footer files under a path segment, for example sidebar.
  --social-host <host>     Host whose bare root URL is a placeholder. Default: twitter.com,
                           x.com, linkedin.com, github.com.
  --header-page <file>     Page that must render the shared header. Default: none (skipped).
  --header-component <n>   Shared header component. Default: SiteHeader.
  --nav-dir <dir>          Where to look for local landing nav files. Default: apps.
  --local-nav-name <name>  Forbidden file name prefix. Default: LandingNav.
  --skip <name>            Extra directory name to skip. Defaults: ${DEFAULT_SKIP.join(", ")}.
  -h, --help               Show this text.

Exit code: 0 clean, 1 findings, 2 bad usage.`;

const FLAG_TO_KEY = {
  "--footer-component": "footerComponents",
  "--footer-dir": "footerDirs",
  "--footer-scan-dir": "footerScanDirs",
  "--footer-exclude": "footerExclude",
  "--social-host": "socialHosts",
  "--header-page": "headerPages",
  "--nav-dir": "navDirs",
  "--local-nav-name": "localNavNames",
  "--skip": "skip",
} as const;

type ListKey = (typeof FLAG_TO_KEY)[keyof typeof FLAG_TO_KEY];

/** Parse argv. Returns an error message or the options. */
export function parseArgs(
  argv: readonly string[],
  cwd: string,
): { options: CheckSharedUiOptions } | { error: string } | { help: true } {
  const lists: Partial<Record<ListKey, string[]>> = {};
  let root = cwd;
  let packageName: string = DEFAULT_OPTIONS.packageName;
  let headerComponent: string = DEFAULT_OPTIONS.headerComponent;

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i] ?? "";
    if (flag === "--help" || flag === "-h") return { help: true };
    const known = flag === "--root" || flag === "--package" || flag === "--header-component";
    const key = (FLAG_TO_KEY as Record<string, ListKey | undefined>)[flag];
    if (!known && key === undefined) return { error: `Unknown option: ${flag}` };
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) return { error: `${flag} needs a value` };
    i += 1;
    if (flag === "--root") root = resolve(cwd, value);
    else if (flag === "--package") packageName = value;
    else if (flag === "--header-component") headerComponent = value;
    else if (key !== undefined) (lists[key] ??= []).push(value);
  }

  const pick = (key: ListKey): readonly string[] => lists[key] ?? DEFAULT_OPTIONS[key];
  return {
    options: {
      root,
      packageName,
      headerComponent,
      footerComponents: pick("footerComponents"),
      footerDirs: pick("footerDirs"),
      footerScanDirs: pick("footerScanDirs"),
      footerExclude: pick("footerExclude"),
      socialHosts: pick("socialHosts"),
      headerPages: pick("headerPages"),
      navDirs: pick("navDirs"),
      localNavNames: pick("localNavNames"),
      skip: [...DEFAULT_SKIP, ...(lists.skip ?? [])],
    },
  };
}

function* walk(dir: string, skip: ReadonlySet<string>): Generator<string> {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full, skip);
    else yield full;
  }
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches a bare social root URL that ends a string literal: "https://x.com/" or `https://www.linkedin.com`. */
function bareSocialPattern(hosts: readonly string[]): RegExp {
  const alternation = hosts.map(escapeRegExp).join("|");
  return new RegExp(`https?://(?:www\\.)?(?:${alternation})/?(?=["'\`])`);
}

const isFooterFile = (file: string): boolean =>
  /Footer[^/\\]*\.[jt]sx$/.test(file) && !/\.(test|spec)\./.test(basename(file));

const importsFrom = (source: string, packageName: string): boolean =>
  new RegExp(`from\\s+["']${escapeRegExp(packageName)}["']`).test(source);

const posix = (path: string): string => path.split(sep).join("/");

/** Run every check. Returns the list of findings; an empty list means a pass. */
export function checkSharedUi(options: CheckSharedUiOptions): { errors: string[]; footerFiles: number } {
  const { root } = options;
  const skip = new Set(options.skip);
  const exclude = new Set(options.footerExclude);
  const errors: string[] = [];
  const social = bareSocialPattern(options.socialHosts);
  const footerCall = new RegExp(`<(?:${options.footerComponents.map(escapeRegExp).join("|")})\\b`);

  const absolute = (dir: string): string => (isAbsolute(dir) ? dir : join(root, dir));
  const rel = (file: string): string => posix(relative(root, file));
  const excluded = (file: string): boolean => relative(root, file).split(sep).some((part) => exclude.has(part));

  const seen = new Set<string>();
  const footers: { file: string; required: boolean }[] = [];
  const collect = (dirs: readonly string[], required: boolean): void => {
    for (const dir of dirs) {
      for (const file of walk(absolute(dir), skip)) {
        if (!isFooterFile(file) || excluded(file)) continue;
        if (seen.has(file)) continue;
        seen.add(file);
        footers.push({ file, required });
      }
    }
  };
  // Required dirs first, so a file in both is held to the stricter rule.
  collect(options.footerDirs, true);
  collect(options.footerScanDirs, false);

  for (const { file, required } of footers) {
    const source = readFileSync(file, "utf8");
    if (social.test(source)) {
      errors.push(`${rel(file)}: bare social root href; use the shared footer defaults`);
    }
    if (/<AppWordmark\b[^>]*\bsize=/.test(source)) {
      errors.push(`${rel(file)}: AppWordmark size prop in footer`);
    }
    if (required && !(footerCall.test(source) && importsFrom(source, options.packageName))) {
      errors.push(`${rel(file)}: must render ${options.footerComponents.join(" or ")} from ${options.packageName}`);
    }
  }

  const headerCall = new RegExp(`<${escapeRegExp(options.headerComponent)}\\b`);
  for (const page of options.headerPages) {
    const path = absolute(page);
    if (!existsSync(path)) {
      errors.push(`${posix(page)}: header page not found`);
      continue;
    }
    const source = readFileSync(path, "utf8");
    if (!(headerCall.test(source) && importsFrom(source, options.packageName))) {
      errors.push(`${posix(page)}: must render ${options.headerComponent} from ${options.packageName}`);
    }
  }

  if (options.headerPages.length > 0) {
    for (const dir of options.navDirs) {
      for (const file of walk(absolute(dir), skip)) {
        const name = basename(file);
        if (/\.[jt]sx?$/.test(name) && options.localNavNames.some((prefix) => name.startsWith(prefix))) {
          errors.push(`${rel(file)}: local landing navigation is not allowed; use ${options.headerComponent}`);
        }
      }
    }
  }

  return { errors, footerFiles: footers.length };
}

/** Run the CLI. Returns the process exit code. */
export function runCheckSharedUi(argv: readonly string[], io: CheckSharedUiIo): number {
  const parsed = parseArgs(argv, io.cwd());
  if ("help" in parsed) {
    io.log(USAGE);
    return 0;
  }
  if ("error" in parsed) {
    io.error(`${parsed.error}\n${USAGE}`);
    return 2;
  }
  const { errors, footerFiles } = checkSharedUi(parsed.options);
  if (errors.length > 0) {
    io.error(`Shared header and footer check failed:\n${errors.map((message) => `  - ${message}`).join("\n")}`);
    return 1;
  }
  const headers = parsed.options.headerPages.length;
  io.log(`Shared header and footer check passed (${footerFiles} footer files, ${headers} header pages).`);
  return 0;
}
