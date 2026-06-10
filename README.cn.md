[English](README.md) | [中文](README.cn.md)

---

# @lenml/apply_edits

基于 search/replace 模式的批量文件编辑工具。
支持原子写入、编码自动检测、trimmed line matching。

> **Windows PowerShell 注意：** PowerShell 5 (`powershell.exe`) 管道输出默认用 UTF-16 LE，
> 会导致编码问题。**强烈建议升级到 PowerShell 7+** (`pwsh.exe`)。

## 安装

```bash
npm install -g @lenml/apply_edits
```

## 使用

完整文档见 [SKILL.md](skill/SKILL.md)。

```bash
apply-edits --workdir . src/file.ts "old code" "new code"
```

## 安装为 Agent Skill

```
安装 https://raw.githubusercontent.com/lenML/apply_edits_tool/refs/heads/main/skill/SKILL.md
```

```
安装 https://cdn.jsdelivr.net/npm/@lenml/apply_edits/skill/SKILL.md
```

```
安装 https://unpkg.com/@lenml/apply_edits/skill/SKILL.md
```
