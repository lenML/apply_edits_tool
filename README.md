[English](README.md) | [中文](README.cn.md)

---

# @lenml/apply_edits

CLI tool for batch file editing with search/replace patterns.
Atomic writes (temp file + rename), encoding auto-detection, trimmed line matching.

> **Windows PowerShell Note:** PowerShell 5 (`powershell.exe`) defaults to UTF-16 LE when piping,
> which breaks encoding. **Upgrade to PowerShell 7+** (`pwsh.exe`).

## Install

```bash
npm install -g @lenml/apply_edits
```

## Usage

See [SKILL.md](skill/SKILL.md) for full documentation.

```bash
apply-edits --workdir . src/file.ts "old code" "new code"
```

## Install as Agent Skill

```
install it: https://raw.githubusercontent.com/lenML/apply_edits_tool/refs/heads/main/skill/SKILL.md
```

```
install it: https://cdn.jsdelivr.net/npm/@lenml/apply_edits/skill/SKILL.md
```

```
install it: https://unpkg.com/@lenml/apply_edits/skill/SKILL.md
```
