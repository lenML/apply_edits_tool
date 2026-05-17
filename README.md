[English](README.md) | [中文](README.cn.md)

---

# @lenml/apply_edits

Global CLI tool for batch file editing with SEARCH/REPLACE and MATCH/REPLACE patterns.
Atomic transactions, sequential same-file simulation, encoding auto-detection.

## Companion Tools

This package also ships two standalone CLI tools for encoding-safe file I/O.
Unlike raw `Get-Content` (PowerShell defaults to UTF-16 LE) or Node.js sandbox calls
(encoding guesswork, BOM issues), these tools handle encoding correctly every time:

### `read-file <path>`

Read a file with automatic encoding detection (BOM -> UTF-8 -> CJK -> latin1)
and print it as UTF-8 to stdout. Never worry about garbled output again.

````bash
read-file src/config.json
````

### `write-file <path> [content]`

Write content as UTF-8 without BOM. If content is omitted, reads from stdin,
making it pipe-friendly:

````bash
read-file source.txt | write-file dest.txt
write-file path/to/file.txt "inline content"
````

Together with `apply-edits`, these three tools give you a complete encoding-safe
file editing pipeline that works correctly on Windows, macOS, and Linux.


## Install

```bash
npm install -g @lenml/apply_edits
```

## Usage

### PowerShell

**Before piping, set encoding to UTF-8**:

```powershell
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

Then pipe the here-string directly:

````powershell
'@'
src/main.py
```python
<<<<<<< SEARCH
print("hello")
=======
print("hello world")
>>>>>>> REPLACE
```
'@ | apply-edits --workspace .'
````

### Bash / Unix

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

### Pipe from file

```bash
cat edits.txt | apply-edits --workspace .
```
## Install as Agent Skill

Send this message to your AI coding agent (any one works):

```
install it: https://raw.githubusercontent.com/lenML/apply_edits_tool/refs/heads/main/skill/SKILL.md
```

Or via CDN:

```
install it: https://cdn.jsdelivr.net/npm/@lenml/apply_edits/skill/SKILL.md
```

```
install it: https://unpkg.com/@lenml/apply_edits/skill/SKILL.md
```
