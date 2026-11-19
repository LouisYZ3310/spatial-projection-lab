# 第三方组件与许可

本项目自身的代码、图形和文档采用 [MIT License](LICENSE)。第三方组件继续适用其各自的许可。

| 组件 | 版本 | 用途 | 许可 |
| --- | --- | --- | --- |
| Electron | 45.3.4 | 桌面程序运行时 | MIT，[原始许可全文](third_party/electron/LICENSE) |
| Chromium、Node.js 及 Electron 随附组件 | 随 Electron 45.3.4 提供 | 浏览器引擎与运行环境 | 按运行时随附的第三方许可清单 |
| @electron/packager | 20.3.0 | 开发阶段的桌面打包工具 | BSD-2-Clause，[原始许可全文](third_party/electron-packager/LICENSE) |

Electron 的完整第三方许可清单取自与当前包对应的官方运行时 ZIP，打包时保留原文。

- macOS 的 Electron 许可位于「空间投影实验室.app/Contents/Resources/LICENSE.electron.txt」，完整清单位于同目录的「LICENSES.chromium.html」。
- Windows 的 Electron 许可位于「ProjectionLab/LICENSE」，完整清单位于同目录的「LICENSES.chromium.html」。

本项目的 MIT 许可、本文、课程来源说明和小型许可副本随每个桌面程序一起放入其资源目录。macOS 可通过「显示包内容」查看，Windows 对应「ProjectionLab/resources」。

开发工具的传递依赖由锁文件记录，许可文本随对应 npm 包提供。本仓库分发源码与锁文件，开发依赖可在安装后从各包的 LICENSE 等文件查看。桌面程序按上面的路径随附其运行时许可。

课程参考资料见 [课程来源说明](SOURCES.md)。

## 上游来源

- [Electron 45.3.4 官方发布](https://github.com/electron/electron/releases/tag/v45.3.4)
- [Electron 许可](https://github.com/electron/electron/blob/v45.3.4/LICENSE)
- [Electron Packager 20.3.0](https://github.com/electron/packager/tree/v20.3.0)
