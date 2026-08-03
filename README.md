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
- `DOWNLOAD_ALLOWED_HOSTS`：可选，仅用于兼容历史外部 HTTPS 下载地址。
- `NEXT_PUBLIC_SERVER_URL`：站点公网地址。
- `APP_PORT`、`POSTGRES_PORT`：Docker 端口，默认 3102 和 55432。

## 发布 Agent

1. 普通用户登录 `/admin`，创建自己的智能体草稿。
2. 保存智能体后，在右侧“Skill 文件投稿”中上传 ZIP/RAR 和填写版本号。
3. 压缩包保存到本地持久卷，投稿进入待审核状态。
4. 审核员在“Skill 投稿审核”中通过后，系统创建或更新智能体版本并发布；拒绝后后台任务删除本地压缩包。

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

数据库数据存于 `agenthub_postgres` 卷，媒体存于 `agenthub_media` 卷，Skill 压缩包存于 `agenthub_skill_submissions` 卷。数据库与文件卷都需要备份。备份数据库：

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

评论、支付、Redis、CDN、微服务或 COS 上传。
