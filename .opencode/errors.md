# Known Errors & Workarounds

## 目录

- [2026-06-22] @opentui/core — Bun onResolve 无限递归
- [2026-07-07] react/jsx-dev-runtime — `--conditions=browser` 下找不到

---

## [2026-06-22] @opentui/core — Bun onResolve 无限递归

### 现象
`bun run dev` 启动后立即崩溃：
```
RangeError: Maximum call stack size exceeded
```

### 根因
`@opentui/core` 的 `runtime-plugin.ts` 中 `resolveFromParent()` 函数在 **Bun 的 `onResolve` hook 内调用了 `import.meta.resolve()`**。

Bun v1.3.14 的行为：`import.meta.resolve()` 会重新触发同一个 `onResolve` hook，而不是使用默认的 resolve 逻辑。形成递归链路：
```
onResolve → resolveFromParent → import.meta.resolve() → onResolve → resolveFromParent → ...
```

### 触发条件
- Bun v1.3.14（Bun 特有的 runtime 行为，Node.js/Deno 无此问题）
- @opentui/core v0.3.4
- 任何触发模块解析的启动场景（`bun run dev`）

### 修复方法

**修改文件：**
`node_modules/.bun/@opentui+core@0.3.4+2240c214a0f33214/node_modules/@opentui/core/index-r49y8kdq.js`

在第 203 行附近，`resolveFromParent` 函数前引入重入守卫：

```js
const _opentuiResolveGuard = /* @__PURE__ */ new Set()
function resolveFromParent(importMeta, parentURL) {
  const key = importMeta.url + "\0" + parentURL;
  if (_opentuiResolveGuard.has(key)) {
    return null;
  }
  _opentuiResolveGuard.add(key);
  try {
    // ... 原函数体不变
  } finally {
    _opentuiResolveGuard.delete(key);
  }
}
```

关键改动：
1. 在函数调用前检查 `key(importMeta.url\0parentURL)` 是否已在 guard 中
2. 若已存在则返回 `null`（让 Bun 使用 fallback 解析）
3. 不存在则加入 guard，执行完毕后移除

### 验证
```bash
bun run dev
# 应正常启动 TUI，不再报 RangeError
```

### 持久化
修复在 `node_modules` 中，后续 `bun install --force` 会丢失。需用 patch-package 持久化：

```bash
bun add -d patch-package
bunx patch-package @opentui/core
```

然后在 `package.json` 中确保 `patchedDependencies` 已包含 `@opentui/core`。

---

## [2026-07-07] react/jsx-dev-runtime — `--conditions=browser` 下找不到

### 现象
```bash
bun run dev
# Error:
# Cannot find module 'react/jsx-dev-runtime' from '.../packages/tui/src/config/index.tsx'
```

### 根因
上游升级后，`dev` 命令使用 `--conditions=browser`（`bun run --cwd packages/opencode --conditions=browser src/index.ts`）。该 flag 激活了某些依赖链中的 JSX dev runtime 解析路径，需要 `react/jsx-dev-runtime` 模块。

但 `react` 只作为 `packages/console-mail` 的间接依赖存在，在 `packages/opencode` 的模块解析中不可达。

### 修复方法
在根 `package.json` 添加 `react` 和 `react-dom` 作为 devDependencies：

```bash
bun add -d react react-dom
```

### 验证
```bash
bun run dev
# TUI 应正常启动，不再报 react/jsx-dev-runtime 错误
```

### 持久化
已通过 `devDependencies` 持久化，`bun install` 后始终可用。
