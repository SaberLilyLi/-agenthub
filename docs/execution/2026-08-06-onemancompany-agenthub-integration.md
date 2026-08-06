# OneManCompany × AgentHub 集成执行文档

> 供 Codex / 云端 Agent **按步骤复现或校验**本集成。  
> 参考提交：`d613cae` — `feat: embed OneManCompany under /oneManCompany with demo links`  
> 日期：2026-08-06  
> 仓库：鲸创 AgentHub（母项目）

---

## 0. 目标（完成后应满足）

1. 母项目 AgentHub 与 OneManCompany（OMC）**可同时启动**。
2. 浏览器通过母站路径访问 OMC：
   - 本地：`http://localhost:3102/oneManCompany/`
   - 线上：`https://<生产域名>/oneManCompany/`
3. OMC API / WebSocket / 静态资源均挂在前缀 `/oneManCompany` 下，**不与** Payload 的 `/api` 冲突。
4. CMS「演示地址」支持相对路径（如 `/oneManCompany`）或完整 `https://` 外链；卡片与详情页有 **「在线演示」** 按钮。
5. `agent/OneManCompany` 纳入母 Git；**排除**上游 docs/tests/.github/img；**保留**办公室 tileset 图包（上线必需）。

---

## 1. 架构约定

```text
Browser
  ├─ http://host:3102/           → AgentHub (Next.js + Payload)
  ├─ http://host:3102/api/*      → Payload / 业务 API
  └─ http://host:3102/oneManCompany/*  → Next rewrite → OMC :8001/oneManCompany/*
                                                     └─ FastAPI 托管前端静态 + /api + /ws
```

| 进程 | 默认端口 | 说明 |
|------|----------|------|
| AgentHub | `3102`（dev） | `pnpm dev` |
| OneManCompany | `8001`（本仓库 `.env` 常见值；示例为 `8000`） | `pnpm dev:omc` 或 `uv` 虚拟环境内 `onemancompany` |

环境变量：

| 变量 | 位置 | 含义 |
|------|------|------|
| `OMC_ROOT_PATH=/oneManCompany` | `agent/OneManCompany/.onemancompany/.env`（及 `.env.example`） | OMC 公共 URL 前缀 |
| `OMC_ORIGIN=http://127.0.0.1:8001` | 母项目（可选，默认即此） | Next rewrite 目标 |
| `HOST` / `PORT` | OMC `.env` | OMC 监听地址 |

**禁止**把 OMC 嵌进 Next `basePath`，也禁止只反代 HTML 页面：前端硬编码过 `/api`、`/ws`，必须整前缀挂载。

---

## 2. 前置条件

- Node.js ≥ 24.15，包管理器 **pnpm**
- Python **3.12** + **uv**
- 母项目可正常 `pnpm install` / `pnpm dev`
- Windows 注意：PowerShell 下用 `pnpm.cmd`；OMC 建议设置 `PYTHONUTF8=1`

---

## 3. 执行步骤总览

按顺序做。若仓库已含 `d613cae` 及后续同等改动，可跳到 **§7 启动与验收**；否则从 §4 起完整实施。

---

## 4. 放入 / 准备 OneManCompany 源码

### 4.1 目录位置

```text
<repo>/agent/OneManCompany/
```

若从上游克隆：

```bash
mkdir -p agent
git clone https://github.com/1mancompany/OneManCompany.git agent/OneManCompany
```

### 4.2 去掉嵌套 Git（必须）

否则母仓库只会把子目录当成 submodule/空壳：

```bash
# Windows PowerShell
Remove-Item -LiteralPath "agent\OneManCompany\.git" -Recurse -Force
```

### 4.3 母仓库 `.gitignore` 追加

```gitignore
# OneManCompany local runtime / venv
agent/**/.venv/
agent/**/.onemancompany/
agent/**/.pytest_cache/
agent/**/__pycache__/

# 上游体积大、运行 AgentHub 集成不需要（可从上游再拉）
agent/OneManCompany/tests/
agent/OneManCompany/docs/
agent/OneManCompany/mkdocs-docs/
agent/OneManCompany/mkdocs.yml
agent/OneManCompany/.github/
agent/OneManCompany/img/
```

**不要忽略** `frontend/assets/office/tilesets/`（含 `moderninteriors-win`、`Modern_Office_Revamped_v1.2`、`Modern tiles_Free`、`generated`）。  
办公室 UI 运行时会请求这些 PNG，不上线会导致地板/家具/角色丢失。

### 4.4 安装 OMC Python 依赖

```bash
cd agent/OneManCompany
uv venv --python 3.12   # 若尚无 .venv
uv pip install -e .
```

首次还需完成 OMC 初始化（生成 `.onemancompany/`）。可用上游 `start.sh` / `onemancompany-init`，或拷贝已有本地数据目录（**勿提交** `.onemancompany/`，内含密钥）。

