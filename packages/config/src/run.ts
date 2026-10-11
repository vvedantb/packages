import { resolve } from "node:path";
import { runSync } from "./sync.js";

export type CliIo = {
  log: (message: string) => void;
  error: (message: string) => void;
  cwd: () => string;
};

const USAGE = `Usage: vvedantb-config sync [--check] [--cwd <dir>]

  sync            Write shared Claude commands, CLAUDE.md headings,
                  .cursor/environment.json and the Convex tsconfig.
  --check         Write nothing. Exit 1 if any managed file would change.
  --cwd <dir>     Target repo. Default: current directory.`;

/** Run the CLI. Returns the process exit code. */
export function runCli(argv: readonly string[], io: CliIo): number {
  const [command, ...rest] = argv;
  if (command === undefined || command === "--help" || command === "-h") {
    io.log(USAGE);
    return command === undefined ? 2 : 0;
  }
  if (command !== "sync") {
    io.error(`Unknown command: ${command}\n${USAGE}`);
    return 2;
  }

  let check = false;
  let cwd = io.cwd();
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--check") {
      check = true;
    } else if (arg === "--cwd") {
      const value = rest[i + 1];
      if (value === undefined) {
        io.error(`--cwd needs a directory\n${USAGE}`);
        return 2;
      }
      cwd = resolve(io.cwd(), value);
      i += 1;
    } else {
      io.error(`Unknown option: ${arg}\n${USAGE}`);
      return 2;
    }
  }

  const { changes, errors } = runSync({ cwd, check });
  for (const message of errors) io.error(`error: ${message}`);
  if (errors.length > 0) return 2;

  if (check) {
    if (changes.length === 0) {
      io.log("In sync.");
      return 0;
    }
    io.error("Out of sync. Run `vvedantb-config sync` to update:");
    for (const change of changes) io.error(`  ${change.path}`);
    return 1;
  }
  if (changes.length === 0) {
    io.log("Already in sync.");
    return 0;
  }
  for (const change of changes) {
    io.log(`${change.action === "create" ? "created" : "updated"} ${change.path}`);
  }
  return 0;
}
