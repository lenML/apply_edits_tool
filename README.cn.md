[English](README.md) | [中文](README.cn.md)

---

# @lenml/apply_edits

基于 SEARCH/REPLACE 和 MATCH/REPLACE 模式的全局批量文件编辑工具。
支持原子写入、同文件顺序模拟、编码自动检测、输入自动修复。

## 安装

```bash
npm install -g @lenml/apply_edits
```

## 使用

````bash
# 管道输入（推荐）
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

# 或从文件管道
cat edits.txt | apply-edits --workspace .
````

## 安装为 Agent Skill

发送以下任一消息给 AI 编程助手：

```
安装 https://raw.githubusercontent.com/lenML/apply_edits_tool/refs/heads/main/skill/SKILL.md
```

或者通过 CDN：

```
安装 https://cdn.jsdelivr.net/npm/@lenml/apply_edits/skill/SKILL.md
```

```
安装 https://unpkg.com/@lenml/apply_edits/skill/SKILL.md
```
