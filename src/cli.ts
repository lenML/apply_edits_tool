#!/usr/bin/env node

import * as path from "node:path";
import { createInterface } from "node:readline";
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
} from "./feedback.js";

async function readStdin(): Promise<string> {
  const rl = createInterface({ input: process.stdin });
  const chunks: string[] = [];
  for await (const chunk of rl) {
    chunks.push(chunk);
  }
  return chunks.join("\n");
}

function printHelp(): void {
  console.log(`Usage: apply-edits [--workspace <dir>] [<command>]

--workspace <dir>   Root directory for file paths (default: current working directory)
<command>           The edit command string. If omitted, reads from stdin (pipe-friendly).

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
<<<<<<< MATCH
def fib(n):
...
    return result
=======
def fib(n):
    return n
>>>>>>> REPLACE
  `);
}

async function main(): Promise<void> {
  let command: string | undefined;
  let workspace: string | null = null;

  const args = process.argv.slice(2);
  // Parse flags first, then first positional arg is the command
  let i = 0;
  while (i < args.length) {
    if (args[i] === "--workspace" && i + 1 < args.length) {
      workspace = path.resolve(args[i + 1]);
      i += 2;
    } else if (args[i] === "--help") {
      printHelp();
      process.exit(0);
    } else if (args[i] === "--") {
      // Everything after -- is positional
      i++;
      break;
    } else if (!args[i].startsWith("--")) {
      // First positional arg = command
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
  }

  if (!command || command.trim() === "") {
    console.error(formatNoCommand());
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
    console.error(formatNoEdits());
    process.exit(1);
  }

  const simulation = await simulateEdits(fileEdits, workspace!);

  if (!simulation.valid) {
    console.error(formatSimulationErrors(simulation.errors));
    process.exit(1);
  }

  try {
    await applyEditsAtomic(simulation.files, workspace!);
    console.log(formatSuccess(simulation.files.size));
    process.exit(0);
  } catch (err: any) {
    console.error(formatApplyError(err.message));
    process.exit(1);
  }
}

main();
