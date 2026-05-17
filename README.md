# apply-edits

一个用于代码文件批量编辑的 CLI 工具，支持 **SEARCH/REPLACE** 和 **MATCH/REPLACE**（含 `...` 通配符）模式，具备原子性事务和跨平台兼容性。特别适合配合 AI 编程助手（如 Codex）通过 bash 工具进行文件修改。

## 特性

- 🧩 **多文件、多块编辑**：一次调用可修改多个文件，每个文件内可包含多个编辑块。
- 🔍 **两种匹配模式**：
  - `SEARCH`：精确行匹配（忽略首尾空白）
  - `MATCH`：通配符匹配，支持 `...` 忽略任意行（非贪婪）
- 🛡️ **原子性事务**：所有编辑块全部验证通过后才实际写入文件；任何块失败则全部不执行。
- 📥 **灵活输入**：支持命令行参数或标准输入（stdin）传递编辑命令，方便管道集成。
- 🔒 **安全限制**：所有文件路径限制在工作区目录内，防止越权访问。
- 🧪 **易于调试**：清晰的错误定位和退出码，便于脚本判断。

## 安装

### 从源码构建

```bash
git clone <repo-url>
cd apply-edits
npm install -g typescript @types/node
tsc apply-edits.ts --outDir dist --target es2020 --module commonjs
chmod +x dist/apply-edits.js   # Linux/macOS
```

然后可将 `dist/apply-edits.js` 添加到 PATH，或通过 `node dist/apply-edits.js` 直接运行。

### 直接使用 npx/ts-node

```bash
npx ts-node apply-edits.ts --help
```

## 命令格式

编辑命令是一个多行字符串，包含一个或多个**文件块**，每个文件块的结构如下：

````
<文件路径>
```[<语言标识>]
<<<<<<< SEARCH
<要搜索的代码段>
=======
<要替换成的代码段>
>>>>>>> REPLACE
````

或者使用 `MATCH` 模式（支持 `...` 通配符）：

````
<文件路径>
```[<语言标识>]
<<<<<<< MATCH
def fib(n):
...
    return result
=======
def fib(n):
    return n
>>>>>>> REPLACE
````

### 规则说明

- **文件路径**：单独一行，可以是绝对路径或相对于工作区的相对路径。
- **代码围栏**：必须紧跟文件路径（中间无空行），以 ` ``` ` 开始（可带语言标识），以 ` ``` ` 结束。
- **编辑块**：围栏内可包含多个 `<<<<<<<` ... `>>>>>>>` 块。
  - `SEARCH` 模式：`searchText` 需与文件中的代码**按行比较且忽略首尾空白**完全匹配。
  - `MATCH` 模式：`searchText` 中的 `...` 单独成行时，表示可匹配零行或多行任意内容（非贪婪）。其余普通行作为锚点，必须按顺序出现在文件中。
- **原子性**：所有文件的所有编辑块**必须全部匹配成功**，才会执行实际写入。只要有一个块匹配失败，整个命令无任何文件被修改。

## 使用方法

### 命令行参数

```bash
apply-edits [--workspace <dir>] (--command <string> | --command - | --command readfile(0) | 无--command)
```

| 参数                                     | 说明                                                     |
| ---------------------------------------- | -------------------------------------------------------- |
| `--workspace <dir>`                      | 工作区根目录，所有文件路径基于此解析（默认：当前目录）。 |
| `--command <string>`                     | 直接提供编辑命令字符串。                                 |
| `--command -` 或 `--command readfile(0)` | 从标准输入读取命令字符串。                               |
| 无 `--command`                           | 同样从标准输入读取（兼容管道）。                         |
| `--help`                                 | 显示帮助信息。                                           |

### 退出码

- `0`：所有编辑成功应用。
- `1`：发生错误（解析失败、验证失败、文件访问错误等）。

### 示例

#### 1. 直接传递命令字符串

````bash
apply-edits --workspace /my/project --command '
src/main.py
```python
<<<<<<< SEARCH
print("hello")
=======
print("hello world")
>>>>>>> REPLACE
```'
````

#### 2. 从文件读取命令并执行

```bash
cat edits.txt | apply-edits --workspace .
```

`edits.txt` 内容示例：

````
src/utils.py
```python
<<<<<<< MATCH
def add(a, b):
...
    return result
=======
def add(a, b):
    return a + b
>>>>>>> REPLACE
````

````
README.md
```markdown
<<<<<<< SEARCH
old content
=======
new content
>>>>>>> REPLACE
````

#### 3. 使用 `--command -` 显式从 stdin 读取

```bash
apply-edits --command - < edits.txt
```

## 匹配算法细节

### SEARCH 模式

- 将目标文件和 `searchText` 都按行分割。
- 对每行**去除首尾空白**后进行比较。
- 采用滑动窗口查找第一个完全匹配的行序列。
- 匹配范围：从匹配区域首行的行首到末行的行尾（包含换行符）。

### MATCH 模式（支持 `...`）

- 将 `searchText` 按行分割，识别出所有非 `...` 的行作为锚点。
- 在目标文件中**顺序查找**每个锚点行（同样忽略首尾空白）。
- 两个锚点之间的 `...` 可以匹配零行或多行任意内容（非贪婪）。
- 匹配范围：从第一个锚点的行首到最后一个锚点的行尾（整行）。

## 错误处理

工具会执行两阶段操作：

1. **预检**：读取所有目标文件，对每个编辑块执行匹配。如果有任何失败，则输出错误详情并退出（不修改任何文件）。
2. **执行**：仅当预检全部通过后，才按从后往前的顺序对每个文件应用所有替换，并写入磁盘。

### 常见错误及输出示例

```text
Validation failed:
  src/main.py: SEARCH block not found
  docs/guide.txt: MATCH block not found
```

## 开发与测试

### 依赖

- Node.js 16+
- TypeScript（可选，可直接运行 `.ts` 文件）

### 运行测试

```bash
# 准备测试文件
echo "print('hello')" > test.py

# 编辑命令文件
cat > test_cmd.txt <<EOF
test.py
\`\`\`python
<<<<<<< SEARCH
print('hello')
=======
print('hello world')
>>>>>>> REPLACE
\`\`\`
EOF

# 执行
cat test_cmd.txt | node apply-edits.ts
```

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request。尤其欢迎以下方面的改进：

- 支持正则表达式匹配
- 添加 `--dry-run` 预览模式
- 增加 `--json` 输出结构化结果
- 优化大文件处理性能
