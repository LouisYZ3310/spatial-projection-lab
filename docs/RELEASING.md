# GitHub 发布说明

## 仓库介绍

可使用以下介绍作为仓库的 Description：

> 工程制图互动学习工具，支持三投影面展开、点线面投影实验和自定义图形，提供网页版与 macOS／Windows 离线程序。使用 Codex 辅助开发。

本项目代码采用 MIT 许可，用户可以自由使用和修改，分发时保留版权与许可声明。

## 发布源码

把项目根目录作为 GitHub 仓库的源码目录。根目录的 .gitignore 会排除 node_modules、desktop/release 和 .DS_Store。保留根目录 LICENSE、SOURCES.md、THIRD_PARTY_NOTICES.md、third_party 中的原始许可副本及 desktop/pnpm-lock.yaml。

README 中的预览图位于 docs/images/overview.png，作为源码提交后即可在 GitHub 显示。现有 Sites 网址采用私有访问，公开读者可以按 README 的本地运行步骤体验。

项目作者与版权署名使用 LouisYZ。中文首页为 README.md，英文首页为 README.en.md，二者包含语言切换链接。

Git 提交作者独立于文件中的版权署名。公开前可运行下面的命令，检查历史中的作者姓名与邮箱：

```sh
git log --format='%h %an <%ae>'
```

若需要让公开仓库从新的署名开始，可从不包含 .git 的源码副本初始化仓库，将该仓库的 user.name 设为 LouisYZ，并使用 GitHub 账号设置中提供的 noreply 邮箱作为 user.email，再创建首个提交。

## 发布桌面程序

按 desktop/README.md 重新打包后，在 GitHub 仓库的 Releases 页面建立版本并上传以下附件：

- ProjectionLab-1.0.0-macOS-universal.zip
- ProjectionLab-1.0.0-Windows-x64.zip
- ProjectionLab-1.0.0-Windows-arm64.zip
- SHA256SUMS.txt

macOS 包使用临时签名，Windows 包未添加本应用的发行证书签名。发行说明应保留这些实际状态，以及已实测的平台和尚未实测的平台。

建议的首版说明如下：

> 提供三投影面连续展开、点线面教学示例、坐标编辑与本地场景保存，并支持投影法及工程图线对比。所有桌面包可离线使用。源码使用 MIT 许可，Electron 运行时的许可随程序分发。实际测试平台见 desktop/README.md。

## 核对下载

打包脚本在 desktop/release/SHA256SUMS.txt 记录当前目录内 ZIP 的 SHA-256。每次替换程序包后重新生成校验文件，并把它与本次包一起上传。

macOS 可在解压前运行：

```sh
shasum -a 256 -c SHA256SUMS.txt
```

Windows PowerShell 可对选定的 ZIP 计算并与清单比较：

```powershell
Get-FileHash -Algorithm SHA256 .\ProjectionLab-1.0.0-Windows-x64.zip
```
