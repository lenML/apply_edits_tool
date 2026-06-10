---
name: apply-edits
description: Batch file editing with search/replace patterns, supporting atomic writes and encoding-safe file I/O. Use when Codex needs to edit files via shell command using apply-edits, for single or multiple search-and-replace edits with validation before writing.
---

# apply-edits

CLI tool for batch file editing with search/replace patterns.
Supports atomic writes (temp file + rename), encoding auto-detection,
and trimmed line-by-line matching for whitespace flexibility.

## Usage

**Must be globally installed first:**

```bash
npm install -g @lenml/apply_edits
```

## Calling Convention

Arguments are grouped in triples: `<file> <old-text> <new-text>`.

A single edit:

```bash
apply-edits --workdir . <file> "<old>" "<new>"
```

Multiple edits in one command:

```bash
apply-edits --workdir . <file> "<old1>" "<new1>" <file> "<old2>" "<new2>"
```

| Argument          | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| `--workdir <dir>` | Root directory for file paths (default: current directory) |
| `--help`          | Show help                                                  |
| `--version`       | Show version number                                        |

## Matching

Old text is matched in two ways:

1. **Direct string replace** — exact match, fast path
2. **Trimmed line match** — each old text line (trimmed) matched against file lines (trimmed), ignoring whitespace differences

Both old and new text can span multiple lines.

## Examples

### Single edit (PowerShell)

```powershell
apply-edits --workdir . src/main.py 'print("hello")' 'print("hello world")'
```

For multiline text, use a here-string:

```powershell
apply-edits --workdir . src/main.py @'
function foo() {
  return 1;
}
'@ @'
function foo() {
  return 2;
}
'@
```

### Single edit (Bash)

```bash
apply-edits --workdir . src/main.py 'print("hello")' 'print("hello world")'
```

### Multiple edits on the same file

```bash
apply-edits --workdir . src/app.ts \
  'function oldOne() {' 'function newOne() {' \
  src/app.ts \
  'function another() {' 'function updated() {'
```

## Companion Tools

### `read-file <path>`

Read a file with automatic encoding detection (BOM -> UTF-8 -> CJK -> latin1)
and print as UTF-8.

### `write-file <path> [content]`

Write content as UTF-8 without BOM. Omit content to read from stdin.
Supports atomic write (temp file + rename).

### `exec-js-edits [--dry-run] <file> <js-code>`

Read a file, run a JS transform, write back as UTF-8.
The JS code receives `content` (string) and must return a string.

```bash
exec-js-edits main.ts "content.replace(/foo/g, 'bar')"
exec-js-edits --dry-run data.json "JSON.stringify(JSON.parse(content), null, 2)"
```

## Exit codes

- `0` — all edits applied successfully
- `1` — error occurred (validation failure, file access error, etc.)

## Library API

| Entry            | Import                                                                     |
| ---------------- | -------------------------------------------------------------------------- |
| CLI              | `apply-edits` (after `npm install -g @lenml/apply_edits`)                  |
| CLI (read file)  | `read-file <path>`                                                         |
| CLI (write file) | `write-file <path> [content]`                                              |
| CLI (exec JS)    | `exec-js-edits [--dry-run] <file> <js-code>`                               |
| Editor           | `import { simulateEdits, applyEditsAtomic } from "@lenml/apply_edits"`     |
| Encoding         | `import { readFileAutoEncoding, writeFileUtf8 } from "@lenml/apply_edits"` |
| Atomic I/O       | `import { writeFileAtomic, randomSuffix } from "@lenml/apply_edits"`       |
