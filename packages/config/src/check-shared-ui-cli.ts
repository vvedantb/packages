#!/usr/bin/env node
import { runCheckSharedUi } from "./check-shared-ui.js";

process.exitCode = runCheckSharedUi(process.argv.slice(2), {
  log: (message) => console.info(message),
  error: (message) => console.error(message),
  cwd: () => process.cwd(),
});