在 `.onemancompany/.env`（及示例 `.env.example`）确保：

```env
HOST=0.0.0.0
PORT=8001
OMC_ROOT_PATH=/oneManCompany
# 另配 OPENROUTER_API_KEY / 其他 LLM Key
```

---

## 5. OMC：子路径 `/oneManCompany` 支持

### 5.1 后端（`src/onemancompany/core/config.py`）

- 增加 `normalize_root_path()`。
- `Settings` 增加字段 `omc_root_path: str = ""`（读环境变量 `OMC_ROOT_PATH`），`model_validator` 里规范化。

### 5.2 后端挂载（`src/onemancompany/main.py`）

- `load_dotenv` 之后 **重建** `Settings()`，再读 `omc_root_path`。
- `_build_app()`：原 FastAPI（router + StaticFiles），`redirect_slashes=False`。
- 若 `root_path` 非空：外层 Gateway `mount(root_path, inner)`；`/` 重定向到 `{root}/`。
- 中间件把 `Location: http://127.0.0.1:8001/...` **改成纯路径**，避免经母站代理时跳到后端源站。
- 验收直连：
  - `GET http://127.0.0.1:8001/oneManCompany/` → 200 HTML
  - `GET http://127.0.0.1:8001/oneManCompany/api/bootstrap` → 200 JSON
  - `GET http://127.0.0.1:8001/api/bootstrap` → 404（未挂前缀时不应再暴露）

### 5.3 前端路径修复

**问题**：地址栏为 `/oneManCompany`（无尾斜杠）时，相对资源 `style.css` 会解析成 `/style.css` → 母站 404，页面无样式且 WS「离线」。

**做法**：

1. `frontend/index.html` 的 `<head>` **最前面**内联脚本：
   - 若 pathname 为 `/oneManCompany`，`history.replaceState` 成 `/oneManCompany/`；
   - `document.write('<base href="/oneManCompany/">')`。
2. 新增 `frontend/omc-root.js`（在其它脚本之前引入）：
   - 检测 `__OMC_ROOT__`（默认 `/oneManCompany`）；
   - `omcUrl()`；
   - patch `fetch` 对 `/api`、`/ws`；
   - patch `img/script/link` 的 `/api` 赋值；MutationObserver 修 innerHTML 注入的绝对 `/api`。
3. `frontend/app.js` WebSocket：
   - 先连 `ws(s)://{host}{root}/ws`；
   - 失败则回退 `ws://{hostname}:8001{root}/ws`（Next rewrite 常不升级 WS）。

---

## 6. 母项目 AgentHub 改造

### 6.1 `next.config.ts`

- `const OMC_ORIGIN = process.env.OMC_ORIGIN || 'http://127.0.0.1:8001'`
- `skipTrailingSlashRedirect: true`
- `rewrites`：

```ts
{
  source: '/oneManCompany',
  destination: `${OMC_ORIGIN}/oneManCompany/`,
},
{
  source: '/oneManCompany/',
  destination: `${OMC_ORIGIN}/oneManCompany/`,
},
{
  source: '/oneManCompany/:path*',
  destination: `${OMC_ORIGIN}/oneManCompany/:path*`,
},
```

**注意**：不要用「把 `/oneManCompany` 301 到 `/oneManCompany/`」再配合错误 rewrite，易造成 **307 自环**。用 `<base>` + `replaceState` 处理无斜杠更稳。

### 6.2 `src/proxy.ts`

在鉴权逻辑最前：

```ts
if (pathname === '/oneManCompany' || pathname.startsWith('/oneManCompany/')) {
  return NextResponse.next()
}
```

避免 CSRF / 登录门控挡住 OMC。

### 6.3 并行启动脚本

- `scripts/dev-omc.mjs`：用 `agent/OneManCompany/.venv` 内 `onemancompany` 启动，注入 `OMC_ROOT_PATH`。
- `scripts/dev-all.mjs`：并行启动 OMC + `pnpm dev`。
- `package.json`：

```json
"dev:omc": "node scripts/dev-omc.mjs",
"dev:all": "node scripts/dev-all.mjs"
```

### 6.4 演示地址 + 卡片按钮

| 文件 | 改动 |
|------|------|
| `src/collections/Agents.ts` | `demoUrl` 字段增加 placeholder / description：相对路径或 https |
| `src/lib/demoUrl.ts` | **新建** `resolveDemoUrl` / `isExternalDemoUrl` |
| `src/components/agent/types.ts` | `AgentCardData` 增加 `demoUrl: string \| null` |
| `src/lib/agentQueries.ts` | `toCardData` 带上 `demoUrl` |
| `src/components/agent/AgentCard.tsx` | 有 demo 时在「使用」左侧显示「在线演示」；外链 `target=_blank` |
| `src/app/(frontend)/agents/[slug]/page.tsx` | 详情侧栏「在线演示」使用 `resolveDemoUrl` |

