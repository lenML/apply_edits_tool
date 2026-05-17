import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { readFileAutoEncoding, writeFileUtf8 } from "./encoding.js";

const tmpdir = process.cwd();

describe("readFileAutoEncoding", () => {
  it("reads UTF-8 without BOM", async () => {
    const fp = path.join(tmpdir, "_utf8.txt");
    await fs.writeFile(fp, "hello 世界\n", "utf-8");
    const result = await readFileAutoEncoding(fp);
    expect(result).toBe("hello 世界\n");
    await fs.unlink(fp);
  });

  it("reads UTF-8 with BOM and strips it", async () => {
    const fp = path.join(tmpdir, "_bom.txt");
    const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("你好", "utf-8")]);
    await fs.writeFile(fp, buf);
    const result = await readFileAutoEncoding(fp);
    expect(result).toBe("你好");
    await fs.unlink(fp);
  });

  it("reads UTF-16 LE with BOM", async () => {
    const fp = path.join(tmpdir, "_utf16le.txt");
    await fs.writeFile(fp, "\uFEFFhello", "utf-16le");
    const result = await readFileAutoEncoding(fp);
    expect(result).toBe("hello");
    await fs.unlink(fp);
  });

  it("reads GBK encoded file", async () => {
    const fp = path.join(tmpdir, "_gbk.txt");
    // GBK bytes for "中文"
    const buf = Buffer.from([0xd6, 0xd0, 0xce, 0xc4]);
    await fs.writeFile(fp, buf);
    const result = await readFileAutoEncoding(fp);
    expect(result).toBe("中文");
    await fs.unlink(fp);
  });

  it("returns empty string for empty file", async () => {
    const fp = path.join(tmpdir, "_empty.txt");
    await fs.writeFile(fp, "");
    const result = await readFileAutoEncoding(fp);
    expect(result).toBe("");
    await fs.unlink(fp);
  });

  it("decodes binary bytes gracefully (no throw)", async () => {
    const fp = path.join(tmpdir, "_binary.txt");
    // Bytes that are invalid UTF-8 but may decode in GBK etc.
    const buf = Buffer.from([0xff, 0xfe, 0x80, 0x00]);
    await fs.writeFile(fp, buf);
    // Should not throw regardless
    const result = await readFileAutoEncoding(fp);
    expect(typeof result).toBe("string");
    await fs.unlink(fp);
  });
});

describe("writeFileUtf8", () => {
  it("writes UTF-8 without BOM", async () => {
    const fp = path.join(tmpdir, "_write_utf8.txt");
    await writeFileUtf8(fp, "hello 世界");
    const buf = await fs.readFile(fp);
    // No BOM
    expect(buf[0]).not.toBe(0xef);
    expect(buf[1]).not.toBe(0xbb);
    expect(buf[2]).not.toBe(0xbf);
    // Content is valid UTF-8
    expect(buf.toString("utf-8")).toBe("hello 世界");
    await fs.unlink(fp);
  });
});
