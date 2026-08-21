# dsh-software-tools

侧边栏 **🔧 软件工具** 管理器 —— 为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web 端维护一份"本机可用软件清单",勾选后注入模型系统提示,让每个会话都知道这台机器上有什么软件、怎么调用。

A sidebar **🔧 软件工具** manager for DeepSeek Harness Web: maintain a curated inventory of local software (WSL CLI tools + Windows apps via interop), check what you want the model to know, and the checked set is injected into the model's system prompt as a compact section — so every session knows what exists on this machine and how to call it.

## 它解决什么问题 / Problem

模型(如 deepseek-v4-flash)默认不知道你本机装了 IDM、ComfyUI、Obsidian、aria2…… 每次要用都得现解释路径和调用法。这个插件把"本机软件目录 + 调用法"变成**可勾选、持久化、自动注入系统提示**的一等公民,模型直接按 `usage` 字段的现成命令执行。

## 功能 / Features

| | 能力 | 说明 |
| --- | --- | --- |
| 🔧 | 侧边栏面板 | 按分类列出工具目录,勾选即生效(无需重启,下一次请求即可见) |
| 📥 | 内置 + 用户扩展合并 | 内置通用目录(aria2 / proxy / playwright / uvx / interop / zstd …);用户扩展 `catalog.json` 同 id 覆盖内置 |
| 🧠 | 系统提示注入 | 勾选的工具以紧凑段落注入每个请求的 system prompt(`systemPrompt.section`,与 persona / plan-mode 同一机制) |
| 🛠 | 内置 skill | 随插件自带 `add-software-tool` 技能:模型学会把新装软件写进用户目录,免重编译/重启 |
| 🔒 | 回环 RPC | 面板↔宿主走 loopback 钉死的 RPC channel,读本地 JSON,不触碰网络 |

## 安装 / Install

```bash
dsh plugin --profile web add dsh-software-tools
```

> 提示:本机 pnpm 供应链策略拦截 `dsh plugin add` 时,手动拷贝:把包放进 `~/.dsh/profiles/web/node_modules/`,在 `~/.dsh/profiles/web/cordis.patch.yml` 追加:

```yaml
- insert:
    - id: dsh-software-tools
      name: dsh-software-tools
      config: {}
- insert:
    - id: software-tools-skill
      name: '@deepseek-ai/dsh-skill-filesystem'
      config:
        providerName: software-tools-skill
        includeDefaultRoots: false
        customSkillDirs:
          - !!js process.getBuiltinModule('node:path').join(process.getBuiltinModule('node:path').dirname(process.getBuiltinModule('node:module').createRequire(baseUrl).resolve('dsh-software-tools/package.json')), 'skills')
```

重启 `dsh web` 并硬刷新(Ctrl+Shift+R),侧边栏出现 **🔧 软件工具** 入口。

## 配置 / Configuration

全部可选,缺省零配置:

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `settingsDir` | `$DSH_HOME/software-tools` | 状态目录,存 `selection.json`(勾选)与 `catalog.json`(用户扩展目录) |

## 数据文件 / State files

| 文件 | 作用 |
| --- | --- |
| `<settingsDir>/selection.json` | `{"ids": ["aria2", ...]}` — 当前勾选 |
| `<settingsDir>/catalog.json` | `{"tools": [条目...]}` — 用户扩展目录;同 id 覆盖内置 |

目录条目字段:`id`(`[a-z0-9-]{1,32}` 唯一)、`name`、`category`(download/proxy/media/browser/knowledge/runtime/model/misc)、`desc`(≤40 字)、`usage`(1–2 行可直接执行的调用法)。

## 添加新软件 / Adding a tool

对模型说"把 XXX 加进软件工具"即可 —— 内置的 `add-software-tool` 技能会调研该软件并写入 `catalog.json`(无需重编译、无需重启,刷新面板即见)。也可以手工编辑 `catalog.json`。

## 工作原理 / How it works

- **宿主半** (`src/index.ts`):注册 `systemPrompt.section`(`software-tools`, order 200),每次组装按当前勾选渲染;注册 loopback RPC `/ _dsh-software-tools`(`list` / `set`)。
- **浏览器半** (`src/client/`):DOM 注入侧边栏入口 + 面板(与 linxin666 系插件同一选择器模式),`tsdown` 构建为 `__ModuleLoader__` 惰性 CJS bundle(免额外依赖,React 由宿主外壳提供)。
- **技能** (`skills/add-software-tool/`):经 `dsh-skill-filesystem` 的 `customSkillDirs` 挂载,只看插件自带目录,不干扰默认技能根。

## License

[MIT](LICENSE)
