---
name: apply-edits
description: Batch file editing with SEARCH/REPLACE and MATCH/REPLACE patterns, supporting atomic transactions and sequential simulation across multiple edits on the same file. Use when Codex needs to edit files via shell command using npx @lenml/apply_edits, for multi-file batch edits that need atomic validation before writing, or when edits must be simulated sequentially on the same file.
---

# apply-edits

A CLI tool for batch file editing with SEARCH/REPLACE and MATCH/REPLACE (with `...` wildcard) patterns.
Supports atomic transactions (all blocks validate before any file is written), sequential simulation
across multiple edits on the same file, encoding auto-detection, and autofix of malformed input.

## Usage

```bash
npx @lenml/apply_edits [--workspace <dir>] '<command>'
```

If `<command>` is omitted, reads from stdin (pipe-friendly).

| Argument            | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `--workspace <dir>` | Root directory for file paths (default: current directory) |
| `<command>`         | The edit command string as positional argument             |
| `--help`            | Show help                                                  |

## Command Format

Each command contains one or more file blocks. SEARCH mode:

````
path/to/file.ext
```[lang]
<<<<<<< SEARCH
<code to find>
=======
<replacement code>
>>>>>>> REPLACE
```
````

MATCH mode (with `...` wildcard, non-greedy):

```
path/to/file.ext
<<<<<<< MATCH
<anchor lines with ...
for skipping>
=======
<replacement>
>>>>>>> REPLACE
```

### Rules

- **File path** -- single line, absolute or relative to workspace
- **Code fence** -- immediately follows the file path (no blank lines)
- **Edit blocks** -- one or more `<<<<<<<` ... `>>>>>>>` blocks per file
- **SEARCH** -- lines matched ignoring leading/trailing whitespace
- **MATCH** -- `...` matches zero or more lines (non-greedy); other lines are anchors in order
- **Atomic** -- all blocks validate before any file is written; failure aborts the entire operation

### Error handling

- **Autofix**: Runs before parsing. Fixes: path-inside-fence, missing fences, missing keywords, indent normalization.
- **Encoding**: Reads files with auto-detection (BOM -> UTF-8 -> CJK -> latin1). Writes as UTF-8 no BOM.
- **Simulation**: All edits simulated sequentially on an in-memory virtual buffer before writing.
- **Atomic write**: Uses temp file + rename. Retries 3x with backoff. Rolls back on failure.

## Examples

### Single file, single edit

````bash
npx @lenml/apply_edits --workspace . '
src/main.py
```python
<<<<<<< SEARCH
print("hello")
=======
print("hello world")
>>>>>>> REPLACE
```
'
````

### Multiple files, MATCH mode

````bash
npx @lenml/apply_edits --workspace . '
src/utils.py
<<<<<<< MATCH
def add(a, b):
...
    return result
=======
def add(a, b):
    return a + b
>>>>>>> REPLACE

README.md
```markdown
<<<<<<< SEARCH
old content
=======
new content
>>>>>>> REPLACE
```
'
````

### Pipe from file

```bash
cat edits.txt | npx @lenml/apply_edits --workspace .
```

### Multiple edits on the same file (sequential)

````bash
npx @lenml/apply_edits --workspace . '
src/app.ts
```typescript
<<<<<<< SEARCH
function oldOne() {
=======
function newOne() {
>>>>>>> REPLACE
<<<<<<< SEARCH
function another() {
=======
function updated() {
>>>>>>> REPLACE
```
'
````

## Exit codes

- `0` -- all edits applied successfully
- `1` -- error occurred (parse failure, validation failure, file access error, etc.)

## Library API

| Entry     | Import                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| CLI       | `npx @lenml/apply_edits` or `apply-edits` (if installed)                                                                                         |
| Parser    | `import { parseCommand } from "@lenml/apply_edits"`                                                                                              |
| Editor    | `import { simulateEdits, applyEditsAtomic } from "@lenml/apply_edits"`                                                                           |
| Encoding  | `import { readFileAutoEncoding, writeFileUtf8 } from "@lenml/apply_edits"`                                                                       |
| Autofixer | `import { autofixInput } from "@lenml/apply_edits"`                                                                                              |
| Feedback  | `import { formatSuccess, formatParseError, formatNoCommand, formatNoEdits, formatSimulationErrors, formatApplyError } from "@lenml/apply_edits"` |
