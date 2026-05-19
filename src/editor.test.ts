import { vi, describe, it, expect, beforeEach } from "vitest";
import { vol } from "memfs";
import { simulateEdits, applyEditsAtomic } from "./editor.js";
import type { FileEdit } from "./types.js";

vi.mock("node:fs/promises", async () => {
  const memfs = await import("memfs");
  return memfs.fs.promises;
});

const workspace = process.cwd();

function initMemfs(): void {
  vol.reset();
  vol.mkdirSync(workspace, { recursive: true });
}

describe("simulateEdits", () => {
  beforeEach(initMemfs);

  it("applies a single SEARCH edit", async () => {
    vol.fromJSON({
      [workspace + "/src/editor.ts"]: 'import * as fs from "node:fs/promises";',
    });
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
    expect(result.files.get("src/editor.ts")).toContain("// patched");
  });

  it("applies multiple blocks sequentially on the same file (second matches after first)", async () => {
    vol.fromJSON({
      [workspace + "/dummy.txt"]: "line A\nline B\nline C\n",
    });
    const edits: FileEdit[] = [
      {
        filePath: "dummy.txt",
        blocks: [
          { mode: "SEARCH", searchText: "line B", replaceText: "line B modified" },
          { mode: "SEARCH", searchText: "line B modified", replaceText: "line B final" },
        ],
      },
    ];
    const result = await simulateEdits(edits, workspace);
    expect(result.valid).toBe(true);
    expect(result.files.get("dummy.txt")).toBe("line A\nline B final\nline C\n");
  });

  it("fails when second block no longer matches after first edit", async () => {
    vol.fromJSON({
      [workspace + "/dummy2.txt"]: "line A\nline B\nline C\n",
    });
    const edits: FileEdit[] = [
      {
        filePath: "dummy2.txt",
        blocks: [
          { mode: "SEARCH", searchText: "line B", replaceText: "line B changed" },
          { mode: "SEARCH", searchText: "line B", replaceText: "line B again" },
        ],
      },
    ];
    const result = await simulateEdits(edits, workspace);
    expect(result.valid).toBe(false);
    expect(result.errors[0].error).toContain("after applying previous 1 block(s)");
  });

  it("merges blocks when same file appears multiple times", async () => {
    vol.fromJSON({
      [workspace + "/merged_test.txt"]: "AAA\nBBB\n",
    });
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
    const result = await simulateEdits(edits, workspace);
    expect(result.valid).toBe(true);
    expect(result.files.size).toBe(1);
    expect(result.files.get("merged_test.txt")).toBe("aaa\nbbb\n");
  });

  it("handles multiple files", async () => {
    vol.fromJSON({
      [workspace + "/file_a.txt"]: "AAA\n",
      [workspace + "/file_b.txt"]: "BBB\n",
    });
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
    const result = await simulateEdits(edits, workspace);
    expect(result.valid).toBe(true);
    expect(result.files.get("file_a.txt")).toBe("aaa\n");
    expect(result.files.get("file_b.txt")).toBe("bbb\n");
  });

  it("rejects path escaping workspace", async () => {
    const result = await simulateEdits(
      [
        {
          filePath: "../escape.txt",
          blocks: [{ mode: "SEARCH", searchText: "x", replaceText: "y" }],
        },
      ],
      workspace,
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0].error).toContain("escapes workspace");
  });

  it("reports file read errors", async () => {
    const result = await simulateEdits(
      [
        {
          filePath: "nonexistent_file_xyz.txt",
          blocks: [{ mode: "SEARCH", searchText: "x", replaceText: "y" }],
        },
      ],
      workspace,
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0].error).toContain("Cannot read file");
  });

  it("rejects MATCH block with no anchors", async () => {
    vol.fromJSON({ [workspace + "/dummy3.txt"]: "content\n" });
    const edits: FileEdit[] = [
      {
        filePath: "dummy3.txt",
        blocks: [{ mode: "MATCH", searchText: "...\n...", replaceText: "replacement" }],
      },
    ];
    const result = await simulateEdits(edits, workspace);
    expect(result.valid).toBe(false);
  });
});

describe("applyEditsAtomic", () => {
  beforeEach(initMemfs);

  it("writes content to disk atomically", async () => {
    const contents = new Map<string, string>();
    contents.set("atomic_test.txt", "hello atomic world\n");

    await applyEditsAtomic(contents, workspace);

    const written = vol.readFileSync(workspace + "/atomic_test.txt", "utf-8") as string;
    expect(written).toBe("hello atomic world\n");
  });

  it("writes multiple files", async () => {
    const contents = new Map<string, string>();
    contents.set("multi_a.txt", "file a\n");
    contents.set("multi_b.txt", "file b\n");

    await applyEditsAtomic(contents, workspace);

    expect(vol.readFileSync(workspace + "/multi_a.txt", "utf-8")).toBe("file a\n");
    expect(vol.readFileSync(workspace + "/multi_b.txt", "utf-8")).toBe("file b\n");
  });

  it("leaves no temp files on success", async () => {
    const contents = new Map<string, string>();
    contents.set("notmp_test.txt", "no temp\n");

    await applyEditsAtomic(contents, workspace);

    const allFiles = Object.keys(vol.toJSON());
    const tmpFiles = allFiles.filter((f) => f.endsWith(".tmp"));
    expect(tmpFiles).toHaveLength(0);
  });
});
