[English](README.md) | [中文](README.cn.md)

---

# @lenml/apply_edits

基于 SEARCH/REPLACE 和 MATCH/REPLACE 模式的全局批量文件编辑工具。
支持原子写入、同文件顺序模拟、编码自动检测、输入自动修复。

> **Windows PowerShell 注意：** PowerShell 5 (`powershell.exe`) 管道输出默认用 UTF-16 LE，
> 会导致编码问题。**强烈建议升级到 PowerShell 7+** (`pwsh.exe`)。
> 如果必须用 PS5，请从 UTF-8 文件管道输入，不要用 here-string。

## 安装

```bash
npm install -g @lenml/apply_edits
```

## 使用

完整文档见 [SKILL.md](skill/SKILL.md) — 命令格式、MATCH 模式、多文件操作、错误处理、API 等。

PowerShell 7+ 基本示例（单引号 here-string 避免转义问题）：

````powershell
@'
src/main.py
```python
<<<<<<< SEARCH
print("hello")
=======
print("hello world")
>>>>>>> REPLACE
```
'@ | apply-edits --workspace .
````

或 heredoc（Bash）：

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

## 安装为 Agent Skill

发送以下消息给 AI 编程助手：

```
安装 https://raw.githubusercontent.com/lenML/apply_edits_tool/refs/heads/main/skill/SKILL.md
```

或通过 CDN：

```
安装 https://cdn.jsdelivr.net/npm/@lenml/apply_edits/skill/SKILL.md
```

```
安装 https://unpkg.com/@lenml/apply_edits/skill/SKILL.md
```
