import type { EditBlock, EditMode, FileEdit } from "./types.js";

export function parseCommand(command: string): FileEdit[] {
  const lines = command.split(/\r?\n/);
  const fileEdits: FileEdit[] = [];
  let i = 0;

  while (i < lines.length) {
    if (!lines[i].trim()) {
      i++;
      continue;
    }

    const filePath = lines[i].trim();
    i++;
    if (filePath.startsWith("`")) {
      throw new Error(`Expected file path, got code fence at line ${i}`);
    }

    while (i < lines.length && !lines[i].trim()) i++;
    if (i >= lines.length) {
      throw new Error(`Missing code fence after file path: ${filePath}`);
    }

    // Determine fence length (3+ backticks)
    const fenceLen = lines[i].trim().match(/^(`+)/);
    if (!fenceLen || fenceLen[1].length < 3) {
      throw new Error(`Missing code fence after file path: ${filePath}`);
    }
    const openFence = fenceLen[1];
    i++;

    const fenceLines: string[] = [];
    while (i < lines.length) {
      // Closing fence = same number of backticks, optionally followed by whitespace
      const close = lines[i].trim().match(new RegExp("^" + openFence + "(\\s.*)?$"));
      if (close) break;
      fenceLines.push(lines[i]);
      i++;
    }
    if (i >= lines.length) {
      throw new Error(`Missing code fence after file path: ${filePath}`);
    }
    i++;



    const blocks = parseEditBlocks(fenceLines, filePath);
    fileEdits.push({ filePath, blocks });
  }

  return fileEdits;
}

function parseEditBlocks(lines: string[], filePath: string): EditBlock[] {
  const blocks: EditBlock[] = [];
  let idx = 0;
  const n = lines.length;

  while (idx < n) {
    if (!lines[idx].trim()) {
      idx++;
      continue;
    }
    const line = lines[idx].trim();
    let mode: EditMode | null = null;
    if (line === "<<<<<<< SEARCH") {
      mode = "SEARCH";
    } else if (line === "<<<<<<< MATCH") {
      mode = "MATCH";
    } else {
      idx++;
      continue;
    }
    idx++;

    const searchLines: string[] = [];
    while (idx < n && lines[idx].trim() !== "=======") {
      searchLines.push(lines[idx]);
      idx++;
    }
    if (idx >= n) {
      throw new Error(`Missing '=======' in ${filePath} block`);
    }
    idx++;

    const replaceLines: string[] = [];
    while (idx < n && !lines[idx].trim().startsWith(">>>>>>> REPLACE")) {
      replaceLines.push(lines[idx]);
      idx++;
    }
    if (idx >= n) {
      throw new Error(`Missing '>>>>>>> REPLACE' in ${filePath} block`);
    }
    idx++;

    blocks.push({
      mode,
      searchText: searchLines.join("\n"),
      replaceText: replaceLines.join("\n"),
    });
  }

  return blocks;
}
