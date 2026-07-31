# AgentHub 生产部署交接

本项目是一个 Next.js 与 Payload CMS 一体化服务。部署后包含：应用容器、PostgreSQL、Caddy HTTPS 反向代理；技能包与媒体文件使用腾讯云 COS。

## 交付边界

交接给部署同事时提供 Git 仓库地址和服务器权限。不要提交或通过 Git 传递 `.env`、`secrets/`、COS 密钥、数据库密码或数据库备份。

若需要保留已有站点数据，另行通过受控渠道提供 PostgreSQL 备份并在部署前恢复；仅部署代码会得到一个空数据库。

## 服务器前提

- Linux 服务器，已安装 Docker Engine 和 Docker Compose v2。
- 域名 A/AAAA 记录已指向该服务器公网 IP，且公网 80、443 端口开放。
- 服务器的 80、443 端口未被其他 Web 服务占用。
- 已准备腾讯云 COS 桶与最小权限 CAM 子账号。

## 首次部署

```bash
git clone https://github.com/SaberLilyLi/-agenthub.git agenthub
cd agenthub
cp deploy/.env.production.example deploy/.env.production
mkdir -p secrets
openssl rand -base64 48 > secrets/payload_secret
chmod 600 deploy/.env.production secrets/payload_secret
```

编辑 `deploy/.env.production`：至少替换 `DOMAIN`、`POSTGRES_PASSWORD`、`AUDIT_IP_HASH_SECRET`、COS 配置、Turnstile 配置和 `DOWNLOAD_ALLOWED_HOSTS`。

先构建并应用数据库迁移：

```bash
docker compose -f deploy/docker-compose.production.yml --env-file deploy/.env.production --profile tools run --rm migrate
```

然后启动应用：

```bash
docker compose -f deploy/docker-compose.production.yml --env-file deploy/.env.production up -d --build
docker compose -f deploy/docker-compose.production.yml --env-file deploy/.env.production ps
```

首次访问 `https://你的域名/admin` 时创建第一个管理员。Caddy 会自动申请和续期 HTTPS 证书。

## 日常更新

```bash
git pull --ff-only
docker compose -f deploy/docker-compose.production.yml --env-file deploy/.env.production --profile tools run --rm migrate
docker compose -f deploy/docker-compose.production.yml --env-file deploy/.env.production up -d --build
```

若迁移失败，不要继续升级应用容器；先保留现有数据库卷并排查迁移错误。

## 备份与恢复

数据库备份应定时执行并保存到服务器之外的安全存储：

```bash
docker compose -f deploy/docker-compose.production.yml --env-file deploy/.env.production exec -T postgres pg_dump -U agenthub agenthub > agenthub-$(date +%F).sql
```

恢复前先停应用，并确认目标数据库无误：

```bash
docker compose -f deploy/docker-compose.production.yml --env-file deploy/.env.production stop app
docker compose -f deploy/docker-compose.production.yml --env-file deploy/.env.production exec -T postgres psql -U agenthub -d agenthub < agenthub-2026-01-01.sql
docker compose -f deploy/docker-compose.production.yml --env-file deploy/.env.production start app
```

Docker 卷 `agenthub_postgres` 存放数据库，`agenthub_media` 存放本地媒体缓存；两者都不能替代异地备份。

## 上线验收

- 首页与 `/admin` 可经 HTTPS 打开。
- 可创建管理员、登录后台。
- Agent 列表、详情、下载跳转和 COS 文件访问正常。
- 检查容器日志：`docker compose -f deploy/docker-compose.production.yml --env-file deploy/.env.production logs --tail=100 app`。
