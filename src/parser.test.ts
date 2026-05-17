import { describe, it, expect } from "vitest";
import { parseCommand } from "./parser.js";

const fence = "```";
const searchHeader = "<<<<<<< SEARCH";
const matchHeader = "<<<<<<< MATCH";
const separator = "=======";
const replaceFooter = ">>>>>>> REPLACE";

describe("parseCommand", () => {
  it("parses a single SEARCH block", () => {
    const input = [
      "test.py",
      fence + "python",
      searchHeader,
      "old code",
      separator,
      "new code",
      replaceFooter,
      fence,
    ].join("\n");
    const result = parseCommand(input);
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe("test.py");
    expect(result[0].blocks).toHaveLength(1);
    expect(result[0].blocks[0].mode).toBe("SEARCH");
    expect(result[0].blocks[0].searchText).toBe("old code");
    expect(result[0].blocks[0].replaceText).toBe("new code");
  });

  it("parses a MATCH block with ... wildcard", () => {
    const input = [
      "test.py",
      fence + "python",
      matchHeader,
      "def fib(n):",
      "...",
      "    return result",
      separator,
      "def fib(n):",
      "    return n",
      replaceFooter,
      fence,
    ].join("\n");
    const result = parseCommand(input);
    expect(result).toHaveLength(1);
    expect(result[0].blocks[0].mode).toBe("MATCH");
    expect(result[0].blocks[0].searchText).toContain("...");
  });

  it("parses multiple file edits", () => {
    const block = [fence, searchHeader, "old", separator, "new", replaceFooter, fence].join("\n");
    const input = "a.ts\n" + block + "\nb.ts\n" + block;
    const result = parseCommand(input);
    expect(result).toHaveLength(2);
    expect(result[0].filePath).toBe("a.ts");
    expect(result[1].filePath).toBe("b.ts");
  });

  it("throws on missing fence after file path", () => {
    expect(() => parseCommand("test.py\nno fence here")).toThrow("Missing code fence");
  });

  it("throws on missing =======", () => {
    const input = ["test.py", fence, searchHeader, "old", replaceFooter, fence].join("\n");
    expect(() => parseCommand(input)).toThrow("Missing '======='");
  });

  it("throws on missing >>>>>>> REPLACE", () => {
    const input = ["test.py", fence, searchHeader, "old", separator, "new", fence].join("\n");
    expect(() => parseCommand(input)).toThrow("Missing '>>>>>>> REPLACE'");
  });

  it("skips blank lines before file path", () => {
    const input = [
      "",
      "",
      "test.py",
      fence,
      searchHeader,
      "old",
      separator,
      "new",
      replaceFooter,
      fence,
    ].join("\n");
    const result = parseCommand(input);
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe("test.py");
  });

  it("skips blank lines between file path and code fence", () => {
    const input = [
      "test.py",
      "",
      "  ",
      fence,
      searchHeader,
      "old",
      separator,
      "new",
      replaceFooter,
      fence,
    ].join("\n");
    const result = parseCommand(input);
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe("test.py");
  });

  it("throws on file path starting with code fence", () => {
    expect(() => parseCommand(fence + "\n")).toThrow("Expected file path, got code fence");
  });

  it("throws on unclosed code fence", () => {
    const input = ["test.py", fence, searchHeader, "old", separator, "new"].join("\n");
    expect(() => parseCommand(input)).toThrow("Unclosed code fence");
  });

  it("skips non-marker lines between blocks inside fence", () => {
    const input = [
      "test.py",
      fence,
      searchHeader,
      "a",
      separator,
      "b",
      replaceFooter,
      "some comment",
      searchHeader,
      "c",
      separator,
      "d",
      replaceFooter,
      fence,
    ].join("\n");
    const result = parseCommand(input);
    expect(result).toHaveLength(1);
    expect(result[0].blocks).toHaveLength(2);
  });

  it("skips blank lines between edit blocks", () => {
    const input = [
      "test.py",
      fence,
      searchHeader,
      "a",
      separator,
      "b",
      replaceFooter,
      "",
      searchHeader,
      "c",
      separator,
      "d",
      replaceFooter,
      fence,
    ].join("\n");
    const result = parseCommand(input);
    expect(result[0].blocks).toHaveLength(2);
  });
});
