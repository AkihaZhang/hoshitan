# Hoshitan ![平台](https://img.shields.io/badge/platform-macOS%20%7C%20IINA-lightgrey) ![状态](https://img.shields.io/badge/status-beta-orange) ![许可证](https://img.shields.io/badge/license-GPLv3-blue)

[English](README.md) | **简体中文**

> [!WARNING]
> Hoshitan 目前仍是测试版。开发在 `dev` 分支进行，暂时没有稳定版，设置项和行为以后可能继续调整，也不保证旧配置迁移。

Hoshitan 是一个用于 IINA 的字幕查词和 Anki 制卡插件。它给文本字幕加上悬停查词弹窗、单词音频、截图、字幕音频切片，以及基于 AnkiConnect 的制卡导出。

本项目是 [afn478/iinatan](https://github.com/afn478/iinatan) 的实验性分支，功能路线独立，重点是接近 Hoshi Reader 的查词和制卡体验。

## 功能

- 在 IINA 中悬停文本字幕即可打开词典弹窗。
- 日语查词使用 HoshiDicts，支持 Yomitan 兼容 Term 词典和活用还原。
- 实验性支持英语、法语、德语、中文、韩语等语言的兼容 Yomitan 词典。
- 词典按 Term、Frequency、Pitch 三类分组管理，支持配置方案内的启用、禁用和优先级排序。
- 弹窗支持 Yomitan 结构化内容、词典自带 `styles.css`、可折叠词典区块、嵌套查词和自定义 CSS。
- 在线单词音频支持 Yomitan `audioSourceList` 和直接音频 URL 模板。
- 本地单词音频支持 Hoshi Reader 兼容的本地音频数据库导出，不需要额外启动本地服务器。
- 通过 AnkiConnect 导出卡片，可配置牌组、笔记类型、字段映射、标签、截图、单词音频和字幕音频。
- 字幕音频切片导出为 MP3。
- 设置、菜单、弹窗、状态信息和 Anki 操作支持 English / 简体中文界面。

## 要求

- macOS 和 [IINA](https://iina.io/)。
- `.ass`、`.srt` 或内封文本字幕轨等文本字幕。PGS 这类图片字幕不能用于查词。
- Yomitan 兼容词典。日语词典可以按 Term、Frequency、Pitch 分组导入和启用。
- 可选：[Anki](https://apps.ankiweb.net/) 和 AnkiConnect，用于直接制卡。
- 可选：FFmpeg，用于截图和字幕音频导出；如果 IINA 无法自动找到 FFmpeg，可以在设置里手动指定。

## 安装

### 从 GitHub 安装

1. 打开 IINA 的插件管理器。
2. 选择 **Install from GitHub**。
3. 输入 `AkihaZhang/hoshitan`。
4. 启用插件。
5. 打开 **Plugins -> Hoshitan -> Settings...**。
6. 导入或启用你要使用的词典。
7. 使用 **Shift+H** 开关 Hoshitan。

### Release 包

目前还没有稳定版安装包。测试包会从 `dev` 分支构建。

## 基本设置

1. 打开 **Plugins -> Hoshitan -> Settings...**。
2. 选择查词语言。
3. 从 ZIP 文件或文件夹导入 Yomitan 兼容词典。
4. 在词典面板中启用并排序 Term、Frequency、Pitch 词典。
5. 打开带文本字幕轨的视频。
6. 暂停播放，把鼠标移动到字幕文字上，等待查词弹窗出现。

在弹窗里双击文字可以嵌套查词。使用 Back / Forward 按钮、关闭按钮或 **Esc** 返回和关闭弹窗。

## 视频快捷键

| 操作 | 快捷键 |
| --- | --- |
| 播放 / 暂停 | `Space` |
| 后退 / 前进 5 秒 | `Left` / `Right` |
| 上一句 / 下一句字幕 | `[` / `]` |
| 显示 / 隐藏查词字幕 | `S` |
| 全屏切换 | `F` |
| 关闭词典弹窗 | `Esc` |
| 关闭当前视频 / 返回 | `Cmd+W` |

## Anki 制卡

需要先启动 Anki Desktop 和 AnkiConnect。

1. 打开 **Settings -> Anki**。
2. 连接 AnkiConnect。
3. 选择目标牌组和笔记类型。
4. Hoshitan 会从 AnkiConnect 读取该笔记类型的真实字段名。
5. 已知 Lapis 风格字段会自动预填；需要时可以手动调整占位符。
6. 配置截图、字幕 MP3 音频、单词音频、标签、音频 padding 和 FFmpeg。
7. 打开词典弹窗后点击 **Add to Anki**。

字段名和占位符在所有界面语言下都保持英文。常用占位符包括 `{expression}`、`{reading}`、`{sentence}`、`{definition}`、`{image}`、`{audio}`、`{sentence-audio}`、`{source}`、`{dictionary}`。

## 单词音频

打开 **Settings -> Audio**。

- 在线音频源可以是 Yomitan `audioSourceList` 端点，也可以是直接音频 URL 模板。
- 本地音频使用 Hoshi Reader 兼容的本地音频数据库导出。
- 启用本地音频后，会优先尝试本地音频，再尝试在线音频。
- 没有对应音频时，弹窗会显示缺失状态。
- Anki 字段映射到 `{audio}` 可导出单词音频，映射到 `{sentence-audio}` 可导出当前字幕音频切片。

## 开发

开发说明、构建命令、测试命令、打包和发布流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

常用命令：

```bash
npm test
npm run package
```

## 许可证

Hoshitan 使用 GNU General Public License v3.0 only。详见 [LICENSE](LICENSE)。

## 鸣谢

- [afn478/iinatan](https://github.com/afn478/iinatan)，原始 IINA 字幕查词插件。
- [Yomitan](https://github.com/yomidevs/yomitan)，弹窗词典生态和兼容词典格式。
- [HoshiDicts](https://github.com/Manhhao/hoshidicts/)，Hoshitan 使用的原生词典后端。
- [Hoshi Reader](https://github.com/Manhhao/Hoshi-Reader)，Hoshi Reader 系列工具和流程的源头项目。
- [Hoshi Reader Android](https://github.com/HuangAntimony/Hoshi-Reader-Android)，词典、Anki 和本地音频流程的参考来源。
