import * as fs from "node:fs/promises";
import * as path from "node:path";
import { readFileAutoEncoding, writeFileUtf8 } from "./encoding.js";
import type { EditBlock, FileEdit, SimulationResult, EditMode } from "./types.js";
import { findMatchMatch, findSearchMatch } from "./matcher.js";

// ── Phase 1: Sequential simulation in virtual buffer ──

export async function simulateEdits(
  fileEdits: FileEdit[],
  workspace: string,
): Promise<SimulationResult> {
  // Merge blocks by file, preserving input order
  const fileGroups = new Map<string, EditBlock[]>();
  const groupOrder: string[] = [];
  for (const fe of fileEdits) {
    const existing = fileGroups.get(fe.filePath);
    if (existing) {
      existing.push(...fe.blocks);
    } else {
      groupOrder.push(fe.filePath);
      fileGroups.set(fe.filePath, [...fe.blocks]);
    }
  }

  const result: SimulationResult = {
    valid: true,
    files: new Map(),
    errors: [],
  };

  for (const filePath of groupOrder) {
    const blocks = fileGroups.get(filePath)!;
    const fullPath = path.resolve(workspace, filePath);

    if (!fullPath.startsWith(workspace)) {
      result.valid = false;
      result.errors.push({ filePath, error: `File path escapes workspace: ${filePath}` });
      continue;
    }

    let content: string;
    try {
      content = await readFileAutoEncoding(fullPath);
    } catch (err: any) {
      result.valid = false;
      result.errors.push({ filePath, error: `Cannot read file: ${err.message}` });
      continue;
    }

    // Apply blocks sequentially to the virtual buffer
    let virtualContent = content;
    const totalBlocks = blocks.length;
    for (let i = 0; i < totalBlocks; i++) {
      const block = blocks[i];
      let match: { start: number; end: number } | null = null;
      try {
        match =
          block.mode === "SEARCH"
            ? findSearchMatch(virtualContent, block.searchText)
            : findMatchMatch(virtualContent, block.searchText);
      } catch (err: any) {
        result.valid = false;
        result.errors.push({
          filePath,
          error: `Block ${i + 1}/${totalBlocks}: ${err.message}`,
        });
        break;
      }

      if (!match) {
        const prefix = i === 0
          ? `${block.mode} block not found`
          : `${block.mode} block not found after applying previous ${i} block(s)`;
        result.valid = false;
        result.errors.push({
          filePath,
          error: `Block ${i + 1}/${totalBlocks}: ${prefix}`,
          blockIndex: i + 1,
          totalBlocks,
          searchText: block.searchText,
          replaceText: block.replaceText,
          currentContent: virtualContent,
        });
        break;
      }

      // Record match info for feedback
      const firstSearchLine = block.searchText.split("\n").find((l) => l.trim().length > 0);
      if (firstSearchLine) {
        if (!result.matches) result.matches = [];
        result.matches.push({ filePath, matchedLine: firstSearchLine.trim() });
      }

      virtualContent =
        virtualContent.slice(0, match.start) + block.replaceText + virtualContent.slice(match.end);
    }

    // Only store result if all blocks succeeded
    if (result.valid) {
      result.files.set(filePath, virtualContent);
    }
  }

  return result;
}

// ── Helpers for atomic write ──

function randomSuffix(): string {
  return Date.now().toString(36) + "." + Math.random().toString(36).slice(2, 8);
}

async function writeWithRetry(filePath: string, content: string, maxRetries = 3): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await writeFileUtf8(filePath, content);
      return;
    } catch (err) {
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }
}

// ── Phase 2: Atomic write via temp file + rename ──

export async function applyEditsAtomic(
  fileContents: Map<string, string>,
  workspace: string,
): Promise<void> {
  interface TempMapping {
    tmpPath: string;
    realPath: string;
  }

  const mappings: TempMapping[] = [];

  try {
    // Phase 2a: Write all temp files (with retry)
    for (const [filePath, content] of fileContents) {
      const realPath = path.resolve(workspace, filePath);
      const tmpPath = realPath + "." + randomSuffix() + ".tmp";
      await writeWithRetry(tmpPath, content);
      mappings.push({ tmpPath, realPath });
    }

    // Phase 2b: Atomically rename temp → target for each file
    for (const { tmpPath, realPath } of mappings) {
      await fs.rename(tmpPath, realPath);
    }
  } catch (err) {
    // Rollback: clean up any leftover temp files
    for (const { tmpPath } of mappings) {
      try {
        await fs.unlink(tmpPath);
      } catch {
        /* best-effort cleanup */
      }
    }
    throw err;
  }
}
