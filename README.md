# eLearning 助手
人机交互课程大作业

复旦大学 eLearning 助手，是一个 eLearning 平台的辅助程序，旨在解决 eLearning 平台的诸多设计不合理之处。

## 安装包下载地址
http://eh.zbyzbyzby.com

## 界面截图
![screenshot1](/screenshot1.png)
![screenshot2](/screenshot2.png)
![screenshot2](/screenshot3.png)

# XULRunner

## XULRunner 地址
http://ftp.mozilla.org/pub/xulrunner/releases/latest/runtimes/

## 使用方法
```sh
cd YOUR_PATH_TO_THIS_REPO/xul
YOUR_PATH_TO_XULRUNNER/xulrunner application.ini -no-remote
```

## 调试方法
使用 关于页面——打开调试工具——about:config 将 elearninghelper.debug 和 elearninghelper.dbgserver 设为 true。
下载安装 [Firefox 开发者版](https://www.mozilla.org/zh-CN/firefox/developer)。
按 F12 打开工具箱，点工具箱右上角“设置”图标，钩选上“高级设置”里的“启用远程调试”。
程序运行后，点“工具”菜单——“Web 开发者”——“连接”。
“连接到远程设备”界面中地址端口不用改变，直接点“连接”即可开始调试。

# PPT2PDF
用来把 PPT 转换为 PDF 的自动化脚本。
在安装了 Powerpoint 的 Windows 下：
```
cscript ppt2pdf.vbs YOUR_SRC_PPT_FILE YOUR_DEST_PDF_FILE
```
