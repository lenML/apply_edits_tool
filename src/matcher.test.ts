import { describe, it, expect } from "vitest";
import { findSearchMatch, findMatchMatch } from "./matcher.js";

describe("findSearchMatch", () => {
  it("finds exact match", () => {
    const content = "line1\nline2\nline3\n";
    const result = findSearchMatch(content, "line1\nline2");
    expect(result).not.toBeNull();
    expect(result!.start).toBe(0);
  });

  it("returns null when not found", () => {
    expect(findSearchMatch("aaa\nbbb\n", "ccc")).toBeNull();
  });

  it("ignores leading/trailing whitespace", () => {
    const content = "  hello  \n  world  \n";
    const result = findSearchMatch(content, "hello\n  world  ");
    expect(result).not.toBeNull();
  });

  it("matches not starting at line 0", () => {
    const content = "skip1\nskip2\ntarget\nkeep\n";
    const result = findSearchMatch(content, "target\nkeep");
    expect(result).not.toBeNull();
    // The match range includes trailing newline of the matched block
    expect(content.slice(result!.start, result!.end + 1)).toBe("target\nkeep\n");
  });
});

describe("findMatchMatch", () => {
  it("finds pattern with ... wildcard", () => {
    const content = "def fib(n):\n    if n <= 1:\n        return n\n    return result\n";
    const pattern = "def fib(n):\n...\n    return result";
    const result = findMatchMatch(content, pattern);
    expect(result).not.toBeNull();
  });

  it("returns null when anchor not found", () => {
    expect(findMatchMatch("aaa\nbbb\n", "ccc")).toBeNull();
  });

  it("throws on pattern with no anchors", () => {
    expect(() => findMatchMatch("aaa", "...\n...")).toThrow("at least one non-... anchor line");
  });

  it("finds match with anchors not at start of file", () => {
    const content = "header\n\nSTART\ndef f():\n    pass\nEND\ntail";
    const pattern = "START\n...\ndef f():\n...\nEND";
    const result = findMatchMatch(content, pattern);
    expect(result).not.toBeNull();
  });
});
