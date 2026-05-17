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
# 一步编辑多个文件
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

# 或通过管道传入
cat edits.txt | apply-edits --workspace .
````

## 安装为 Agent Skill

将以下消息发送给你的 AI 编程助手：

```
安装 https://github.com/lenML/apply_edits_tool/skill/SKILL.md
```
