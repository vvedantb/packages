#!/usr/bin/env node
import { runDoctor } from "./doctor.js";

process.exitCode = runDoctor(process.argv.slice(2), {
  log: (message) => console.info(message),
  error: (message) => console.error(message),
  cwd: () => process.cwd(),
});
