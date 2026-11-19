# 空间投影实验室桌面版

从本目录的 `release/` 选择对应的 ZIP。

- **macOS 13 或更新版本**：解压 macOS Universal 包，双击「空间投影实验室.app」。可把它移到「应用程序」文件夹。Apple 芯片和 Intel 芯片使用同一份包。
- **Windows 11**：在「设置 → 系统 → 系统信息」查看系统类型。Intel 或 AMD 电脑通常使用 x64，ARM 电脑使用 ARM64。对 ZIP 选择「全部解压」，进入 `ProjectionLab` 文件夹，再双击 `ProjectionLab.exe`。请保留同一个文件夹中的其他文件。

本项目采用 [MIT 许可证](../LICENSE)，允许使用、修改、分发和商业使用，分发时保留版权与许可声明。macOS 包使用临时签名，未做 Apple 公证。Windows 包未添加本应用的发行签名。下载或传输后，系统可能提示确认软件来源。

如果 macOS 阻止打开，请在「系统设置 → 隐私与安全性」中查看该程序的打开选项。Windows 包请先完整解压，保留 EXE 同目录的所有资源。

打开桌面程序无需登录或联网。自定义场景保存在当前系统用户的桌面程序数据中，网页版和其他电脑上的场景各自独立。同一台电脑重新打开或替换程序文件时，可以继续使用已保存的场景。

网页版运行方式见 [项目说明](../README.md)。

## 重新打包

打包需要 macOS、Xcode 命令行工具、Node.js 24 和 pnpm 11.25.0。运行桌面程序无需安装这些工具。打包时会下载官方 Electron 运行时，生成的 ZIP 包含所有运行所需文件。

```sh
pnpm install --frozen-lockfile
pnpm package
```

也可选择单个目标，例如 `pnpm package win-arm64`。三个目标名称为 `macos`、`win-x64`、`win-arm64`。

若已缓存官方 Electron 平台 ZIP，可将 `PROJECTION_LAB_ELECTRON_ZIPS` 指向包含原名 ZIP 的目录。将 ZIP 放入该目录前，按 Electron 同一版本发布的 `SHASUMS256.txt` 核验。

`main.cjs` 是桌面入口，`package.mjs` 从上一级项目的 `dist/` 复制网站资源。更新课程示例和投影逻辑仍在共有的网页源码里完成。

打包时会保留对应官方运行时的 Electron 和 Chromium 许可全文，并随包加入本项目许可证与课程来源说明。各文件的路径见 [第三方许可说明](../THIRD_PARTY_NOTICES.md)。成功打包后，release/SHA256SUMS.txt 会记录当前目录内 ZIP 的下载校验值。

## 已完成的验收

2026 年 11 月 19 日，首次桌面版从 ZIP 解压后的功能验收如下。

| 包 | 实际运行环境 | 结果 |
| --- | --- | --- |
| macOS Universal | macOS 26.6.2，Apple 芯片原生运行 | 通过 |
| macOS Universal 的 Intel 部分 | 同一台 Mac，通过 Rosetta 运行 x86_64 | 通过 |
| Windows ARM64 | Parallels Windows 11 ARM64，原生运行 | 通过 |
| Windows x64 | 同一 Windows 11 ARM64，通过 x64 仿真运行 | 通过 |

各环境验证了离线重载、三面展开到 90°、顶点联动、添加图形、非法坐标保留上一组有效图形、投影法与图线切换，以及退出重开后的场景恢复。macOS 的主程序及框架同时包含 x86_64 和 arm64，临时签名通过完整性校验。Windows ZIP 的可执行文件架构与包名一致。

macOS 13 和 Intel 实机未在本次环境中实测。Windows 验收使用独立临时目录，测试数据已清理，虚拟机已恢复暂停。

本次许可补全后重新生成了三份 ZIP。各包的项目许可、课程来源、第三方说明和 Electron／Chromium 原始许可均已逐字节核对，并通过 ZIP 完整性与 SHA-256 检查。包内运行代码与当前源码一致。新版 macOS 包的签名通过校验，Apple 芯片原生运行再次通过上表所述的离线、交互和保存恢复测试；其他环境的功能测试沿用上表记录。
