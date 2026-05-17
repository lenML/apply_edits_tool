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

export function formatNoCommand(): string {
  return [
    "✖ No command provided",
    "",
    "  Provide a command via --command <string>, --command -, or pipe to stdin.",
    `  See --help for usage details.`,
  ].join("\n");
}

export function formatParseError(message: string, command?: string): string {
  const out: string[] = [];
  out.push(`✖ Parse error`);
  out.push(`  ${message}`);

  if (command) {
    const lines = command.split("\n");
    // Try to find the problematic line from the error message
    const lineMatch = message.match(/at line (\d+)/i);
    const errLine = lineMatch ? Number(lineMatch[1]) : undefined;

    if (errLine && errLine <= lines.length) {
      out.push("");
      out.push(`  ─── input near line ${errLine} ───`);
      const start = Math.max(0, errLine - 3);
      const end = Math.min(lines.length, errLine + 2);
      for (let i = start; i < end; i++) {
        const marker = i + 1 === errLine ? " >" : "  ";
        out.push(`${marker} ${String(i + 1).padStart(3)} │ ${lines[i]}`);
      }
      out.push(`  ${SEP}`);
    }
  }

  return out.join("\n");
}

export function formatNoEdits(): string {
  return "✖ No valid edit blocks found in the command.";
}

export function formatSimulationErrors(errors: SimulationError[]): string {
  const out: string[] = [];
  const count = errors.length;
  out.push(`✖ Validation failed — ${count} error(s)`);
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
  return [
    `✖ Write error`,
    `  ${message}`,
    "",
    `  The tool attempted to write temp files and rename them atomically.`,
    `  Temp files have been cleaned up. No files were modified.`,
  ].join("\n");
}

export function formatSuccess(fileCount: number): string {
  return `✔ Successfully applied edits to ${fileCount} file(s).`;
}
