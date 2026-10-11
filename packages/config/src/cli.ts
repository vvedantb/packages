#!/usr/bin/env node
import { runCli } from "./run.js";

process.exitCode = runCli(process.argv.slice(2), {
  log: (message) => console.info(message),
  error: (message) => console.error(message),
  cwd: () => process.cwd(),
});
