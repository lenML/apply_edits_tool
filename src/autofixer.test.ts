import { describe, it, expect } from "vitest";
import { autofixInput } from "./autofixer.js";

const bt = "```";
const searchH = "<<<<<<< SEARCH";
const sep = "=======";
const replF = ">>>>>>> REPLACE";

describe("autofixInput", () => {
  it("leaves already-correct input unchanged", () => {
    const input = ["test.py", bt, searchH, "old", sep, "new", replF, bt].join("\n");
    expect(autofixInput(input)).toBe(input);
  });

  // Fix 1: path inside fence

  it("fixes file path inside code fence (fix 1)", () => {
    const input = [bt + "python", "path/to/file.py", searchH, "a", sep, "b", replF, bt].join("\n");
    const result = autofixInput(input);
    expect(result).toContain("path/to/file.py\n" + bt + "python");
    expect(result).toContain(searchH);
  });

  it("fixes path inside fence with blank lines before path", () => {
    const input = [bt, "", "  ", "path/to/file.py", "", searchH, "a", sep, "b", replF, bt].join("\n");
    const result = autofixInput(input);
    expect(result).toContain("path/to/file.py\n" + bt);
  });

  // Fix 2: missing fences

  it("adds missing fences around single block (fix 2)", () => {
    const input = ["test.py", searchH, "a", sep, "b", replF].join("\n");
    const result = autofixInput(input);
    expect(result).toContain("test.py");
    expect(result).toContain(bt + "\n" + searchH);
    expect(result).toContain(replF + "\n" + bt);
  });

  it("adds missing fences around multiple blocks for same file", () => {
    const input = [
      "test.py",
      searchH, "a", sep, "a'", replF,
      searchH, "b", sep, "b'", replF,
    ].join("\n");
    const result = autofixInput(input);
    expect(result).toContain(bt + "\n" + searchH);
    expect(result).toContain(replF + "\n" + bt);
    const count = (result.match(/```/g) || []).length;
    expect(count).toBe(2);
  });

  it("adds missing fences around multiple files separated by non-marker line", () => {
    const input = [
      "a.ts",
      searchH, "a", sep, "a'", replF,
      "",
      "b.ts",
      searchH, "b", sep, "b'", replF,
    ].join("\n");
    const result = autofixInput(input);
    expect(result).toContain("a.ts");
    expect(result).toContain("b.ts");
    const fences = result.match(/```/g);
    expect(fences).toHaveLength(4);
  });

  // Fix 3: missing keywords

  it("adds SEARCH keyword to bare <<<<<<< (fix 3)", () => {
    const input = ["test.py", bt, "<<<<<<<", "a", sep, "b", ">>>>>>>", bt].join("\n");
    const result = autofixInput(input);
    expect(result).toContain(searchH);
    expect(result).toContain(replF);
  });

  it("adds SEARCH keyword to <<<<<<< with extra text but no SEARCH/MATCH", () => {
    const input = ["test.py", bt, "<<<<<<< diff", "a", sep, "b", ">>>>>>> end", bt].join("\n");
    const result = autofixInput(input);
    expect(result).toContain(searchH);
    expect(result).toContain(replF);
  });

  it("does not modify already correct markers", () => {
    const result = autofixInput(["x.ts", bt, searchH, "a", sep, "b", replF, bt].join("\n"));
    expect(result).toContain(searchH);
    expect(result).toContain(replF);
  });

  // Fix 4: search indentation

  it("strips common leading whitespace from SEARCH lines (fix 4)", () => {
    const input = [
      "test.py", bt,
      searchH,
      "    def foo():",
      "        pass",
      sep,
      "def bar():",
      "    pass",
      replF, bt,
    ].join("\n");
    const result = autofixInput(input);
    const searchSection = result.split(sep)[0];
    expect(searchSection).toContain("def foo():");
    expect(searchSection).toContain("    pass");
    expect(searchSection).not.toContain("    def foo():");
  });

  it("preserves empty lines during indent stripping", () => {
    const input = [
      "test.py", bt,
      searchH,
      "    foo",
      "",
      "    bar",
      sep,
      "new", replF, bt,
    ].join("\n");
    const result = autofixInput(input);
    expect(result).toContain("foo");
    expect(result).toContain("bar");
    expect(result).toContain("\n\n");
  });

  // Combined

  it("fixes path inside fence + missing keywords together", () => {
    const input = [bt, "test.py", "<<<<<<<", "a", sep, "b", ">>>>>>>", bt].join("\n");
    const result = autofixInput(input);
    expect(result).toContain("test.py\n" + bt);
    expect(result).toContain(searchH);
    expect(result).toContain(replF);
  });

  it("fixes missing fences + missing keywords together", () => {
    const input = ["test.py", "<<<<<<<", "a", sep, "b", ">>>>>>>"].join("\n");
    const result = autofixInput(input);
    expect(result).toContain(bt + "\n" + searchH);
    expect(result).toContain(replF + "\n" + bt);
  });
});
