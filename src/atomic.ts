import * as fs from "node:fs/promises";

export function randomSuffix(): string {
  return Date.now().toString(36) + "." + Math.random().toString(36).slice(2, 8);
}

export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  const tmp = filePath + "." + randomSuffix() + ".tmp";
  try {
    await fs.writeFile(tmp, content, "utf-8");
    await fs.rename(tmp, filePath);
  } catch (err) {
    await fs.unlink(tmp).catch(() => {});
    throw err;
  }
}
