#!/usr/bin/env node
import { runClerkAllow } from "./clerk-allow.js";

process.exitCode = await runClerkAllow(process.argv.slice(2), {
  log: (message) => console.info(message),
  error: (message) => console.error(message),
  env: process.env,
  fetch,
});
