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
# Pipe from stdin (recommended)
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

# Or pipe from file
cat edits.txt | apply-edits --workspace .
````

## Install as Agent Skill

Send this message to your AI coding agent (any one works):

```
install it: https://github.com/lenML/apply_edits_tool/skill/SKILL.md
```

Or via CDN:

```
install it: https://cdn.jsdelivr.net/npm/@lenml/apply_edits/skill/SKILL.md
```

```
install it: https://unpkg.com/@lenml/apply_edits/skill/SKILL.md
```
