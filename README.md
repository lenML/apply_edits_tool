[English](README.md) | [中文](README.cn.md)

---

# @lenml/apply_edits

Global CLI tool for batch file editing with SEARCH/REPLACE and MATCH/REPLACE patterns.
Atomic transactions, sequential same-file simulation, encoding auto-detection.

## Install

```bash
npm install -g @lenml/apply_edits
```

## Usage

````bash
# Edit files in one command
apply-edits --workspace . '
src/main.py
```python
<<<<<<< SEARCH
print("hello")
=======
print("hello world")
>>>>>>> REPLACE
```
'

# Or pipe from stdin
cat edits.txt | apply-edits --workspace .
````

## Install as Agent Skill

Send this message to your AI coding agent:

```
install it: https://github.com/lenML/apply_edits_tool/skill/SKILL.md
```
