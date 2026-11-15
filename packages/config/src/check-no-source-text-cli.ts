#!/usr/bin/env node
import { runCheckNoSourceText } from "./check-no-source-text.js";

process.exitCode = runCheckNoSourceText(process.argv.slice(2), {
  log: (message) => console.info(message),
  error: (message) => console.error(message),
  cwd: () => process.cwd(),
});
