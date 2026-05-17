#!/usr/bin/env node
import { readFileAutoEncoding, writeFileUtf8 } from "./encoding.js";
import * as path from "node:path";

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log("Usage: exec-js-edits [--dry-run] <file> <js-code>");
    console.log("Read file with encoding detection -> run JS -> write back as UTF-8.");
    console.log("The JS code receives `content` as the file content string.");
    console.log("Examples:");
    console.log("  exec-js-edits main.ts \"return content.replace(/foo/g, 'bar')\"");
    console.log("  exec-js-edits --dry-run data.json \"c => JSON.stringify(JSON.parse(c), null, 2)\"");
    process.exit(0);
  }
  if (args[0] === "--version") {
    const pkg = await import("../package.json");
    console.log(pkg.default.name, pkg.default.version);
    process.exit(0);
  }

  let dryRun = false;
  let fileIdx = 0;
  if (args[0] === "--dry-run") {
    dryRun = true;
    fileIdx = 1;
  }

  if (args.length < fileIdx + 2) {
    console.error("Usage: exec-js-edits [--dry-run] <file> <js-code>");
    process.exit(1);
  }

  const filePath = path.resolve(args[fileIdx]);
  const code = args[fileIdx + 1];

  const fn = new Function("content", code);
  try {
    const content = await readFileAutoEncoding(filePath);
    const result = fn(content);
    if (typeof result !== "string") {
      console.error("exec-js-edits: code must return a string, got " + typeof result);
      process.exit(1);
    }
    if (dryRun) {
      console.log("// dry-run -- would write " + filePath);
      process.stdout.write(result);
      return;
    }
    await writeFileUtf8(filePath, result);
    console.log("? Applied transform to " + filePath);
  } catch (err) {
    console.error("exec-js-edits error:", err);
    process.exit(1);
  }
}

main();
