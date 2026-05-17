import * as fs from "node:fs/promises";
import { isUtf8 } from "node:buffer";

const encodings = [
  "gbk",
  "gb18030",
  "shift-jis",
  "euc-jp",
  "euc-kr",
  "big5",
  "windows-1252",
  "iso-8859-1",
] as const;

/**
 * Reads a file with automatic encoding detection.
 *
 * Detection order:
 *   1. BOM markers (UTF-8, UTF-16 LE/BE) — always take precedence
 *   2. UTF-8 validity check — if the buffer is valid UTF-8, use it
 *   3. Common CJK encodings via TextDecoder — pick the first that
 *      produces no replacement characters (U+FFFD)
 *   4. Fallback to latin1 (never fails, no replacement chars)
 */
export async function readFileAutoEncoding(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  if (buffer.length === 0) return "";

  // ── 1. BOM detection ──
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.toString("utf-8", 3);
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer.subarray(2));
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buffer.subarray(2));
  }

  // ── 2. UTF-8 validity ──
  if (isUtf8(buffer)) {
    return buffer.toString("utf-8");
  }

  // ── 3. Try CJK / common encodings ──
  for (const enc of encodings) {
    try {
      const decoder = new TextDecoder(enc, { fatal: false });
      const decoded = decoder.decode(buffer);
      // Avoid replacement character: assume decode is correct
      if (!decoded.includes("\uFFFD")) {
        return decoded;
      }
    } catch {
      continue;
    }
  }

  // ── 4. Fallback: latin1 (never fails) ──
  return buffer.toString("latin1");
}

/**
 * Writes a file as UTF-8 without BOM.
 */
export async function writeFileUtf8(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, "utf-8");
}
