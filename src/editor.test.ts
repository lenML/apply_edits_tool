import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { simulateEdits, applyEditsAtomic } from "./editor.js";
import type { FileEdit } from "./types.js";

// ── simulateEdits tests ──

describe("simulateEdits", () => {
  const workspace = process.cwd();

  it("applies a single SEARCH edit", async () => {
    const edits: FileEdit[] = [
      {
        filePath: "src/editor.ts",
        blocks: [
          {
            mode: "SEARCH",
            searchText: 'import * as fs from "node:fs/promises";',
            replaceText: "// patched",
          },
        ],
      },
    ];
    const result = await simulateEdits(edits, workspace);
    expect(result.valid).toBe(true);
    expect(result.files.size).toBe(1);
    const content = result.files.get("src/editor.ts")!;
    expect(content).toContain("// patched");
  });

  it("applies multiple blocks sequentially on the same file (second matches after first)", async () => {
    const edits: FileEdit[] = [
      {
        filePath: "dummy.txt",
        blocks: [
          { mode: "SEARCH", searchText: "line B", replaceText: "line B modified" },
          { mode: "SEARCH", searchText: "line B modified", replaceText: "line B final" },
        ],
      },
    ];

    const testFile = path.join(workspace, "dummy.txt");
    await fs.writeFile(testFile, "line A\nline B\nline C\n", "utf-8");

    const result = await simulateEdits(edits, workspace);
    expect(result.valid).toBe(true);
    const content = result.files.get("dummy.txt")!;
    expect(content).toBe("line A\nline B final\nline C\n");

    await fs.unlink(testFile);
  });

  it("fails when second block no longer matches after first edit", async () => {
    const edits: FileEdit[] = [
      {
        filePath: "dummy2.txt",
        blocks: [
          { mode: "SEARCH", searchText: "line B", replaceText: "line B changed" },
          { mode: "SEARCH", searchText: "line B", replaceText: "line B again" },
        ],
      },
    ];

    const testFile = path.join(workspace, "dummy2.txt");
    await fs.writeFile(testFile, "line A\nline B\nline C\n", "utf-8");

    const result = await simulateEdits(edits, workspace);
    expect(result.valid).toBe(false);
    expect(result.errors[0].error).toContain("after applying previous 1 block(s)");

    await fs.unlink(testFile);
  });

  it("merges blocks when same file appears multiple times", async () => {
    const edits: FileEdit[] = [
      {
        filePath: "merged_test.txt",
        blocks: [{ mode: "SEARCH", searchText: "AAA", replaceText: "aaa" }],
      },
      {
        filePath: "merged_test.txt",
        blocks: [{ mode: "SEARCH", searchText: "BBB", replaceText: "bbb" }],
      },
    ];

    const testFile = path.join(workspace, "merged_test.txt");
    await fs.writeFile(testFile, "AAA\nBBB\n", "utf-8");

    const result = await simulateEdits(edits, workspace);
    expect(result.valid).toBe(true);
    expect(result.files.size).toBe(1);
    expect(result.files.get("merged_test.txt")).toBe("aaa\nbbb\n");

    await fs.unlink(testFile);
  });

  it("handles multiple files", async () => {
    const edits: FileEdit[] = [
      {
        filePath: "file_a.txt",
        blocks: [{ mode: "SEARCH", searchText: "AAA", replaceText: "aaa" }],
      },
      {
        filePath: "file_b.txt",
        blocks: [{ mode: "SEARCH", searchText: "BBB", replaceText: "bbb" }],
      },
    ];

    await fs.writeFile(path.join(workspace, "file_a.txt"), "AAA\n", "utf-8");
    await fs.writeFile(path.join(workspace, "file_b.txt"), "BBB\n", "utf-8");

    const result = await simulateEdits(edits, workspace);
    expect(result.valid).toBe(true);
    expect(result.files.size).toBe(2);
    expect(result.files.get("file_a.txt")).toBe("aaa\n");
    expect(result.files.get("file_b.txt")).toBe("bbb\n");

    await fs.unlink(path.join(workspace, "file_a.txt"));
    await fs.unlink(path.join(workspace, "file_b.txt"));
  });

  it("rejects path escaping workspace", async () => {
    const edits: FileEdit[] = [
      {
        filePath: "../escape.txt",
        blocks: [{ mode: "SEARCH", searchText: "x", replaceText: "y" }],
      },
    ];
    const result = await simulateEdits(edits, workspace);
    expect(result.valid).toBe(false);
    expect(result.errors[0].error).toContain("escapes workspace");
  });

  it("reports file read errors", async () => {
    const edits: FileEdit[] = [
      {
        filePath: "nonexistent_file_xyz.txt",
        blocks: [{ mode: "SEARCH", searchText: "x", replaceText: "y" }],
      },
    ];
    const result = await simulateEdits(edits, workspace);
    expect(result.valid).toBe(false);
    expect(result.errors[0].error).toContain("Cannot read file");
  });

  it("rejects MATCH block with no anchors", async () => {
    const testFile = path.join(workspace, "dummy3.txt");
    await fs.writeFile(testFile, "content\n", "utf-8");

    const edits: FileEdit[] = [
      {
        filePath: "dummy3.txt",
        blocks: [{ mode: "MATCH", searchText: "...\n...", replaceText: "replacement" }],
      },
    ];
    const result = await simulateEdits(edits, workspace);
    expect(result.valid).toBe(false);

    await fs.unlink(testFile);
  });
});

// ── applyEditsAtomic tests ──

describe("applyEditsAtomic", () => {
  const workspace = process.cwd();

  it("writes content to disk atomically", async () => {
    const testFile = "atomic_test.txt";
    const fullPath = path.join(workspace, testFile);

    const contents = new Map<string, string>();
    contents.set(testFile, "hello atomic world\n");

    await applyEditsAtomic(contents, workspace);

    const written = await fs.readFile(fullPath, "utf-8");
    expect(written).toBe("hello atomic world\n");

    await fs.unlink(fullPath);
  });

  it("writes multiple files", async () => {
    const f1 = "multi_a.txt";
    const f2 = "multi_b.txt";

    const contents = new Map<string, string>();
    contents.set(f1, "file a\n");
    contents.set(f2, "file b\n");

    await applyEditsAtomic(contents, workspace);

    expect(await fs.readFile(path.join(workspace, f1), "utf-8")).toBe("file a\n");
    expect(await fs.readFile(path.join(workspace, f2), "utf-8")).toBe("file b\n");

    await fs.unlink(path.join(workspace, f1));
    await fs.unlink(path.join(workspace, f2));
  });

  it("leaves no temp files on success", async () => {
    const testFile = "notmp_test.txt";
    const fullPath = path.join(workspace, testFile);

    const contents = new Map<string, string>();
    contents.set(testFile, "no temp\n");

    await applyEditsAtomic(contents, workspace);

    const dir = await fs.readdir(workspace);
    const tmpFiles = dir.filter((f) => f.endsWith(".tmp"));
    expect(tmpFiles).toHaveLength(0);

    await fs.unlink(fullPath);
  });
});
