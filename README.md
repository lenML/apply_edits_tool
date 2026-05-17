[English](README.md) | [中文](README.cn.md)

---

# @lenml/apply_edits

Batch file editing with SEARCH/REPLACE and MATCH/REPLACE patterns.
Atomic transactions, sequential same-file simulation, encoding auto-detection.

````bash
# Edit files in one command
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

# Or pipe from stdin
cat edits.txt | npx @lenml/apply_edits --workspace .
````

## Install as Agent Skill

Send this message to your AI coding agent:

```
install it: https://github.com/lenML/apply_edits_tool/skill/SKILL.md
```
