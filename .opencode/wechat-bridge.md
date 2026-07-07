# WeChat Bridge 配置指南

## 概述

通过 CLI-WeChat-Bridge + 微信个人号，让开发者可以直接从微信与 opencode 通信。

## 前置条件

- `cli-wechat-bridge` 已全局安装 (`npm i -g cli-wechat-bridge`)
- WeChat 已扫码登录 (`wechat-setup`)
- 微信消息走 iLink 协议

## 启动

```bash
# 一键启动（推荐）
wechat-dev start

# 或手动两步：
# 终端 1：
wechat-bridge-opencode --cmd opencode-dev
# 终端 2（companion，显示 TUI）：
wechat-opencode
```

bridge 启动后，从手机微信发消息即可与 opencode 交互。

## 注意事项

- **bridge 启动慢**: server 初始化需 ~2s，已在 `server.ts` 中添加早期健康检查，bridge 无需额外 patch
- **companion 需要终端**: `wechat-opencode` 不能在后台跑，需要真实终端显示 TUI
- **companion 绑定**: companion 会将 TUI 绑定到当前终端，消息流实时可见

## 发送文件

opencode 可以通过 bridge 向微信发送文件。在回复中包含 `wechat-attachments` 代码块：

````
you can find the report at `/home/user/report.pdf`.

```wechat-attachments
file /home/user/report.pdf
```
````

支持的类型: `image`, `file`, `video`, `voice`。

## 关闭

```bash
wechat-dev stop
```

或直接 Ctrl+C 中断 bridge 进程。

## 排错

| 现象 | 根因 | 解决 |
|------|------|------|
| `fetch failed` | server 初始化慢 | 已修复（server.ts 早期健康检查）。确认你跑的是最新代码 |
| companion 闪退 | bridge 未启动或端口不对 | 先启动 bridge 再跑 companion |
| 收不到消息 | 微信 token 过期 | 重新 `wechat-setup` |
