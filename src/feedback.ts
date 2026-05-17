import type { SimulationError } from "./types.js";

const SEP = "─".repeat(48);
const MAX_SNIPPET_LINES = 12;

// ── Helpers ──

/** Show first N lines of content with line numbers and a highlight marker. */
function snippet(
  content: string,
  highlightLine?: number,
  maxLines = MAX_SNIPPET_LINES,
): string {
  const lines = content.split("\n");
  const total = lines.length;
  const show = Math.min(total, maxLines);
  const startLine = 1;

  const out: string[] = [];
  for (let i = 0; i < show; i++) {
    const marker = highlightLine === i + 1 ? " >" : "  ";
    out.push(`${marker} ${String(startLine + i).padStart(3)} │ ${lines[i]}`);
  }
  if (total > maxLines) {
    out.push(`  ${" ".repeat(3)} │ ... (${total - maxLines} more lines)`);
  }
  return out.join("\n");
}

/** Show the search/replace text with a header. */
function showBlock(label: string, text: string): string {
  const lines = text.split("\n");
  const lineCount = lines.length;
  const out: string[] = [];
  out.push(`  ${label} (${lineCount} line${lineCount > 1 ? "s" : ""}):`);
  for (const ln of lines) {
    out.push(`  │ ${ln}`);
  }
  return out.join("\n");
}

// ── Public formatters ──

export function formatNoCommand(input?: string): string {
  const lines: string[] = [];
  lines.push("✖ No command provided");
  if (input !== undefined) {
    const size = input.length;
    lines.push("");
    lines.push(`  Received ${size} char(s):`);
    if (size === 0) {
      lines.push("    (empty input)");
    } else {
      const preview = input.slice(0, 200);
      const escaped = preview.replace(/\x1b/g, "␛").replace(/\0/g, "␀");
      lines.push(`    "${escaped}${size > 200 ? "…" : ""}"`);
    }
  }
  lines.push("");
  lines.push("  Provide a command via a positional argument, pipe to stdin, or using --command.");
  lines.push("  See --help for usage details.");
  return lines.join("\n");
}

export function formatParseError(message: string, command?: string): string {
  const out: string[] = [];
  out.push(`✖ Parse error`);
  out.push(`  ${message}`);

    if (command) {
      const size = command.length;
      const cmdLines = command.split("\n");
      out.push("");
      out.push(`  Input: ${size} chars, ${cmdLines.length} lines`);
      out.push(snippet(command, 15));
    }

  return out.join("\n");
}

export function formatNoEdits(rawInput?: string): string {
  const out: string[] = [];
  out.push("✖ No valid edit blocks found");
  if (rawInput && rawInput.trim().length > 0) {
    out.push("");
    out.push("  Parsed the following input but found no valid edit blocks:");
    out.push(snippet(rawInput, 15));
    out.push("");
    out.push("  Expected format:");
    out.push("    path/to/file.ext");
    out.push("    ```lang");
    out.push("    <<<<<<< SEARCH");
    out.push("    ...");
    out.push("    =======");
    out.push("    ...");
    out.push("    >>>>>>> REPLACE");
    out.push("    ```");
  }
  return out.join("\n");
}

export function formatSimulationErrors(errors: SimulationError[], rawInput?: string): string {
  const out: string[] = [];
  const count = errors.length;
  out.push(`✖ Validation failed — ${count} error(s)`);
  if (rawInput) {
    const size = rawInput.length;
    const cmdLines = rawInput.split("\n");
    out.push("");
    out.push(`  Input: ${size} chars, ${cmdLines.length} lines`);
  }
  out.push("");

  for (const err of errors) {
    const blockTag = err.blockIndex ? `  Block ${err.blockIndex}/${err.totalBlocks ?? "?"}` : "";
    out.push(`  ${err.filePath}${blockTag}`);
    out.push(`  ${err.error}`);
    out.push("");

    // Show SEARCH text
    if (err.searchText) {
      out.push(showBlock("Searching for", err.searchText));
      out.push("");
    }

    // Show REPLACE text
    if (err.replaceText) {
      out.push(showBlock("Would replace with", err.replaceText));
      out.push("");
    }

    // Show current content around the failure
    if (err.currentContent) {
      const cc = err.currentContent;
      out.push(`  Current file content (first ${MAX_SNIPPET_LINES} lines):`);
      out.push(snippet(cc));
      out.push("");

      // Attempt to find partial matches for helpful hints
      const searchLines = err.searchText?.split("\n") ?? [];
      const firstSearchLine = searchLines.find((l) => l.trim().length > 0);
      if (firstSearchLine) {
        const ccLines = cc.split("\n");
        const trimmedSearch = firstSearchLine.trim();
        const trimmedSearchLower = trimmedSearch.toLowerCase();
        const closeMatch = ccLines.findIndex(
          (l) => l.trim().toLowerCase() === trimmedSearchLower,
        );
        if (closeMatch >= 0) {
          out.push(
            `  💡 Tip: Line ${closeMatch + 1} of the file matches the first line of`,
          );
          out.push(`     your search text. Previous blocks may have modified`);
          out.push(`     the content after that point — check the order of edits.`);
        } else {
          const prefix = trimmedSearch.slice(0, 20).toLowerCase();
          const partialMatch = ccLines.findIndex((l) =>
            l.trim().toLowerCase().includes(prefix),
          );
          if (partialMatch >= 0) {
            out.push(
              `  💡 Tip: A partial match was found at line ${partialMatch + 1}.`,
            );
            out.push(`     Check for case differences, typos, or whitespace.`);
          } else {
            out.push(
              `  💡 Tip: The search text does not appear anywhere in the file.`,
            );
            out.push(`     Check that the file path is correct and the content exists.`);
          }
        }
        out.push("");
      }
    }

    out.push(SEP);
    out.push("");
  }

  return out.join("\n");
}

export function formatApplyError(message: string): string {
  return `✖ Write error\n  ${message}\n\n  Temp files have been cleaned up. No files were modified.`;
}

export function formatDryRun(fileCount: number): string {
  return `DRY RUN - All ${fileCount} file(s) validated but NOT applied.`;
}

export function formatSuccess(fileCount: number, files?: string[]): string {
  const out: string[] = [];
  out.push(`✔ Successfully applied edits to ${fileCount} file(s).`);
  if (files && files.length > 0) {
    for (const f of files) {
      out.push(`   - ${f}`);
    }
  }
  return out.join("\n");
}
