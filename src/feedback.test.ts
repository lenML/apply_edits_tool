import { describe, it, expect } from "vitest";
import {
  formatNoCommand,
  formatParseError,
  formatNoEdits,
  formatSimulationErrors,
  formatApplyError,
  formatSuccess,
} from "./feedback.js";
import type { SimulationError } from "./types.js";

describe("feedback formatters", () => {
  it("formatNoCommand", () => {
    const msg = formatNoCommand();
    expect(msg).toContain("No command provided");
  });

  it("formatParseError", () => {
    const msg = formatParseError("Expected X at line 3", "a\nb\nc\n");
    expect(msg).toContain("Parse error");
    expect(msg).toContain("Expected X at line 3");
    expect(msg).toContain("line 3");
    expect(msg).toContain("Input:");
    expect(msg).toContain("chars");
  });

  it("formatParseError without command", () => {
    const msg = formatParseError("some error");
    expect(msg).toContain("some error");
    expect(msg).not.toContain("│");
  });

  it("formatNoEdits", () => {
    expect(formatNoEdits()).toContain("No valid edit blocks");
    expect(formatNoEdits("some text")).toContain("Expected format");
  });

  it("formatSimulationErrors with basic info", () => {
    const errors: SimulationError[] = [
      {
        filePath: "test.ts",
        error: "Block 1/1: SEARCH block not found",
      },
    ];
    const msg = formatSimulationErrors(errors);
    expect(msg).toContain("test.ts");
    expect(msg).toContain("SEARCH block not found");
    expect(msg).toContain("1 error(s)");
  });

  it("formatSimulationErrors with detailed context", () => {
    const errors: SimulationError[] = [
      {
        filePath: "main.py",
        error: "Block 2/3: SEARCH block not found after applying previous 1 block(s)",
        blockIndex: 2,
        totalBlocks: 3,
        searchText: "def foo():\n    return result",
        currentContent: "def bar():\n    return 42\n",
      },
    ];
    const msg = formatSimulationErrors(errors);
    expect(msg).toContain("main.py");
    expect(msg).toContain("Block 2/3");
    expect(msg).toContain("def foo()");
    expect(msg).toContain("def bar()");
    expect(msg).toContain("Tip");
  });

  it("formatSimulationErrors with exact line match hint", () => {
    const errors: SimulationError[] = [
      {
        filePath: "x.ts",
        error: "Block 1/1: SEARCH block not found",
        blockIndex: 1,
        totalBlocks: 1,
        searchText: "console.log('hello')",
        currentContent: "console.log('HELLO')\n",
      },
    ];
    const msg = formatSimulationErrors(errors);
    expect(msg).toContain("matches the first line");
  });

  it("formatApplyError", () => {
    const msg = formatApplyError("EPERM: access denied");
    expect(msg).toContain("Write error");
    expect(msg).toContain("EPERM");
    expect(msg).toContain("No files were modified");
  });

  it("formatSuccess", () => {
    const msg = formatSuccess(3, ["a.ts", "b.ts"]);
    expect(msg).toContain("3 file(s)");
    expect(msg).toContain("Successfully");
    expect(msg).toContain("a.ts");
    expect(msg).toContain("b.ts");
  });
});
