#!/usr/bin/env node

import * as path from "node:path";
import { decodeBuffer } from "./encoding.js";
import { autofixInput } from "./autofixer.js";

import { parseCommand } from "./parser.js";
import { simulateEdits, applyEditsAtomic } from "./editor.js";
import {
  formatNoCommand,
  formatParseError,
  formatNoEdits,
  formatSimulationErrors,
  formatApplyError,
  formatSuccess,
  formatDryRun,
} from "./feedback.js";

import pkg from "../package.json";


/**
 * Checks the decoded input for encoding red flags.
 * Returns an error message if issues are detected, null if clean.
 */
function checkEncodingIssues(input: string): string | null {
  // Check for null bytes ? indicates UTF-16 LE was read as latin1
  if (input.includes("\0")) {
    return (
      "Input contains null bytes ? likely UTF-16 LE data decoded as wrong encoding.\n" +
      "  Set PowerShell output encoding to UTF-8 before piping:\n" +
      "    \x24OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8"
    );
  }

  // Check for trailing BOM remnant (?? at start from UTF-16 LE BOM)
  if (input.length > 0 && (input.charCodeAt(0) === 0xFF || input.charCodeAt(0) === 0xFE)) {
    return (
      "Input starts with byte-order-mark remnant ? likely a BOM was not stripped correctly."
    );
  }

  return null;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  return decodeBuffer(buffer);
}

function printHelp(): void {
  console.log(`Usage: apply-edits [--workspace <dir>] [<command>]

--workspace <dir>   Root directory for file paths (default: current working directory)
<command>           The edit command string. If omitted, reads from stdin (pipe-friendly).
--version           Show version number
--dry-run           Validate edits without applying them



The command format consists of one or more blocks:

path/to/file.py
\`\`\`python
<<<<<<< SEARCH
old code
=======
new code
>>>>>>> REPLACE
\`\`\`

For MATCH mode with wildcard:

path/to/file.py
\`\`\`python
<<<<<<< MATCH
def fib(n):
...
return result
=======
def fib(n):
return n
>>>>>>> REPLACE
\`\`\`
  `);
}

async function main(): Promise<void> {
  let command: string | undefined;
  let workspace: string | null = null;
  let dryRun = false;

  const args = process.argv.slice(2);
  // Parse flags first, then first positional arg is the command
  let i = 0;
  while (i < args.length) {
    if (args[i] === "--workspace" && i + 1 < args.length) {
      workspace = path.resolve(args[i + 1]);
      i += 2;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
      i++;
    } else if (args[i] === "--version") {
      console.log(pkg.name, pkg.version);
      process.exit(0);
    } else if (args[i] === "--help") {
      printHelp();
      process.exit(0);
    } else if (args[i] === "--") {
      // Everything after -- is positional
      i++;
      break;
    } else if (!args[i].startsWith("--")) {
      // Treat as edit command
      command = args[i];
      i++;
      break;
    } else {
      // Unknown flag, skip
      i++;
    }
  }

  if (command === undefined) {
    command = await readStdin();
    const encErr = checkEncodingIssues(command);
    if (encErr) {
      console.error("? Encoding error\n  " + encErr);
      process.exit(1);
    }
  }

  const rawInput = command ?? "";

  if (!command || command.trim() === "") {
    console.error(formatNoCommand(rawInput));
    process.exit(1);
  }

  if (workspace === null) {
    workspace = process.cwd();
  }

  // Autofix common formatting issues before parsing
  const fixedCommand = autofixInput(command);

  let fileEdits: Awaited<ReturnType<typeof parseCommand>>;
  try {
    fileEdits = parseCommand(fixedCommand);
  } catch (err: any) {
    console.error(formatParseError(err.message, fixedCommand));
    process.exit(1);
  }

  if (fileEdits.length === 0) {
    console.error(formatNoEdits(rawInput));
    process.exit(1);
  }

  const simulation = await simulateEdits(fileEdits, workspace!);

  if (!simulation.valid) {
    console.error(formatSimulationErrors(simulation.errors, rawInput));
    process.exit(1);
  }

  if (dryRun) {
    console.log(formatDryRun(simulation.files.size));
    process.exit(0);
  }

  try {
    await applyEditsAtomic(simulation.files, workspace!);
    console.log(formatSuccess(simulation.files.size, [...simulation.files.keys()], simulation.matches));
    process.exit(0);
  } catch (err: any) {
    console.error(formatApplyError(err.message));
    process.exit(1);
  }
}

main();
