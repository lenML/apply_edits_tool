import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { randomSuffix, writeFileAtomic } from "./atomic.js";

function tmpFile(prefix = "atomic-test"): string {
  return path.join(tmpdir(), `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
}

describe("randomSuffix", () => {
  it("returns a non-empty string", () => {
    const s = randomSuffix();
    expect(s.length).toBeGreaterThan(0);
  });

  it("produces unique values on successive calls", () => {
    const a = randomSuffix();
    const b = randomSuffix();
    expect(a).not.toBe(b);
  });
});

describe("writeFileAtomic", () => {
  it("writes content to the file and cleans up temp file", async () => {
    const fp = tmpFile();
    await writeFileAtomic(fp, "hello world");
    const content = await fs.readFile(fp, "utf-8");
    expect(content).toBe("hello world");
    // No .tmp files left behind
    const dir = path.dirname(fp);
    const entries = await fs.readdir(dir);
    const leftovers = entries.filter((e) => e.includes(path.basename(fp)));
    for (const name of leftovers) {
      if (name !== path.basename(fp)) {
        expect(name).not.toMatch(/\.tmp$/);
      }
    }
    await fs.unlink(fp);
  });

  it("overwrites existing file atomically", async () => {
    const fp = tmpFile();
    await fs.writeFile(fp, "old content", "utf-8");
    await writeFileAtomic(fp, "new content");
    const content = await fs.readFile(fp, "utf-8");
    expect(content).toBe("new content");
    await fs.unlink(fp);
  });

  it("writes empty content", async () => {
    const fp = tmpFile();
    await writeFileAtomic(fp, "");
    const content = await fs.readFile(fp, "utf-8");
    expect(content).toBe("");
    await fs.unlink(fp);
  });

  it("writes multiline content", async () => {
    const fp = tmpFile();
    const text = "line1\nline2\nline3\n";
    await writeFileAtomic(fp, text);
    const content = await fs.readFile(fp, "utf-8");
    expect(content).toBe(text);
    await fs.unlink(fp);
  });

  it("throws on invalid path", async () => {
    await expect(writeFileAtomic("/nonexistent/dir/file.txt", "test")).rejects.toThrow();
  });
});
