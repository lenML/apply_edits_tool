[English](README.md) | [中文](README.cn.md)

---

# @lenml/apply_edits

Global CLI tool for batch file editing with SEARCH/REPLACE and MATCH/REPLACE patterns.
Atomic transactions, sequential same-file simulation, encoding auto-detection.

> **Windows PowerShell Note:** PowerShell 5 (`powershell.exe`) defaults to UTF-16 LE when piping,
> which breaks encoding. **Upgrade to PowerShell 7+** (`pwsh.exe`). On PS5, pipe from a UTF-8 file
> instead of using here-strings.

## Install

```bash
npm install -g @lenml/apply_edits
```

## Usage

See [SKILL.md](skill/SKILL.md) for full documentation — command format, MATCH mode, multiple files, error handling, and API.

> **Tip:** Code fences around blocks are optional. The autofixer adds them if missing.

Basic example (PowerShell 7+):

````powershell
apply-edits --workspace . @'
src/main.py
<<<<<<< SEARCH
print("hello")
=======
print("hello world")
>>>>>>> REPLACE
'@
````

Or via heredoc (Bash):

````bash
apply-edits --workspace . << 'EOF'
src/main.py
<<<<<<< SEARCH
print("hello")
=======
print("hello world")
>>>>>>> REPLACE
EOF
````

## Install as Agent Skill

Send this message to your AI coding agent:

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
