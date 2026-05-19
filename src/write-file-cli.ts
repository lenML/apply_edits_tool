#!/usr/bin/env node
import { decodeBuffer } from "./encoding.js";
import { writeFileAtomic } from "./atomic.js";
import * as path from "node:path";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  const decoded = decodeBuffer(buffer);
  // Check for null bytes - indicates UTF-16 LE piped without BOM
  if (decoded.includes("\0")) {
    console.error("Warning: stdin contains null bytes (likely PowerShell piped UTF-16 LE).");
    console.error("Set encoding before piping:");
    console.error("  $OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8");
  }
  return decoded;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log("Usage: write-file <path> [content]");
    console.log("Write content to a file as UTF-8 without BOM.");
    console.log("If content is omitted, reads from stdin.");
    process.exit(0);
  }
  if (args[0] === "--version") {
    const pkg = await import("../package.json");
    console.log(pkg.default.name, pkg.default.version);
    process.exit(0);
  }
  try {
    const filePath = path.resolve(args[0]);
    let content = args.slice(1).join(" ");
    if (!content) {
      content = await readStdin();
    }
    await writeFileAtomic(filePath, content);
    const lines = content.split("\n").length;
    const chars = content.length;
    const displayPath = path.relative(process.cwd(), filePath);
    console.error(`✔ Wrote ${lines} lines, ${chars} chars to ${displayPath}`);
  } catch (err) {
    console.error("Error writing file:", err);
    process.exit(1);
  }
}

main();
