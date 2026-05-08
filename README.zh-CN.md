<p align="center">
  <img src="icons/icon-128.png" width="96" height="96" alt="Tab Inbox logo" />
</p>

<h1 align="center">Tab Inbox</h1>

<p align="center">
  一个本地优先的 Chrome 标签页管理 Dashboard，把杂乱标签页整理成清爽的工作区。
</p>

<p align="center">
  <a href="README.md">English</a> · <strong>简体中文</strong>
</p>

<p align="center">
  <img alt="Chrome MV3" src="https://img.shields.io/badge/Chrome-MV3-2f7d5b" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178c6" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-111827" />
</p>

<p align="center">
  <img src="assets/tab-inbox-ai-workspace.png" alt="Tab Inbox AI 自动分类与自动化工作台功能概览" />
</p>

## Tab Inbox 是什么？

Tab Inbox 是一个本地优先的 Chrome 标签页管理扩展。它不使用狭小的 popup，而是打开一个完整 Dashboard，帮助你扫描当前打开的标签页、合并相关页面、稍后处理有价值的链接、归档上下文，并为当前任务保留一个临时工作区。

它默认在浏览器本地运行：规则匹配、分组记忆、Dashboard 状态、稍后列表和归档数据都保存在 Chrome 扩展存储中。AI 分组是可选功能，只有在用户主动配置 OpenAI 兼容接口后才会启用。

## 核心自动化

Tab Inbox 围绕三条自动化循环设计：AI 自动分类、临时工作台，以及能从用户修正中学习的本地记忆。

### AI 自动分类

当本地规则、内置分类和自定义分组不足以判断标签页归属时，Tab Inbox 可以调用用户配置的 OpenAI 兼容接口，为未知标签页生成分类建议。整个 AI 流程保持可审查、可回退：

- 只读取轻量级标签页元数据，例如标题、URL、域名、页面类型、当前分组和重复页信号。
- 返回分类、置信度、意图、简短原因，以及可选的新分类建议。
- 高置信度结果可以按用户设置的阈值自动应用。
- 中等置信度结果会进入待确认建议列表，由用户接受或忽略，不会直接影响标签组。
- AI 历史会记录 token 用量、置信度、原因和执行结果，方便回看每一次自动化判断。

### 自动化工作台

工作台用于临时聚焦当前任务，而不是创建长期分类。Tab Inbox 可以分析当前浏览器窗口，把分散页面整理成一个可执行的任务工作台：

- 识别同一任务上下文中的页面，例如同一个项目、调研主题或待处理流程。
- 区分建议加入工作台的页面、需要用户确认的页面、适合稍后处理的页面，以及可安全关闭的重复标签页。
- 一键进入工作台，同时尽量保留页面进入工作台前的原始分组上下文。
- 不会因为一次临时整理就创建可复用规则，避免短期任务污染长期自动化。

### 记忆学习

Tab Inbox 会在本地保存稳定记忆，学习你反复确认过的手动分组意图。如果你多次把同类页面移动到同一个分组，扩展会逐渐把这个信号成熟为可信的分组线索。

- 手动移动和高置信度的已接受决策可以写入本地记忆。
- 记忆会记录命中次数、置信度、示例 URL、示例标题和最近使用时间。
- 成熟记忆可以优先于泛化的内置分类，更贴合你的个人工作流。
- 可以在 Dashboard 中查看、合并和删除记忆。
- 记忆保存在 Chrome 扩展存储中，遵循本地优先的隐私模型。

## 亮点

- 点击扩展图标即可打开完整 Dashboard。
- 支持内置分类、自定义分组、用户规则和手动移动记忆。
- AI 自动分类支持置信度阈值、待确认建议、审计历史和 token 用量记录。
- 自动化工作台可以收集同一任务上下文页面，且不会创建永久规则。
- 本地稳定记忆会学习反复确认过的手动分组意图。
- 支持关闭、稍后、归档、保留、跳过、分组等 Review 操作。
- 支持临时工作区、稍后列表和焦点分组。
- 可选 AI 自动整理，使用用户自己配置的 OpenAI 兼容接口。
- Dashboard 支持中文和英文界面文案。
- 基于 Chrome Manifest V3、TypeScript 和 esbuild 构建。

## 从源码安装

环境要求：

- Node.js 20 或更新版本。
- Chrome 120 或更新版本。

```sh
npm ci
npm run build
```

加载扩展：

1. 打开 `chrome://extensions/`。
2. 开启开发者模式。
3. 点击“加载已解压的扩展程序”。
4. 选择本仓库目录。
5. 点击浏览器工具栏里的 Tab Inbox 图标。

## 开发

```sh
npm ci
npm run typecheck
npm run build
```

生成本地发布包：

```sh
npm run package:extension
```

发布包会生成到 `release/tab-inbox-extension-v<version>.zip`，其中只包含扩展运行时需要的文件。

## 隐私与权限

Tab Inbox 默认在本地工作。它会在浏览器内分析标签页标题、URL、域名和标签组状态，并把 Dashboard 数据保存在 Chrome 扩展存储中。

AI 整理默认关闭。启用后，候选标签页的标题、域名和 URL 元数据可能会发送到用户自己配置的接口。API Key 保存在本地浏览器扩展存储中，不会随分组配置导出。

扩展声明了 `tabs`、`tabGroups`、`storage`、`alarms`、`scripting` 以及普通网页的 `http://*/*` / `https://*/*` 访问权限，用于读取标签页信息、管理标签组、保存本地状态、调度防抖任务，并在普通网页上注入工作区工具。

完整说明见 [PRIVACY.md](PRIVACY.md)。

## 参与贡献

欢迎提交 issue 或 pull request。开始前请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

本项目基于 MIT 协议开源，详见 [LICENSE](LICENSE)。
