import { describe, it, expect } from "vitest";
import { HDR_SEARCH, HDR_MATCH, MARKER_SEPARATOR, HDR_REPLACE, FENCE } from "./symbols.js";
import { parseCommand } from "./parser.js";

const fence = FENCE;
const searchHeader = HDR_SEARCH;
const matchHeader = HDR_MATCH;
const separator = MARKER_SEPARATOR;
const replaceFooter = HDR_REPLACE;

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

  it("parse with 4-backtick fence", () => {
    const cmd =
      "README.md\n" +
      "````markdown\n" +
      "<<<<<<< SEARCH\n" +
      "old\n" +
      "=======\n" +
      "new\n" +
      ">>>>>>> REPLACE\n" +
      "````\n";
    const result = parseCommand(cmd);
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe("README.md");
    expect(result[0].blocks).toHaveLength(1);
    expect(result[0].blocks[0].mode).toBe("SEARCH");
    expect(result[0].blocks[0].searchText).toBe("old");
    expect(result[0].blocks[0].replaceText).toBe("new");
  });

  it("parse with 4-backtick fence containing 3-backtick code inside", () => {
    const cmd =
      "README.md\n" +
      "````markdown\n" +
      "some text with\n" +
      "```python\n" +
      "code here\n" +
      "```\n" +
      "<<<<<<< SEARCH\n" +
      "old\n" +
      "=======\n" +
      "new\n" +
      ">>>>>>> REPLACE\n" +
      "and more\n" +
      "````\n";
    const result = parseCommand(cmd);
    expect(result).toHaveLength(1);
    expect(result[0].blocks).toHaveLength(1);
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

  it("skips outer wrapping fence lines instead of throwing", () => {
    const result = parseCommand(fence + "\n");
    expect(result).toHaveLength(0);
  });

  it("throws on unclosed code fence", () => {
    const input = ["test.py", fence, searchHeader, "old", separator, "new"].join("\n");
    expect(() => parseCommand(input)).toThrow("Missing code fence after file path");
  });

  it("throws on missing code fence after file path with blank lines", () => {
    expect(() => parseCommand("test.py\n  \n\n")).toThrow("Missing code fence after file path");
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

  it("handles outer backtick wrapping around entire edit", () => {
    const input = [
      fence,
      "test.py",
      fence,
      searchHeader,
      "old",
      separator,
      "new",
      replaceFooter,
      fence,
      fence,
    ].join("\n");
    const result = parseCommand(input);
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe("test.py");
    expect(result[0].blocks).toHaveLength(1);
  });

  it("handles multiple levels of outer fence wrapping", () => {
    const input = [
      fence,
      fence,
      "test.py",
      fence,
      searchHeader,
      "old",
      separator,
      "new",
      replaceFooter,
      fence,
      fence,
      fence,
    ].join("\n");
    const result = parseCommand(input);
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe("test.py");
    expect(result[0].blocks).toHaveLength(1);
  });
});
