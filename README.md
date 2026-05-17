# @lenml/apply_edits

A CLI tool for batch file editing with **SEARCH/REPLACE** and **MATCH/REPLACE** (with `...` wildcard) patterns. Supports atomic transactions and cross-platform compatibility. Designed for AI coding assistants (e.g., Codex) to edit files via shell commands.

## Features

- **Multi-file edits** -- edit multiple files and multiple blocks in one invocation
- **Two match modes**:
  - `SEARCH` -- exact line matching (ignoring leading/trailing whitespace)
  - `MATCH` -- wildcard matching with `...` for skipping arbitrary lines (non-greedy)
- **Atomic transactions** -- all blocks validate before any file is written; any block failure aborts the entire operation
- **Flexible input** -- accepts edit commands via CLI argument or stdin (pipe-friendly)
- **Path safety** -- all file paths are restricted to the workspace directory
- **Clear diagnostics** -- per-block error messages and exit codes for script integration

## Install

```bash
npm install -g @lenml/apply_edits
# or
pnpm add -g @lenml/apply_edits
```

Or run directly without installation:

```bash
npx @lenml/apply_edits --help
```

## Usage

```
apply-edits [--workspace <dir>] [<command>]
```

| Argument | Description |
|----------|-------------|
| `--workspace <dir>` | Root directory for file paths (default: current directory) |
| `<command>` | Edit command string as positional argument. If omitted, reads from stdin (pipe-friendly). |
| `--help` | Show help information |

### Exit codes

- `0` -- all edits applied successfully
- `1` -- error occurred (parse failure, validation failure, file access error, etc.)

### Command format

Each edit command includes one or more **file blocks**:

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

Or with the `MATCH` mode (supports `...` wildcard):

````
path/to/file.ext
```[lang]
<<<<<<< MATCH
def fib(n):
...
    return result
=======
def fib(n):
    return n
>>>>>>> REPLACE
```
````

### Rules

- **File path** -- single line, absolute or relative to workspace
- **Code fence** -- must immediately follow the file path (no blank lines), starts with ` ``` ` (optional language identifier), ends with ` ``` `
- **Edit blocks** -- inside the fence, one or more `<<<<<<<` ... `>>>>>>>` blocks
  - `SEARCH` mode: `searchText` must match the file content line-by-line (leading/trailing whitespace ignored)
  - `MATCH` mode: `...` on its own line matches zero or more lines (non-greedy); other lines are anchor lines that must appear in order
- **Atomicity** -- all blocks across all files must validate successfully before any writes occur

## Examples

### 1. Direct command string

```bash
apply-edits --workspace /my/project '
src/main.py
```python
<<<<<<< SEARCH
print("hello")
=======
print("hello world")
>>>>>>> REPLACE
```
'
```

### 2. Pipe from file

```bash
cat edits.txt | apply-edits --workspace .
```

### 3. Multiple files and MATCH mode

```bash
apply-edits --workspace . '
src/utils.py
```python
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
'
```

## Development

```bash
git clone <repo-url>
cd apply-edits
pnpm install

# Type-check
pnpm run typecheck

# Lint
pnpm run lint

# Test
pnpm run test

# Build
pnpm run build
```

## License

MIT

## Contributing

Pull requests and issues are welcome. Suggested improvements:

- Regex matching mode
- `--dry-run` preview mode
- `--json` structured output
- Large file optimization
