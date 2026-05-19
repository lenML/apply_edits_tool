import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { tmpdir } from "node:os";

const cli = path.resolve("dist/exec-js-edits-cli.js");

function run(...args: string[]): { stdout: string; stderr: string } {
  const cmd = `node ${cli} ${args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`;
  try {
    const stdout = execSync(cmd, { encoding: "utf-8", windowsHide: true });
    return { stdout, stderr: "" };
  } catch (e: any) {
    return {
      stdout: e.stdout?.toString() || "",
      stderr: e.stderr?.toString() || e.message,
    };
  }
}

function tmpFile(prefix = "exec-test"): string {
  return path.join(tmpdir(), `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
}

describe("exec-js-edits", () => {
  it("replaces text in a file", async () => {
    const fp = tmpFile();
    await fs.writeFile(fp, "hello foo", "utf-8");
    const { stderr } = run(fp, "return content.replace(/foo/, 'bar')");
    expect(stderr).toBe("");
    const result = await fs.readFile(fp, "utf-8");
    expect(result).toBe("hello bar");
    await fs.unlink(fp);
  });

  it("handles multiline transforms", async () => {
    const fp = tmpFile();
    await fs.writeFile(fp, "line1\nline2\nline3\n", "utf-8");
    const { stderr } = run(fp, "return content.toUpperCase()");
    expect(stderr).toBe("");
    const result = await fs.readFile(fp, "utf-8");
    expect(result).toBe("LINE1\nLINE2\nLINE3\n");
    await fs.unlink(fp);
  });

  it("--dry-run prints result without modifying file", async () => {
    const fp = tmpFile();
    await fs.writeFile(fp, "hello", "utf-8");
    const { stdout, stderr } = run("--dry-run", fp, "return content + ' world'");
    expect(stderr).toBe("");
    expect(stdout).toContain("hello world");
    const result = await fs.readFile(fp, "utf-8");
    expect(result).toBe("hello");
    await fs.unlink(fp);
  });

  it("errors when file does not exist", () => {
    const fp = path.join(tmpdir(), "nonexistent_" + Date.now());
    const { stderr } = run(fp, "return content");
    expect(stderr).toContain("error");
  });

  it("errors when code does not return a string", async () => {
    const fp = tmpFile();
    await fs.writeFile(fp, "hello", "utf-8");
    const { stderr } = run(fp, "return 42");
    expect(stderr).toContain("must return a string");
    await fs.unlink(fp);
  });

  it("reads UTF-16 LE file, transforms, writes UTF-8", async () => {
    const fp = tmpFile();
    const buf = Buffer.from([0xff, 0xfe, 0x48, 0x00, 0x69, 0x00, 0x21, 0x00]);
    await fs.writeFile(fp, buf);
    const { stderr } = run(fp, "return content.toLowerCase()");
    expect(stderr).toBe("");
    const result = await fs.readFile(fp, "utf-8");
    expect(result).toBe("hi!");
    const raw = await fs.readFile(fp);
    expect(raw[0]).not.toBe(0xef);
    await fs.unlink(fp);
  });

  it("--version prints version", () => {
    const { stdout } = run("--version");
    expect(stdout).toMatch(/@lenml\/apply_edits/);
  });

  it("--help prints usage", () => {
    const { stdout } = run("--help");
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("exec-js-edits");
  });

  it("handles empty file", async () => {
    const fp = tmpFile();
    await fs.writeFile(fp, "", "utf-8");
    const { stderr } = run(fp, "return content + 'appended'");
    expect(stderr).toBe("");
    const result = await fs.readFile(fp, "utf-8");
    expect(result).toBe("appended");
    await fs.unlink(fp);
  });

  it("handles JS code with double quotes in content", async () => {
    const fp = tmpFile();
    await fs.writeFile(fp, 'hello "world"', "utf-8");
    const { stderr } = run(fp, 'return content.replace(/"world"/, "foo")');
    expect(stderr).toBe("");
    const result = await fs.readFile(fp, "utf-8");
    expect(result).toBe("hello foo");
    await fs.unlink(fp);
  });
});
