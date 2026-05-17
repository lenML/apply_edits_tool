#!/usr/bin/env node

import * as fs from "fs/promises";
import * as path from "path";
import { createInterface } from "readline";

// ========== 类型定义 ==========
type EditMode = "SEARCH" | "MATCH";

interface EditBlock {
  mode: EditMode;
  searchText: string; // 原始文本（包含可能的 ... 行）
  replaceText: string;
}

interface FileEdit {
  filePath: string;
  blocks: EditBlock[];
}

interface ValidatedBlock {
  block: EditBlock;
  startChar: number;
  endChar: number;
}

interface ValidationResult {
  filePath: string;
  valid: boolean;
  error?: string;
  blocks?: ValidatedBlock[]; // 仅当 valid=true 时存在
  suggestions?: any; // 辅助调试信息
}

// ========== 解析 command 字符串 ==========
function parseCommand(command: string): FileEdit[] {
  const lines = command.split(/\r?\n/);
  const fileEdits: FileEdit[] = [];
  let i = 0;

  while (i < lines.length) {
    // 跳过空行
    if (!lines[i].trim()) {
      i++;
      continue;
    }

    // 1. 文件路径行
    const filePath = lines[i].trim();
    i++;
    if (filePath.startsWith("```")) {
      throw new Error(`Expected file path, got code fence at line ${i}`);
    }

    // 跳过空行直到开围栏
    while (i < lines.length && !lines[i].trim()) i++;
    if (i >= lines.length || !lines[i].trim().startsWith("```")) {
      throw new Error(`Missing code fence after file path: ${filePath}`);
    }
    i++; // 跳过开围栏行

    // 收集围栏内容直到闭围栏
    const fenceLines: string[] = [];
    while (i < lines.length && !lines[i].trim().startsWith("```")) {
      fenceLines.push(lines[i]);
      i++;
    }
    if (i >= lines.length) {
      throw new Error(`Unclosed code fence for file: ${filePath}`);
    }
    i++; // 跳过闭围栏

    // 解析 fence 内的编辑块
    const blocks = parseEditBlocks(fenceLines, filePath);
    fileEdits.push({ filePath, blocks });
  }

  return fileEdits;
}

function parseEditBlocks(lines: string[], filePath: string): EditBlock[] {
  const blocks: EditBlock[] = [];
  let idx = 0;
  const n = lines.length;

  while (idx < n) {
    // 跳过空行
    if (!lines[idx].trim()) {
      idx++;
      continue;
    }
    const line = lines[idx].trim();
    let mode: EditMode | null = null;
    if (line === "<<<<<<< SEARCH") {
      mode = "SEARCH";
    } else if (line === "<<<<<<< MATCH") {
      mode = "MATCH";
    } else {
      // 忽略非标记行（可能是旧格式注释）
      idx++;
      continue;
    }
    idx++;

    // 读取 SEARCH/MATCH 内容直到 =======
    let searchLines: string[] = [];
    while (idx < n && lines[idx].trim() !== "=======") {
      searchLines.push(lines[idx]);
      idx++;
    }
    if (idx >= n) {
      throw new Error(`Missing '=======' in ${filePath} block`);
    }
    idx++; // 跳过 =======

    // 读取 REPLACE 内容直到 >>>>>>> REPLACE
    let replaceLines: string[] = [];
    while (idx < n && !lines[idx].trim().startsWith(">>>>>>> REPLACE")) {
      replaceLines.push(lines[idx]);
      idx++;
    }
    if (idx >= n) {
      throw new Error(`Missing '>>>>>>> REPLACE' in ${filePath} block`);
    }
    idx++; // 跳过结束标记

    const searchText = searchLines.join("\n");
    const replaceText = replaceLines.join("\n");

    blocks.push({ mode, searchText, replaceText });
  }

  return blocks;
}

