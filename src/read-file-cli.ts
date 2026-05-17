#!/usr/bin/env node
import { readFileAutoEncoding } from "./encoding.js";
import * as path from "node:path";

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log("Usage: read-file <path>");
    console.log("Read a file with auto encoding detection and print as UTF-8.");
    process.exit(0);
  }
  if (args[0] === "--version") {
    const pkg = await import("../package.json");
    console.log(pkg.default.name, pkg.default.version);
    process.exit(0);
  }
  try {
    const content = await readFileAutoEncoding(path.resolve(args[0]));
    process.stdout.write(content);
  } catch (err) {
    console.error("Error reading file:", err);
    process.exit(1);
  }
}

main();
