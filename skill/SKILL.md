---
name: apply-edits
description: Batch file editing with SEARCH/REPLACE and MATCH/REPLACE patterns, supporting atomic transactions and sequential simulation across multiple edits on the same file. Use when Codex needs to edit files via shell command using apply-edits, for multi-file batch edits that need atomic validation before writing, or when edits must be simulated sequentially on the same file.
---

# apply-edits

Global CLI tool for batch file editing with SEARCH/REPLACE and MATCH/REPLACE (with `...` wildcard) patterns.
Supports atomic transactions (all blocks validate before any file is written), sequential simulation
across multiple edits on the same file, encoding auto-detection, and autofix of malformed input.

## Usage

**Must be globally installed first:**

```bash
npm install -g @lenml/apply_edits
```

## Calling Convention

**Always use pipe or heredoc.** Never pass the edit command as a quoted argument — quotes and special characters (`<<<<<<<`, backticks) cause truncation and parsing errors.

### PowerShell

**Before piping, set encoding to UTF-8** (PowerShell 5.1 defaults to UTF-16 LE which garbles non-ASCII text):

```powershell
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

Then pipe the here-string directly:

````powershell
@'
path/to/file.ext
```markdown
<<<<<<< SEARCH
old code
=======
new code
>>>>>>> REPLACE
```
'@ | apply-edits --workspace .
````

### Bash / Unix### Bash / Unix### Bash / Unix

````bash
apply-edits --workspace . << 'EOF'
path/to/file.ext
```markdown
<<<<<<< SEARCH
new code
=======
new code
>>>>>>> REPLACE
```
EOF
````

If `<command>` is omitted entirely, reads from stdin by default.

| Argument | Description |
|----------|-------------|
| `--workspace <dir>` | Root directory for file paths (default: current directory) |
| `<command>` | The edit command string as positional argument |
| `--help` | Show help |

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

````
path/to/file.ext

```
<<<<<<< MATCH
<anchor lines with ...
for skipping>
=======
<replacement>
>>>>>>> REPLACE
```
````

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

### Single file, single edit (PowerShell)

````powershell
$edits = @'
src/main.py
```python
<<<<<<< SEARCH
print("hello")
=======
print("hello world")
>>>>>>> REPLACE
```
'@
$edits | apply-edits --workspace .
````

### Single file, single edit (Bash)

````bash
apply-edits --workspace . << 'EOF'
src/main.py
```python
<<<<<<< SEARCH
print("hello")
=======
print("hello world")
>>>>>>> REPLACE
```
EOF
````

### Multiple files, MATCH mode (Bash)

````bash
apply-edits --workspace . << 'EOF'
src/utils.py

```
<<<<<<< MATCH
def add(a, b):
...
    return result
=======
def add(a, b):
    return a + b
>>>>>>> REPLACE
```

README.md
```markdown
<<<<<<< SEARCH
old content
=======
new content
>>>>>>> REPLACE
```
EOF
````

### Multiple edits on the same file (Bash)

````bash
apply-edits --workspace . << 'EOF'
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
EOF
````

### Pipe from file

```bash
cat edits.txt | apply-edits --workspace .
```

## Companion Tools

### `read-file <path>`

Read a file with automatic encoding detection (BOM -> UTF-8 -> CJK -> latin1)
and print as UTF-8. Avoids garbled output from raw `Get-Content` or Node.js fs.

### `write-file <path> [content]`

Write content as UTF-8 without BOM. Omit content to read from stdin.
Pipe-friendly: `read-file src | write-file dest`

## Exit codes

- `0` -- all edits applied successfully
- `1` -- error occurred (parse failure, validation failure, file access error, etc.)

## Library API

| Entry | Import |
|-------|--------|
| CLI | `apply-edits` (after `npm install -g @lenml/apply_edits`) |
| CLI (read file) | `read-file <path>` |
| CLI (write file) | `write-file <path> [content]` |
| Parser | `import { parseCommand } from "@lenml/apply_edits"` |
| Editor | `import { simulateEdits, applyEditsAtomic } from "@lenml/apply_edits"` |
| Encoding | `import { readFileAutoEncoding, writeFileUtf8 } from "@lenml/apply_edits"` |
| Autofixer | `import { autofixInput } from "@lenml/apply_edits"` |
| Feedback | `import { formatSuccess, formatParseError, formatNoCommand, formatNoEdits, formatSimulationErrors, formatApplyError } from "@lenml/apply_edits"` |
