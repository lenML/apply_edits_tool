import { describe, it, expect } from "vitest";
import {
  formatParseError,
  formatNoCommand,
  formatNoEdits,
  formatSimulationErrors,
  formatApplyError,
  formatSuccess,
  formatDryRun,
} from "./feedback.js";

describe("feedback", () => {
  it("formatNoCommand shows input size", () => {
    const msg = formatNoCommand("hello");
    expect(msg).toContain("Received");
    expect(msg).toContain("5 char(s)");
    expect(msg).toContain("hello");
  });

  it("formatNoCommand shows truncated input when too long", () => {
    const long = "a".repeat(200);
    const msg = formatNoCommand(long);
    expect(msg).toContain("200 char(s)");
  });

  it("formatParseError shows input size and lines", () => {
    const input = "test.py\n```\nold\n";
    const msg = formatParseError("some error", input);
    expect(msg).toContain("some error");
    expect(msg).toContain("Input");
  });

  it("formatNoEdits shows raw input", () => {
    const msg = formatNoEdits("some text");
    expect(msg).toContain("some text");
  });

  it("formatSimulationErrors with match hint", () => {
    const errors = [
      {
        filePath: "test.ts",
        blockIndex: 0,
        totalBlocks: 1,
        searchText: "old code",
        replaceText: "new code",
        error: "SEARCH block not found",
      },
    ];
    const msg = formatSimulationErrors(errors, "");
    expect(msg).toContain("test.ts");
    expect(msg).toContain("SEARCH block not found");
    expect(msg).toContain("old code");
    expect(msg).toContain("new code");
  });

  it("formatApplyError shows error message", () => {
    const msg = formatApplyError("write error");
    expect(msg).toContain("write error");
  });

  it("formatApplyError with replaceText shows block", () => {
    const msg = formatApplyError("apply failed", { replaceText: "replacement content" });
    expect(msg).toContain("apply failed");
    expect(msg).toContain("replacement content");
    expect(msg).toContain("Would replace with");
  });

  it("formatSuccess shows file count", () => {
    const msg = formatSuccess(3, ["a.ts", "b.ts", "c.ts"]);
    expect(msg).toContain("3 file(s)");
    expect(msg).toContain("Successfully");
    expect(msg).toContain("a.ts");
    expect(msg).toContain("b.ts");
  });

  it("formatDryRun returns correct message", () => {
    const msg = formatDryRun(3);
    expect(msg).toContain("DRY RUN");
    expect(msg).toContain("3 file(s)");
    expect(msg).toContain("validated");
  });

  it("formatSimulationErrors with rawInput shows input size", () => {
    const errors = [{
      filePath: "test.ts",
      blockIndex: 0,
      totalBlocks: 1,
      searchText: "old",
      replaceText: "new",
      error: "not found",
    }];
    const msg = formatSimulationErrors(errors, "test input");
    expect(msg).toContain("test.ts");
    expect(msg).toContain("Input:");
    expect(msg).toContain("10 chars");
  });

  it("formatSimulationErrors with currentContent gives tips", () => {
    const errors = [{
      filePath: "test.ts",
      blockIndex: 0,
      totalBlocks: 1,
      searchText: "old code",
      replaceText: "new code",
      error: "SEARCH block not found",
      currentContent: "old code\nother content",
    }];
    const msg = formatSimulationErrors(errors, "");
    expect(msg).toContain("Current file content");
    expect(msg).toContain("old code");
  });

  it("formatNoCommand shows empty input", () => {
    const msg = formatNoCommand("");
    expect(msg).toContain("empty input");
  });

  it("formatSimulationErrors with many lines triggers snippet truncation", () => {
    const manyLines = Array.from({ length: 20 }, (_, i) => "line " + i).join("\n");
    const errors = [{
      filePath: "test.ts",
      blockIndex: 0,
      totalBlocks: 1,
      searchText: "old",
      replaceText: "new",
      error: "SEARCH block not found",
      currentContent: manyLines,
    }];
    const msg = formatSimulationErrors(errors, "");
    expect(msg).toContain("(8 more lines)");
  });

  it("formatSimulationErrors with exact line match gives close match tip", () => {
    const errors = [{
      filePath: "test.ts",
      blockIndex: 0,
      totalBlocks: 1,
      searchText: "def foo():\n    pass",
      replaceText: "new code",
      error: "SEARCH block not found",
      currentContent: "def foo():\n    pass\nother content",
    }];
    const msg = formatSimulationErrors(errors, "");
    expect(msg).toContain("matches the first line");
  });

  it("formatSimulationErrors with partial match gives tip", () => {
    const errors = [{
      filePath: "test.ts",
      blockIndex: 0,
      totalBlocks: 1,
      searchText: "OLD_CODE_HERE",
      replaceText: "new",
      error: "SEARCH block not found",
      currentContent: "some old_code_here line\nanother line",
    }];
    const msg = formatSimulationErrors(errors, "");
    expect(msg).toContain("partial match");
  });

  it("formatSimulationErrors with no match gives default tip", () => {
    const errors = [{
      filePath: "test.ts",
      blockIndex: 0,
      totalBlocks: 1,
      searchText: "completely missing text",
      replaceText: "new",
      error: "SEARCH block not found",
      currentContent: "some content\nother stuff",
    }];
    const msg = formatSimulationErrors(errors, "");
    expect(msg).toContain("does not appear anywhere");
  });
});