// ========== 匹配算法 ==========
// 辅助：获取某行的起始字符索引（假设换行符为 \n，跨平台统一处理）
function getLineStart(content: string, lineIndex: number): number {
  const lines = content.split(/\r?\n/);
  let pos = 0;
  for (let i = 0; i < lineIndex && i < lines.length; i++) {
    pos += lines[i].length + 1; // +1 for newline (假设 \n)
  }
  return pos;
}

function getLineEnd(content: string, lineIndex: number): number {
  const lines = content.split(/\r?\n/);
  let pos = 0;
  for (let i = 0; i <= lineIndex && i < lines.length; i++) {
    pos += lines[i].length + 1;
  }
  return pos - 1; // 最后一个字符索引
}

// SEARCH 模式：规范化行比较（忽略每行首尾空白）
function findSearchMatch(
  content: string,
  search: string
): { start: number; end: number } | null {
  const contentLines = content.split(/\r?\n/);
  const searchLines = search.split(/\r?\n/);
  // 规范化：去掉每行首尾空白
  const normContent = contentLines.map((l) => l.trim());
  const normSearch = searchLines.map((l) => l.trim());
  // 滑动窗口匹配
  for (let i = 0; i <= normContent.length - normSearch.length; i++) {
    let match = true;
    for (let j = 0; j < normSearch.length; j++) {
      if (normContent[i + j] !== normSearch[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      const startChar = getLineStart(content, i);
      const endChar = getLineEnd(content, i + normSearch.length - 1);
      return { start: startChar, end: endChar };
    }
  }
  return null;
}

// MATCH 模式：支持 ... 通配符（按行，非贪婪）
function findMatchMatch(
  content: string,
  pattern: string
): { start: number; end: number } | null {
  const contentLines = content.split(/\r?\n/);
  const patternLines = pattern.split(/\r?\n/);
  // 提取锚点行（非 ... 的行）
  const anchors: { idx: number; line: string }[] = [];
  for (let i = 0; i < patternLines.length; i++) {
    const line = patternLines[i].trim();
    if (line !== "...") {
      anchors.push({ idx: i, line });
    }
  }
  if (anchors.length === 0) {
    throw new Error(
      "MATCH pattern must contain at least one non-... anchor line"
    );
  }

  // 在 content 中顺序查找每个锚点行
  const foundPositions: number[] = [];
  let currentLine = 0;
  for (const anchor of anchors) {
    let found = -1;
    for (let l = currentLine; l < contentLines.length; l++) {
      if (contentLines[l].trim() === anchor.line) {
        found = l;
        break;
      }
    }
    if (found === -1) {
      return null;
    }
    foundPositions.push(found);
    currentLine = found + 1;
  }

  // 匹配范围从第一个锚点的行首到最后一个锚点的行尾
  const firstLine = foundPositions[0];
  const lastLine = foundPositions[foundPositions.length - 1];
  const startChar = getLineStart(content, firstLine);
  const endChar = getLineEnd(content, lastLine);
  return { start: startChar, end: endChar };
}

// ========== 预检 ==========
async function validateFileEdit(
  fileEdit: FileEdit,
  workspace: string
): Promise<ValidationResult> {
  const fullPath = path.resolve(workspace, fileEdit.filePath);
  // 安全检查：确保在工作区内
  if (!fullPath.startsWith(workspace)) {
    return {
      filePath: fileEdit.filePath,
      valid: false,
      error: `File path escapes workspace: ${fileEdit.filePath}`,
    };
  }

  let content: string;
  try {
    content = await fs.readFile(fullPath, "utf-8");
  } catch (err: any) {
    return {
      filePath: fileEdit.filePath,
      valid: false,
      error: `Cannot read file: ${err.message}`,
    };
  }

  const validatedBlocks: ValidatedBlock[] = [];
  for (const block of fileEdit.blocks) {
    let match: { start: number; end: number } | null = null;
    if (block.mode === "SEARCH") {
      match = findSearchMatch(content, block.searchText);
    } else {
      match = findMatchMatch(content, block.searchText);
    }
    if (!match) {
      return {
        filePath: fileEdit.filePath,
        valid: false,
        error: `${block.mode} block not found`,
      };
    }
    validatedBlocks.push({
      block,
      startChar: match.start,
      endChar: match.end,
    });
  }
  return {
    filePath: fileEdit.filePath,
    valid: true,
    blocks: validatedBlocks,
  };
}

// ========== 执行应用（原子性：全部验证后才调用此函数）==========
async function applyEdits(
  validations: ValidationResult[],
  workspace: string
): Promise<void> {
  for (const v of validations) {
    if (!v.valid || !v.blocks) continue;
    const fullPath = path.resolve(workspace, v.filePath);
    let content = await fs.readFile(fullPath, "utf-8");
    // 按 startChar 倒序排列，避免偏移
    const sorted = [...v.blocks].sort((a, b) => b.startChar - a.startChar);
    for (const vb of sorted) {
      content =
        content.slice(0, vb.startChar) +
        vb.block.replaceText +
        content.slice(vb.endChar);
    }
    await fs.writeFile(fullPath, content, "utf-8");
  }
}

// ========== 从标准输入读取全部内容 ==========
async function readStdin(): Promise<string> {
  const rl = createInterface({ input: process.stdin });
  const chunks: string[] = [];
  for await (const chunk of rl) {
    chunks.push(chunk);
  }
  return chunks.join("\n");
}

// ========== 主 CLI ==========
async function main() {
  // 解析参数
  let command: string | null = null;
  let workspace: string | null = null;
  let explicitStdin = false;

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--command" && i + 1 < args.length) {
      const val = args[i + 1];
      if (val === "-" || val === "readfile(0)") {
        explicitStdin = true;
      } else {
        command = val;
      }
      i++;
    } else if (args[i] === "--workspace" && i + 1 < args.length) {
      workspace = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === "--help") {
      console.log(`Usage: apply-edits [--workspace <dir>] (--command <string> | --command - | --command readfile(0) | no --command reads from stdin)

--workspace <dir>   Root directory for file paths (default: current working directory)
--command           The edit command string; use "-" or "readfile(0)" to read from stdin.
                    If --command is omitted, reads from stdin as well.

The command format consists of one or more blocks:

path/to/file.py
\`\`\`python
<<<<<<< SEARCH
old code
=======
new code
>>>>>>> REPLACE
\`\`\`

For MATCH mode with wildcard:
<<<<<<< MATCH
def fib(n):
...
    return result
=======
def fib(n):
    return n
>>>>>>> REPLACE
  `);
      process.exit(0);
    }
  }

  // 获取 command 字符串
  if (explicitStdin || command === null) {
    command = await readStdin();
  }

  if (!command || command.trim() === "") {
    console.error(
      "Error: No command provided (use --command, --command -, or pipe to stdin)"
    );
    process.exit(1);
  }

  if (workspace === null) {
    workspace = process.cwd();
  }

  // 1. 解析 command
  let fileEdits: FileEdit[];
  try {
    fileEdits = parseCommand(command);
  } catch (err: any) {
    console.error(`Parse error: ${err.message}`);
    process.exit(1);
  }

  if (fileEdits.length === 0) {
    console.error("Error: No valid edit blocks found");
    process.exit(1);
  }

  // 2. 预检所有文件
  const validations: ValidationResult[] = [];
  let allValid = true;
  for (const fe of fileEdits) {
    const res = await validateFileEdit(fe, workspace);
    validations.push(res);
    if (!res.valid) {
      allValid = false;
    }
  }

  if (!allValid) {
    console.error("Validation failed:");
    for (const v of validations) {
      if (!v.valid) {
        console.error(`  ${v.filePath}: ${v.error}`);
      }
    }
    process.exit(1);
  }

  // 3. 执行应用
  try {
    await applyEdits(validations, workspace);
    console.log(`Successfully applied ${fileEdits.length} file edit(s).`);
    process.exit(0);
  } catch (err: any) {
    console.error(`Apply error: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
