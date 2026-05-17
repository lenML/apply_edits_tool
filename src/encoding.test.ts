import { describe, it, expect } from "vitest";
import { decodeBuffer, readFileAutoEncoding, writeFileUtf8 } from "./encoding.js";
import { isUtf8 } from "node:buffer";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { tmpdir } from "node:os";

const testDir = tmpdir();

describe("encoding", () => {
  // decodeBuffer tests

  it("returns empty string for empty buffer", () => {
    expect(decodeBuffer(Buffer.alloc(0))).toBe("");
  });

  it("decodes UTF-8 BOM buffer", () => {
    const buf = Buffer.from([0xEF, 0xBB, 0xBF, 0x68, 0x65, 0x6C, 0x6C, 0x6F]);
    expect(decodeBuffer(buf)).toBe("hello");
  });

  it("decodes UTF-16 LE BOM buffer", () => {
    const buf = Buffer.from([0xFF, 0xFE, 0x68, 0x00, 0x65, 0x00, 0x6C, 0x00, 0x6C, 0x00, 0x6F, 0x00]);
    expect(decodeBuffer(buf)).toBe("hello");
  });

  it("decodes UTF-16 BE BOM buffer", () => {
    const buf = Buffer.from([0xFE, 0xFF, 0x00, 0x68, 0x00, 0x65, 0x00, 0x6C, 0x00, 0x6C, 0x00, 0x6F]);
    expect(decodeBuffer(buf)).toBe("hello");
  });

  it("handles non-UTF-8 bytes gracefully (falls through encodings)", () => {
    const buf = Buffer.from([0x80, 0x81, 0x82, 0xFF]);
    const result = decodeBuffer(buf);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(isUtf8(buf)).toBe(false);
  });

  // readFileAutoEncoding integration tests

  it("reads UTF-8 without BOM", async () => {
    const fp = path.join(testDir, "test_utf8_nobom_" + Date.now() + ".txt");
    await fs.writeFile(fp, "hello", "utf-8");
    const result = await readFileAutoEncoding(fp);
    expect(result).toBe("hello");
    await fs.unlink(fp);
  });

  it("reads UTF-8 with BOM", async () => {
    const fp = path.join(testDir, "test_utf8_bom_" + Date.now() + ".txt");
    const buf = Buffer.from([0xEF, 0xBB, 0xBF, ...Buffer.from("hello ??", "utf-8")]);
    await fs.writeFile(fp, buf);
    const result = await readFileAutoEncoding(fp);
    expect(result).toBe("hello ??");
    await fs.unlink(fp);
  });

  it("reads UTF-16 LE with BOM", async () => {
    const fp = path.join(testDir, "test_utf16le_" + Date.now() + ".txt");
    // Write UTF-16 LE with BOM manually
    const encoder = new TextEncoder();
    const encoded = Buffer.from("hello", "utf-8");
    const bom = Buffer.from([0xFF, 0xFE]);
    const utf16le = Buffer.from(encoded.toString("binary"), "binary");
    // utf16le encoding via iconv-lite style: each char -> 2 bytes
    const buf = Buffer.alloc(encoded.length * 2);
    for (let i = 0; i < encoded.length; i++) {
      buf[i * 2] = encoded[i];
      buf[i * 2 + 1] = 0;
    }
    await fs.writeFile(fp, Buffer.concat([bom, buf]));
    const result = await readFileAutoEncoding(fp);
    expect(result).toBe("hello");
    await fs.unlink(fp);
  });

  // writeFileUtf8 tests

  it("writes UTF-8 without BOM", async () => {
    const fp = path.join(testDir, "test_write_" + Date.now() + ".txt");
    await writeFileUtf8(fp, "hello ??");
    const buf = await fs.readFile(fp);
    expect(buf[0]).not.toBe(0xef);
    expect(buf[1]).not.toBe(0xbb);
    expect(buf[2]).not.toBe(0xbf);
    expect(buf.toString("utf-8")).toBe("hello ??");
    await fs.unlink(fp);
  });
});
