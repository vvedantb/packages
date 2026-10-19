#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { runCheckAsar } from "./check-asar.js";

const code = await runCheckAsar(process.argv.slice(2), {
  log: (message) => console.info(message),
  error: (message) => console.error(message),
  cwd: () => process.cwd(),
  env: process.env,
  selfPath: fileURLToPath(import.meta.url),
});
// Exit at once on failure; on success let the process end by itself, as the original scripts did.
if (code !== 0) process.exit(code);
