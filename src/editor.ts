import * as path from "node:path";
import { readFileAutoEncoding } from "./encoding.js";
import { writeFileAtomic } from "./atomic.js";
import type { EditEntry, EditResult } from "./types.js";

function tryReplace(content: string, oldText: string, newText: string): string | null {
  const contentLines = content.split("\n");
  const oldLines = oldText.split("\n").map((l) => l.trim());

  const direct = content.replace(oldText, newText);
  if (direct !== content) return direct;

  return tryTrimMatch(contentLines, oldLines, newText);
}

function tryTrimMatch(contentLines: string[], oldLines: string[], newText: string): string | null {
  for (let start = 0; start <= contentLines.length - oldLines.length; start++) {
    let match = true;
    for (let j = 0; j < oldLines.length; j++) {
      if (contentLines[start + j].trim() !== oldLines[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      const before = contentLines.slice(0, start).join("\n");
      const after = contentLines.slice(start + oldLines.length).join("\n");
      const sep = before.length > 0 && after.length > 0 ? "\n" : "";
      return before + sep + newText + sep + after;
    }
  }
  return null;
}

export async function simulateEdits(
  entries: EditEntry[],
  workdir: string,
): Promise<{ files: Map<string, string>; errors: EditResult[] }> {
  const files = new Map<string, string>();
  const errors: EditResult[] = [];

  for (const entry of entries) {
    const fullPath = path.resolve(workdir, entry.filePath);
    if (!fullPath.startsWith(path.resolve(workdir))) {
      errors.push({ success: false, filePath: entry.filePath, error: "Path escapes workdir" });
      continue;
    }

    let content: string;
    try {
      content = await readFileAutoEncoding(fullPath);
    } catch (err: any) {
      errors.push({
        success: false,
        filePath: entry.filePath,
        error: "Cannot read file: " + err.message,
      });
      continue;
    }

    const baseContent = files.get(fullPath) ?? content;
    const result = tryReplace(baseContent, entry.oldText, entry.newText);
    if (result === null) {
      errors.push({
        success: false,
        filePath: entry.filePath,
        error: "Old text not found in " + entry.filePath,
      });
      continue;
    }

    files.set(fullPath, result);
  }

  return { files, errors };
}

export async function applyEditsAtomic(
  fileContents: Map<string, string>,
  _workdir: string,
): Promise<void> {
  for (const [realPath, content] of fileContents) {
    await writeFileAtomic(realPath, content);
  }
}
