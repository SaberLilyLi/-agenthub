# FaceMini AgentHub V1

鲸创官方 Agent 展示、发现与下载平台。技术栈为 Next.js App Router、Payload CMS、PostgreSQL、Tailwind CSS、shadcn/ui 与 Base UI。

## 本地运行

```bash
cp .env.example .env
docker compose up -d postgres
pnpm install
pnpm payload migrate
pnpm dev -- --port 3102
```

访问 `http://localhost:3102`，管理后台为 `/admin`。首次访问 `/admin` 时创建首个管理员。开发环境数据库默认映射为 `localhost:55432`。

## 环境变量

- `PAYLOAD_SECRET`：至少 32 位随机字符串。
- `DATABASE_URI`：PostgreSQL 连接串。
- `DOWNLOAD_ALLOWED_HOSTS`：逗号分隔的 COS 下载域名白名单。
- `NEXT_PUBLIC_SERVER_URL`：站点公网地址。
- `APP_PORT`、`POSTGRES_PORT`：Docker 端口，默认 3102 和 55432。

## 发布 Agent

1. 在 `/admin` 创建分类与 Agent，上传封面/截图。
2. 运营人员将 ZIP 手动上传腾讯云 COS。
3. 创建 AgentVersion，填写 COS HTTPS 地址、版本号和更新说明。
4. 发布版本与 Agent。前台下载请求会先记录行为，再通过 302 跳转到白名单 COS 地址。

## 验证

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Docker 部署

```bash
cp .env.example .env
# 修改 PAYLOAD_SECRET、POSTGRES_PASSWORD、NEXT_PUBLIC_SERVER_URL
docker compose build
docker compose up -d
docker compose logs -f app
```

数据库数据存于 `agenthub_postgres` 卷，媒体存于 `agenthub_media` 卷。备份数据库：

```bash
docker compose exec -T postgres pg_dump -U agenthub agenthub > agenthub.sql
```

开发和测试环境直接运行 Next.js 服务，不需要 Nginx。正式绑定域名与 HTTPS 时，优先使用 Caddy 自动申请和续期证书；也可根据腾讯云资源使用应用网关或负载均衡进行 TLS 终止和反向代理。Nginx 示例仅作为历史参考，不是 V1 部署前置条件。

### Caddy 示例

```caddy
agenthub.example.com {
  reverse_proxy 127.0.0.1:3102
}
```

## V1 不包含

用户投稿、评论、支付、Redis、CDN、微服务、在线 ZIP 上传或自动 COS 上传。
