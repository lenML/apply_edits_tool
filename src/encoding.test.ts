import { vi, describe, it, expect, beforeEach } from "vitest";
import { vol } from "memfs";
import { readFileAutoEncoding, writeFileUtf8 } from "./encoding.js";

vi.mock("node:fs/promises", async () => {
  const memfs = await import("memfs");
  return memfs.fs.promises;
});

const ws = process.cwd();

function initMemfs(): void {
  vol.reset();
  vol.mkdirSync(ws, { recursive: true });
}

describe("readFileAutoEncoding", () => {
  beforeEach(initMemfs);

  it("reads UTF-8 without BOM", async () => {
    vol.writeFileSync(ws + "/_utf8.txt", "hello 世界\n", "utf-8");
    const result = await readFileAutoEncoding(ws + "/_utf8.txt");
    expect(result).toBe("hello 世界\n");
  });

  it("reads UTF-8 with BOM and strips it", async () => {
    const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("你好", "utf-8")]);
    vol.writeFileSync(ws + "/_bom.txt", buf);
    const result = await readFileAutoEncoding(ws + "/_bom.txt");
    expect(result).toBe("你好");
  });

  it("reads UTF-16 LE with BOM", async () => {
    vol.writeFileSync(ws + "/_utf16le.txt", Buffer.from("\uFEFFhello", "utf-16le"));
    const result = await readFileAutoEncoding(ws + "/_utf16le.txt");
    expect(result).toBe("hello");
  });

  it("reads GBK encoded file", async () => {
    vol.writeFileSync(ws + "/_gbk.txt", Buffer.from([0xd6, 0xd0, 0xce, 0xc4]));
    const result = await readFileAutoEncoding(ws + "/_gbk.txt");
    expect(result).toBe("中文");
  });

  it("returns empty string for empty file", async () => {
    vol.writeFileSync(ws + "/_empty.txt", "");
    const result = await readFileAutoEncoding(ws + "/_empty.txt");
    expect(result).toBe("");
  });

  it("gracefully handles unknown binary", async () => {
    vol.writeFileSync(ws + "/_binary.txt", Buffer.from([0xff, 0xfe, 0x80, 0x00]));
    const result = await readFileAutoEncoding(ws + "/_binary.txt");
    expect(typeof result).toBe("string");
  });
});

describe("writeFileUtf8", () => {
  beforeEach(initMemfs);

  it("writes UTF-8 without BOM", async () => {
    await writeFileUtf8(ws + "/_write_utf8.txt", "hello 世界");
    const buf = vol.readFileSync(ws + "/_write_utf8.txt") as Buffer;
    expect(buf[0]).not.toBe(0xef);
    expect(buf[1]).not.toBe(0xbb);
    expect(buf[2]).not.toBe(0xbf);
    expect(buf.toString("utf-8")).toBe("hello 世界");
  });
});
