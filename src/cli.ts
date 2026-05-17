#!/usr/bin/env node

import * as path from "node:path";
import { createInterface } from "node:readline";
import { autofixInput } from "./autofixer.js";
import { parseCommand } from "./parser.js";
import { simulateEdits, applyEditsAtomic } from "./editor.js";

async function readStdin(): Promise<string> {
  const rl = createInterface({ input: process.stdin });
  const chunks: string[] = [];
  for await (const chunk of rl) {
    chunks.push(chunk);
  }
  return chunks.join("\n");
}

function printHelp(): void {
  console.log(`Usage: apply-edits [--workspace <dir>] (--command <string> | --command - | --command readfile(0) | no --command reads from stdin)

--workspace <dir>   Root directory for file paths (default: current working directory)
--command           The edit command string; use "-" or "readfile(0)" to read from stdin.
                    If --command is omitted, reads from stdin as well.

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
  let explicitStdin = false;

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--command" && i + 1 < args.length) {
      const val = args[i + 1];
      if (val === "-" || val === "readfile(0)") {
        explicitStdin = true;
      } else {
        command = val;
      }
      i++;
    } else if (args[i] === "--workspace" && i + 1 < args.length) {
      workspace = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  if (explicitStdin || command === undefined) {
    command = await readStdin();
  }

  if (!command || command.trim() === "") {
    console.error("Error: No command provided (use --command, --command -, or pipe to stdin)");
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
    console.error(`Parse error: ${err.message}`);
    process.exit(1);
  }

  if (fileEdits.length === 0) {
    console.error("Error: No valid edit blocks found");
    process.exit(1);
  }

  const simulation = await simulateEdits(fileEdits, workspace!);

  if (!simulation.valid) {
    console.error("Validation failed:");
    for (const e of simulation.errors) {
      console.error(`  ${e.filePath}: ${e.error}`);
    }
    process.exit(1);
  }

  try {
    await applyEditsAtomic(simulation.files, workspace!);
    console.log(`Successfully applied edits to ${simulation.files.size} file(s).`);
    process.exit(0);
  } catch (err: any) {
    console.error(`Apply error: ${err.message}`);
    process.exit(1);
  }
}

main();