**CMS 填写约定**：

- 同站演示：`/oneManCompany`（本地自动变 `localhost:3102/...`，线上变生产域名）
- 外链：`https://example.com/demo`

---

## 7. 启动与验收

### 7.1 启动

```bash
# 仓库根目录
pnpm install          # 如需
pnpm dev:all          # 或分别：pnpm dev:omc 与 pnpm dev
```

生产：OMC 与 AgentHub 分进程部署；网关（Caddy/Nginx）需把 `/oneManCompany/*` 反代到 OMC，并保证 **WebSocket** 升级；或母站仍用 rewrite 且 OMC 端口可达。

### 7.2 验收清单

```bash
# 母站
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3102/

# OMC 经母站
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3102/oneManCompany/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3102/oneManCompany/style.css
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3102/oneManCompany/api/bootstrap

# OMC 直连
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8001/oneManCompany/
```

浏览器：

1. 打开 `http://localhost:3102/oneManCompany/` → 像素办公室有样式，连接状态非长期「离线」。
2. 打开 `http://localhost:3102/` → Agent 卡片；CMS 给某 Agent 填 `demoUrl=/oneManCompany` 并发布 → 出现「在线演示」，点击进入办公室。
3. 办公室人物/地板正常（tileset 已提交）。

---

## 8. Git 提交范围建议

**应提交：**

- `agent/OneManCompany/` 运行时源码、`frontend/`、`company/` 模板、tileset、`uv.lock`、`pyproject.toml`、`.env.example` 等
- 母项目：`next.config.ts`、`src/proxy.ts`、`scripts/dev-*.mjs`、`package.json`、demoUrl 相关文件、`.gitignore`

**勿提交：**

- `agent/**/.venv/`、`agent/**/.onemancompany/`（含真实 API Key）
- `tests/`、`docs/`、`mkdocs*`、`.github/`、`img/`（已 ignore）

---

## 9. 常见故障

| 现象 | 原因 | 处理 |
|------|------|------|
| 页面无 CSS、「离线」 | URL 无尾斜杠，相对资源打到 `/style.css` | 确认 `<base href>` 与 `omc-root.js`；访问 `/oneManCompany/` |
| API 打到 Payload | 未挂 `OMC_ROOT_PATH` 或前端未改写 `/api` | 检查 env 与 `omc-root.js` |
| WS 连不上 | Next rewrite 不支持 WS | 确认 app.js 回退到 `:8001/oneManCompany/ws` |
| 办公室空白 / 只有色块像素点 | tileset 未部署，或路径仍为 `/assets/...` 未带前缀 | 勿 ignore tileset；确认 `office-tileatlas.js` 用 `omcUrl('/assets/office/tilesets')`；`omc-root.js` 需改写 `/assets` |
| 母仓库 `agent` 空 | 残留子目录 `.git` | 删除嵌套 `.git` 再 `git add agent/` |
| `/oneManCompany/` 307 死循环 | 错误的 trailingSlash redirect | 去掉该 redirect，靠 base 标签 |

---

## 10. Codex 执行指令（可直接粘贴）

请按本仓库文档 `docs/execution/2026-08-06-onemancompany-agenthub-integration.md` **完整复现或校验** OneManCompany 与 AgentHub 的集成：

1. 确认 `agent/OneManCompany` 存在、无嵌套 `.git`，依赖已安装，`.onemancompany/.env` 含 `OMC_ROOT_PATH=/oneManCompany`。
2. 确认后端前缀挂载、前端 `omc-root.js` + `<base>`、母站 rewrite + proxy 放行、`dev:all` 脚本、demoUrl / 在线演示按钮均已落地；缺失则按文档补齐。
3. 确认 `.gitignore` 排除 docs/tests 等，但 **保留 tileset**。
4. 执行 `pnpm dev:all`，按 §7.2 验收；修复失败项直至清单通过。
5. 不要提交真实 `.env` / `.onemancompany` 密钥；不要把上游整个 `tests/docs` 塞回母仓库。

---

## 11. 关键文件速查

```text
agent/OneManCompany/src/onemancompany/main.py
agent/OneManCompany/src/onemancompany/core/config.py
agent/OneManCompany/frontend/index.html
agent/OneManCompany/frontend/omc-root.js
agent/OneManCompany/frontend/app.js
agent/OneManCompany/.env.example
next.config.ts
src/proxy.ts
scripts/dev-omc.mjs
scripts/dev-all.mjs
package.json
src/lib/demoUrl.ts
src/collections/Agents.ts
src/components/agent/AgentCard.tsx
src/lib/agentQueries.ts
src/components/agent/types.ts
src/app/(frontend)/agents/[slug]/page.tsx
.gitignore
```

---

*文档结束。云端 Codex 以本文件为唯一执行依据即可。*
