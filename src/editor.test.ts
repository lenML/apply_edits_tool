import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { simulateEdits, applyEditsAtomic } from "./editor.js";
import type { EditEntry } from "./types.js";

function tmpFile(prefix = "editor-test"): string {
  return path.join(tmpdir(), `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
}

describe("simulateEdits", () => {
  it("returns error for non-existent file", async () => {
    const entries: EditEntry[] = [{ filePath: "nonexistent.txt", oldText: "x", newText: "y" }];
    const { files, errors } = await simulateEdits(entries, tmpdir());
    expect(files.size).toBe(0);
    expect(errors.length).toBe(1);
    expect(errors[0].error).toContain("Cannot read file");
  });

  it("returns error when old text not found", async () => {
    const fp = tmpFile();
    await fs.writeFile(fp, "hello world", "utf-8");
    const entries: EditEntry[] = [{ filePath: fp, oldText: "not found", newText: "x" }];
    const { files, errors } = await simulateEdits(entries, "/");
    expect(files.size).toBe(0);
    expect(errors.length).toBe(1);
    await fs.unlink(fp);
  });

  it("replaces text with direct string match", async () => {
    const fp = tmpFile();
    await fs.writeFile(fp, "hello foo", "utf-8");
    const relPath = path.basename(fp);
    const dir = path.dirname(fp);
    const entries: EditEntry[] = [
      { filePath: relPath, oldText: "hello foo", newText: "hello bar" },
    ];
    const { files, errors } = await simulateEdits(entries, dir);
    expect(errors).toHaveLength(0);
    expect(files.size).toBe(1);
    const content = files.values().next().value;
    expect(content).toBe("hello bar");
    await fs.unlink(fp);
  });

  it("replaces with trimmed line matching when direct match fails", async () => {
    const fp = tmpFile();
    await fs.writeFile(fp, "  hello foo", "utf-8");
    const relPath = path.basename(fp);
    const dir = path.dirname(fp);
    const entries: EditEntry[] = [
      { filePath: relPath, oldText: "hello foo", newText: "hello bar" },
    ];
    const { files, errors } = await simulateEdits(entries, dir);
    expect(errors).toHaveLength(0);
    expect(files.size).toBe(1);
    const content = files.values().next().value;
    expect(content).toBe("  hello bar");
    await fs.unlink(fp);
  });

  it("applies multiple edits on the same file sequentially", async () => {
    const fp = tmpFile();
    await fs.writeFile(fp, "a\nb\nc\n", "utf-8");
    const relPath = path.basename(fp);
    const dir = path.dirname(fp);
    const entries: EditEntry[] = [
      { filePath: relPath, oldText: "a", newText: "x" },
      { filePath: relPath, oldText: "c", newText: "z" },
    ];
    const { files, errors } = await simulateEdits(entries, dir);
    expect(errors).toHaveLength(0);
    const content = files.get(path.resolve(dir, relPath));
    expect(content).toBe("x\nb\nz\n");
    await fs.unlink(fp);
  });

  it("rejects path escaping workdir", async () => {
    const entries: EditEntry[] = [{ filePath: "../outside.txt", oldText: "x", newText: "y" }];
    const { files, errors } = await simulateEdits(entries, tmpdir());
    expect(files.size).toBe(0);
    expect(errors.length).toBe(1);
    expect(errors[0].error).toContain("escapes");
  });
});

describe("applyEditsAtomic", () => {
  it("writes files atomically", async () => {
    const fp = tmpFile();
    const content = new Map<string, string>([[fp, "hello atomic"]]);
    await applyEditsAtomic(content, "/");
    const data = await fs.readFile(fp, "utf-8");
    expect(data).toBe("hello atomic");
    await fs.unlink(fp);
  });
});
