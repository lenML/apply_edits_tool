#!/usr/bin/env node

import * as path from "node:path";
import { simulateEdits, applyEditsAtomic } from "./editor.js";
import type { EditEntry } from "./types.js";
import pkg from "../package.json";

function printHelp(): void {
  console.log(`Usage: apply-edits --workdir <dir> <file> <old-text> <new-text> [<file> <old-text> <new-text> ...]

--workdir <dir>  Root directory for file paths (default: current working directory)
--version        Show version number
--help           Show this help

Arguments are grouped in triples: <file> <old-text> <new-text>.
Each triple applies one search-and-replace to the given file.
Old text supports trimmed line-by-line matching for whitespace flexibility.

Examples:
  apply-edits --workdir . src/main.ts "print(1)" "print(2)"
  apply-edits --workdir . src/app.ts "foo()" "bar()" src/app.ts "old" "new"
  `);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let workdir = process.cwd();
  let i = 0;

  if (args[i] === "--workdir" && args[i + 1]) {
    workdir = path.resolve(args[i + 1]);
    i += 2;
  }

  if (args[i] === "--help" || args[i] === "-h") {
    printHelp();
    process.exit(0);
  }

  if (args[i] === "--version") {
    console.log(pkg.name, pkg.version);
    process.exit(0);
  }

  const remaining = args.slice(i);
  if (remaining.length === 0 || remaining.length % 3 !== 0) {
    console.error("Usage: apply-edits --workdir <dir> <file> <old-text> <new-text> ...");
    console.error("Got " + remaining.length + " argument(s); expected multiples of 3.");
    process.exit(1);
  }

  const entries: EditEntry[] = [];
  for (let j = 0; j < remaining.length; j += 3) {
    entries.push({ filePath: remaining[j], oldText: remaining[j + 1], newText: remaining[j + 2] });
  }

  const { files, errors } = await simulateEdits(entries, workdir);

  if (errors.length > 0) {
    for (const err of errors) {
      console.error("✖ " + err.filePath + ": " + err.error);
    }
  }

  if (files.size === 0) {
    process.exit(errors.length > 0 ? 1 : 0);
  }

  try {
    await applyEditsAtomic(files, workdir);
    for (const fp of files.keys()) {
      const display = path.relative(workdir, fp);
      console.log("✔ " + display);
    }
    process.exit(errors.length > 0 ? 1 : 0);
  } catch (err: any) {
    console.error("✖ Write failed: " + err.message);
    process.exit(1);
  }
}

main();
