# 鲸创 AgentHub V1 第一版本开发实施文档

> 项目英文名：FaceMini AgentHub  
> 项目中文名：鲸创 AgentHub  
> 产品定位：鲸创官方 Agent 应用展示、发现与下载平台，后续扩展为创作者投稿审核社区。  
> 当前阶段：V1 官方内容版本  
> 主执行工具：Codex  
> 后续 UI 微调：Cursor  
> 文档用途：将本文件直接放到项目根目录，交给 Codex 按阶段开发并完成验收。

---

## 0. 给 Codex 的执行指令

你现在是本项目的主开发工程师，请严格依据本文档完成 **FaceMini AgentHub V1** 的初始化、开发、测试与部署配置。

执行要求：

1. 不只生成方案，必须直接创建和修改项目代码。
2. 从空目录开始时，优先使用 Payload 官方 Website Template 初始化。
3. 使用脚手架自动生成的兼容版本，不要擅自升级 Next.js、Payload、React 等核心依赖。
4. 使用 `pnpm`，提交 `pnpm-lock.yaml`。
5. 按本文档“开发阶段”顺序执行，每完成一个阶段就运行类型检查、Lint 和相关测试。
6. 默认使用服务端组件，只有确实需要浏览器交互时才使用 Client Component。
7. 不允许在生产页面中使用 Mock 数据、虚假下载量、虚假用户数或虚假评价。
8. 数据必须来自 Payload/PostgreSQL；无数据时展示真实空状态。
9. 不要开发本文明确标记为“V1 不做”的功能。
10. 所有账号权限、Agent 发布状态和下载逻辑必须由服务端校验，不能只在前端隐藏按钮。
11. 保留后续社区投稿扩展字段，但 V1 不开放普通用户投稿入口。
12. 完成后输出：
    - 已完成清单；
    - 目录结构；
    - 环境变量说明；
    - 本地启动命令；
    - 初始化管理员方式；
    - 腾讯云 COS 下载链接配置方式；
    - 测试结果；
    - 尚未完成项和原因。

如果项目目录已经存在，先审查当前代码和依赖，再在现有项目上实施；不要重复创建第二套项目。

---

# 1. 项目背景

FaceMini（鲸创）计划建设一个自有 Agent 应用平台。

早期阶段由公司每天持续发布自研 Agent，用户可以浏览、搜索、查看详情、在线体验或下载项目压缩包。平台积累一定内容和用户后，再开放创作者注册、Agent 投稿、平台审核和社区展示。

V1 的核心目标不是做完整社区，而是先完成：

- 一个具备品牌感的官方 Agent 应用市场；
- 一个可持续发布内容的管理后台；
- 一套真实可用的用户登录和收藏体系；
- 一套能够跳转腾讯云 COS 下载的版本管理机制；
- 一套为后续创作者投稿预留的数据结构。

---

# 2. V1 产品目标

## 2.1 核心目标

V1 上线后，管理员应当可以：

1. 登录 Payload 管理后台；
2. 创建 Agent 分类；
3. 上传 Agent 封面和截图；
4. 创建 Agent 介绍；
5. 配置在线体验地址；
6. 创建 Agent 版本；
7. 填写腾讯云 COS 压缩包下载地址；
8. 将 Agent 从草稿发布为正式内容；
9. 设置首页推荐；
10. 查看基础下载记录和用户数据。

普通访客应当可以：

1. 浏览首页；
2. 浏览 Agent 广场；
3. 按分类筛选；
4. 通过关键词搜索；
5. 查看 Agent 详情；
6. 查看最新版本和历史版本；
7. 点击下载压缩包；
8. 访问在线体验地址；
9. 注册和登录；
10. 收藏 Agent；
11. 查看自己的收藏和下载记录。

## 2.2 成功标准

V1 不是视觉原型，必须形成可运行、可部署、可持续录入真实 Agent 的产品。

至少满足：

- 管理员无需修改代码即可发布 Agent；
- 页面所有 Agent 数据均来自数据库；
- 用户点击下载后能够跳转腾讯云 COS；
- 管理员和普通用户权限严格隔离；
- PC 与手机端均可正常使用；
- 项目可以通过 Docker Compose 在腾讯云 CVM 部署；
- `pnpm build`、类型检查和基础测试全部通过。

---

# 3. V1 范围

## 3.1 V1 必须实现

### 公共站点

- 品牌首页
- Agent 广场
- Agent 详情页
- 分类筛选
- 关键词搜索
- 最新发布排序
- 推荐 Agent
- 在线体验跳转
- 下载跳转
- 历史版本展示
- 关于鲸创
- 用户协议
- 隐私政策
- 404、错误页、加载状态和空状态

### 用户功能

- 邮箱注册
- 邮箱密码登录
- 退出登录
- 当前用户状态保持
- 个人资料基础修改
- 收藏与取消收藏
- 我的收藏
- 我的下载记录
- 未登录操作拦截与登录引导

### 管理后台

- 管理员登录
- Agent CRUD
- 分类 CRUD
- Agent 版本 CRUD
- 媒体管理
- 用户查看和禁用
- 推荐位配置
- Agent 草稿、发布、下架状态
- 下载记录查看
- 网站基础设置

### 技术与部署

- PostgreSQL
- Payload CMS
- Next.js App Router
- Dockerfile
- Docker Compose
- Nginx 配置示例
- 数据库持久化卷
- 媒体文件持久化卷
- `.env.example`
- 数据库迁移
- 基础自动化测试
- README 启动与部署说明

## 3.2 V1 明确不做

- 用户投稿前台
- 创作者认证
- Agent 在线编辑器
- Agent 在线运行沙箱
- 平台内上传 ZIP
- 自动上传腾讯云 COS
- 自动代码安全扫描
- 评论
- 评分
- 关注和粉丝
- 私信
- 动态信息流
- 付费下载
- 会员订阅
- 积分体系
- 支付和退款
- 创作者结算
- Redis
- 消息队列
- Elasticsearch / Meilisearch
- CDN
- Kubernetes
- 微服务拆分
- 多租户
- 第三方 OAuth
- 手机验证码登录
- 邮件验证强制流程

---

# 4. 技术栈

## 4.1 核心技术

| 层级 | 技术 |
|---|---|
| 开发语言 | TypeScript |
| 前端框架 | Next.js App Router + React |
| CMS / 后端 | Payload CMS |
| UI 样式 | Tailwind CSS |
| UI 组件 | shadcn/ui 或项目中兼容的轻量无头组件 |
| 图标 | Lucide React |
| 表单 | React Hook Form |
| 参数校验 | Zod |
| 数据库 | PostgreSQL |
| ORM / 数据访问 | Payload PostgreSQL Adapter |
| 文件媒体 | Payload 本地媒体持久化；压缩包使用腾讯云 COS 外链 |
| 包管理器 | pnpm |
| 容器化 | Docker + Docker Compose |
| 反向代理 | Nginx |
| 代码托管 | GitHub 私有仓库 |
| 测试 | Vitest + Playwright |
| 代码规范 | ESLint + Prettier + TypeScript Strict |

## 4.2 初始化方式

在空目录中优先执行：

```bash
pnpx create-payload-app@latest -t website
```

初始化时：

- 选择 PostgreSQL；
- 保留 Payload Website Template 的基础结构；
- 删除不符合本项目的博客、示例页面和虚假 Seed 内容；
- 不要将模板示例内容直接作为线上内容；
- 保留模板中有价值的 SEO、媒体、富文本和权限实现；
- 核心依赖版本以脚手架生成结果为准。

## 4.3 架构原则

采用单体全栈架构：

```text
浏览器
  ↓
Nginx
  ↓
Next.js + Payload CMS
  ↓
PostgreSQL

Agent 压缩包下载
  ↓
腾讯云 COS 公有下载链接
```

V1 不单独建设 NestJS、Java 或 Python 后端。

---

# 5. 品牌与视觉方向

## 5.1 品牌展示

统一使用：

```text
FaceMini
鲸创 AgentHub
智能体应用发现平台
```

首页主标题建议：

```text
发现真正好用的 Agent
```

辅助文案：

```text
鲸创持续发布经过验证的智能体应用，让 AI 真正解决实际问题。
```

核心按钮：

- 探索 Agent
- 查看最新发布

后续投稿按钮暂不开放。允许在页面底部展示：

```text
创作者投稿功能即将开放
```

但不能设计成可点击提交表单。

## 5.2 风格要求

- 整体偏科技感、产品感和社区感；
- 不做传统政府网站；
- 不做过度炫技的大屏风格；
- 不做严重同质化的 SaaS 仪表盘；
- 以浅色主题为主；
- 深色文字、干净留白、适量鲸蓝渐变；
- 圆角适中，不要所有容器都做大圆角；
- 阴影轻量；
- 动效克制；
- 卡片层级清晰；
- Agent 封面必须成为视觉重点；
- 页面信息密度适中；
- 支持响应式布局。

## 5.3 设计变量

使用 CSS Variables 管理颜色，不在大量组件里硬编码。

建议初始变量：

```css
:root {
  --background: #f7f9fc;
  --foreground: #111827;
  --surface: #ffffff;
  --surface-muted: #f1f5f9;
  --border: #e5e7eb;
  --brand: #176bff;
  --brand-hover: #0f56d9;
  --brand-soft: #eaf2ff;
  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
}
```

如果项目中已经有鲸创品牌色，应统一替换 `--brand`，不要在组件中零散修改。

## 5.4 Logo 处理

预留：

```text
/public/brand/logo.svg
/public/brand/logo-mark.svg
/public/brand/favicon.svg
```

没有正式 Logo 时使用清晰的文字 Logo，不要生成廉价临时图标冒充正式品牌资产。

---

# 6. 信息架构与路由

## 6.1 前台路由

```text
/
├─ /agents
├─ /agents/[slug]
├─ /categories/[slug]
├─ /login
├─ /register
├─ /me
│  ├─ /me/profile
│  ├─ /me/favorites
│  └─ /me/downloads
├─ /about
├─ /terms
├─ /privacy
└─ /coming-soon
```

## 6.2 后台路由

```text
/admin
```

使用 Payload 自带后台，不重复开发第二套管理系统。

## 6.3 接口路由

建议补充以下自定义 Route Handlers：

```text
/api/download/[versionId]
/api/favorites/toggle
/api/account/profile
/api/health
```

Payload 自动生成的认证、CRUD API 保持可用，但前台优先使用服务端 Local API 或封装后的服务层，不要在页面中散落大量裸 REST 请求。

---

# 7. 页面详细需求

## 7.1 全局头部

包含：

- FaceMini / 鲸创 AgentHub Logo
- 首页
- Agent 广场
- 分类
- 关于鲸创
- 全局搜索入口
- 登录按钮或用户头像
- 移动端菜单

要求：

- 桌面端吸顶但不遮挡内容；
- 滚动后可增加轻微背景模糊；
- 未登录显示“登录 / 注册”；
- 已登录显示头像菜单；
- 普通用户不能看到管理后台入口；
- 管理员前台可显示“进入后台”。

## 7.2 首页

页面顺序：

### A. Hero

包含：

- 主标题
- 简短说明
- Agent 搜索框
- “探索 Agent”按钮
- “查看最新发布”按钮
- 右侧可使用真实 Agent 卡片组合展示

禁止展示虚假数字，例如：

- 已服务 10 万用户
- 已发布 1000 个 Agent
- 下载量 100 万

如果需要数据区，必须从数据库实时聚合真实数量；没有数据时隐藏。

### B. 官方精选

展示管理员设置 `featured = true` 且状态为 `published` 的 Agent。

- 桌面端建议 3～4 列；
- 移动端 1 列；
- 最多展示 8 个；
- 无精选内容时隐藏整个区域。

### C. 最新发布

按照正式发布时间倒序。

展示：

- 封面
- 名称
- 一句话介绍
- 分类
- 标签
- 当前版本
- 更新时间
- 官方标识

### D. 分类入口

分类来自数据库，展示：

- 分类名称
- 简介
- 图标
- 对应 Agent 数量

不允许把分类写死在前端。

### E. 每日 Agent 内容区

用于突出公司的运营特点：

```text
鲸创持续发布实用 Agent
从业务问题出发，用智能体解决真实工作场景。
```

展示最近发布内容，不制造“每天必定更新”的虚假承诺。

### F. 创作者功能预告

只展示未来规划：

```text
创作者投稿功能即将开放
未来你可以发布自己的 Agent，经审核后展示给更多用户。
```

按钮跳转 `/coming-soon`，不得出现未完成表单。

### G. 页脚

包含：

- 公司名称
- 平台说明
- 导航
- 联系方式占位配置
- 用户协议
- 隐私政策
- ICP 备案号配置项
- 公安备案号配置项
- Copyright

备案信息为空时不展示空标签。

## 7.3 Agent 广场 `/agents`

包含：

- 页面标题和说明
- 搜索框
- 分类筛选
- 标签筛选
- 排序
- Agent 卡片网格
- 分页
- 空状态

排序至少支持：

- 最新发布
- 最多下载
- 推荐优先

V1 不需要无限滚动，使用分页。

URL 查询参数必须可分享，例如：

```text
/agents?q=电商&category=ecommerce&sort=latest&page=1
```

刷新页面后筛选状态不能丢失。

## 7.4 Agent 卡片

统一卡片结构：

- 16:9 或固定比例封面
- 官方标识
- Agent 名称
- 一句话介绍，最多两行
- 分类
- 最多显示三个标签
- 当前版本
- 发布时间
- 下载量
- 收藏按钮
- 可选在线体验标识

规则：

- 整张卡片可点击；
- 收藏按钮点击不能触发卡片跳转；
- 未登录收藏时打开登录引导；
- 没有真实下载量时显示 `0`，不能伪造；
- 没有封面时使用统一品牌占位图。

## 7.5 Agent 详情页 `/agents/[slug]`

### 顶部信息

- 面包屑
- 封面
- 官方标识
- 名称
- 一句话介绍
- 分类与标签
- 当前版本
- 发布时间
- 下载量
- 收藏按钮
- 在线体验按钮
- 下载按钮

按钮逻辑：

- 有 `demoUrl` 才显示在线体验；
- 有已发布版本和有效 `downloadUrl` 才显示下载；
- 下载按钮调用平台下载接口，不直接在组件里裸跳 COS；
- 接口记录下载后返回 302 跳转 COS。

### 详情内容

至少支持：

- 产品介绍
- 核心能力
- 适用人群
- 使用方式
- 部署说明
- 截图画廊
- 注意事项
- 更新日志
- 历史版本

详细内容使用 Payload 富文本字段。

### 版本列表

展示：

- 版本号
- 发布时间
- 文件大小
- 更新说明
- 稳定版 / 测试版标识
- 下载按钮

只展示 `published` 版本。

## 7.6 登录页

字段：

- 邮箱
- 密码
- 登录按钮
- 注册入口

要求：

- 使用 Zod 校验；
- 错误信息清晰；
- 支持回到原始目标页面；
- 登录成功后刷新用户状态；
- 登录 Cookie 使用 Payload 安全认证机制；
- 不把 Token 写入 localStorage。

## 7.7 注册页

字段：

- 昵称
- 邮箱
- 密码
- 确认密码
- 同意用户协议和隐私政策

要求：

- 密码不少于 8 位；
- 邮箱唯一；
- 昵称长度限制；
- 注册成功后登录或引导登录；
- 默认角色只能是 `user`；
- 前端提交的角色字段必须被后端忽略；
- 用户不能自行注册为管理员、审核员或创作者。

## 7.8 个人中心

### 我的资料

- 头像
- 昵称
- 邮箱只读或通过安全流程修改
- 注册时间

### 我的收藏

- 已收藏 Agent 列表
- 取消收藏
- 空状态

### 下载记录

- Agent 名称
- 版本号
- 下载时间
- 再次下载

用户只能查看自己的记录。

## 7.9 关于鲸创

展示：

- 公司介绍
- AgentHub 建设目标
- 官方 Agent 内容原则
- 联系方式

内容从 SiteSettings 或 Pages 管理，不要硬编码大段文案。

---

# 8. Payload 数据模型

## 8.1 Admins

用途：Payload 后台管理员。

字段：

```text
email             Payload auth 内置
password          Payload auth 内置
name              text，必填
role              select
status            select
lastLoginAt       date，可选
```

角色：

```text
superAdmin
editor
reviewer
```

权限：

- `superAdmin`：全部权限；
- `editor`：管理 Agent、分类、版本、媒体；
- `reviewer`：V1 可查看内容，后续用于投稿审核；
- 只有 Admins 可以进入 `/admin`；
- 普通 Users 永远不能进入管理后台。

## 8.2 Users

用途：前台普通用户。

启用 Payload Auth。

字段：

```text
nickname          text，必填
avatar            relationship -> Media，可选
role              select，默认 user，服务端不可由用户修改
status            select，默认 active
creatorStatus     select，默认 none，V1 只预留
bio               textarea，可选
```

枚举：

```text
role:
- user
- creator

status:
- active
- disabled

creatorStatus:
- none
- pending
- approved
- rejected
```

V1 前台不开放创作者申请。

访问控制：

- 未登录用户可创建普通账号；
- 用户只能读取和修改自己的资料；
- 用户不能修改 `role`、`status`、`creatorStatus`；
- 管理员可以读取、修改和禁用用户；
- 被禁用用户不能继续进行登录态操作。

## 8.3 Media

用途：

- Agent 封面
- Agent 截图
- 用户头像
- 分类图标
- 网站品牌图片

字段：

```text
alt               text，必填
caption           text，可选
type              select
```

类型：

```text
agent-cover
agent-screenshot
avatar
category-icon
site
```

V1 使用 Payload 媒体上传并存储到服务器持久化目录。Docker 必须挂载媒体卷，避免重建容器后丢失文件。

Agent ZIP 不上传到 Media。

## 8.4 Categories

字段：

```text
name              text，必填、唯一
slug              text，必填、唯一
description       textarea
icon              relationship -> Media，可选
sortOrder         number，默认 0
status            select，默认 active
seo               group
```

状态：

```text
active
hidden
```

删除分类前必须检查是否被 Agent 使用，优先禁止直接删除，允许隐藏。

## 8.5 Agents

字段设计：

```text
name                  text，必填
slug                  text，必填、唯一
summary               textarea，必填，限制长度
cover                 relationship -> Media，必填
screenshots           relationship -> Media，hasMany
category              relationship -> Categories，必填
tags                  array[text]
description           richText，必填
features              array
targetAudience        richText，可选
usageGuide            richText，可选
deploymentGuide       richText，可选
notice                 richText，可选
demoUrl               text，可选
sourceUrl             text，可选
sourceType            select，默认 official
authorType            select，默认 facemini
authorUser             relationship -> Users，可选
status                select，默认 draft
featured              checkbox，默认 false
featuredOrder         number，默认 0
publishedAt           date
viewCount             number，默认 0，只读
downloadCount         number，默认 0，只读
seo                    group
```

枚举：

```text
sourceType:
- official
- community
- partner

authorType:
- facemini
- user
- partner

status:
- draft
- published
- archived
```

V1 规则：

- 后台创建时默认 `sourceType = official`；
- V1 不允许普通用户创建 Agents；
- 只有 `published` 内容可以出现在前台；
- 发布时如果 `publishedAt` 为空则自动写入当前时间；
- 下架后详情页对普通用户返回 404；
- 下载量和浏览量不能由后台普通编辑人员随意修改；
- `slug` 自动生成后允许管理员调整；
- `summary` 建议限制 120 个中文字符以内。

## 8.6 AgentVersions

字段：

```text
agent                 relationship -> Agents，必填
version               text，必填
releaseType           select，默认 stable
releaseNotes          richText，必填
downloadUrl           text，必填
fileName              text，可选
fileSize              number，可选，单位 byte
sha256                 text，可选
status                 select，默认 draft
releasedAt             date
sortOrder              number，默认 0
```

枚举：

```text
releaseType:
- stable
- beta
- alpha

status:
- draft
- published
- archived
```

约束：

- 同一 Agent 下版本号不能重复；
- 只展示 `published` 版本；
- `downloadUrl` 必须是 `https://`；
- V1 允许腾讯云 COS 地址或公司下载域名；
- 下载地址不应从客户端表单中提交；
- 发布时自动写入 `releasedAt`；
- Agent 当前版本通过查询最新已发布版本获得，不在多个位置重复维护。

## 8.7 Favorites

字段：

```text
user                  relationship -> Users，必填
agent                 relationship -> Agents，必填
createdAt             自动时间
```

约束：

- `user + agent` 联合唯一；
- 用户只能读写自己的收藏；
- 管理员可查看；
- Agent 下架后收藏记录可保留，但前台不展示下架详情。

## 8.8 DownloadRecords

字段：

```text
user                  relationship -> Users，可选
agent                 relationship -> Agents，必填
version               relationship -> AgentVersions，必填
ipHash                text，可选
userAgent             text，可选
referer               text，可选
createdAt             自动时间
```

规则：

- 未登录访客也允许下载公开 Agent；
- 未登录时 `user` 为空；
- 不直接长期保存明文 IP，使用服务端哈希或截断后的值；
- 用户只能查看自己的下载记录；
- 管理员可查看全部记录；
- 前台不能直接创建伪造记录；
- 记录由下载 Route Handler 服务端创建。

## 8.9 SiteSettings

使用 Global。

字段：

```text
siteName
siteDescription
logo
logoMark
contactEmail
contactPhone
companyName
companyAddress
icpNumber
publicSecurityNumber
footerDescription
socialLinks
defaultSeo
```

前台品牌、页脚和 SEO 默认值从这里读取。

## 8.10 Submissions 预留说明

V1 不需要创建完整投稿业务页面。

可以选择：

- 暂不创建 Collection；
- 或创建最小 `Submissions` Collection，但只允许管理员访问。

不要为了“未来可能需要”提前开发复杂审核工作流。

---

# 9. 权限模型

## 9.1 访客

可以：

- 查看已发布 Agent；
- 查看已启用分类；
- 搜索；
- 下载公开版本；
- 注册和登录。

不能：

- 收藏；
- 查看个人中心；
- 创建或修改 Agent；
- 进入后台。

## 9.2 普通用户

可以：

- 完成访客全部操作；
- 收藏；
- 查看自己的收藏；
- 查看自己的下载记录；
- 修改自己的基础资料。

不能：

- 创建 Agent；
- 修改角色；
- 修改账号状态；
- 查看其他用户信息；
- 查看其他用户下载记录；
- 进入后台。

## 9.3 编辑管理员

可以：

- 管理 Agent；
- 管理版本；
- 管理分类；
- 管理媒体；
- 设置推荐内容。

不能：

- 提升自己为超级管理员；
- 删除超级管理员；
- 修改系统级安全配置。

## 9.4 超级管理员

拥有全部权限。

## 9.5 服务端校验

所有权限必须在以下位置至少有一层服务端实现：

- Payload Collection access；
- 字段级 access；
- 自定义 Route Handler；
- Payload Local API 调用时传入正确用户上下文。

禁止仅依靠：

```text
前端不显示按钮
```

来实现权限。

---

# 10. 搜索与筛选

## 10.1 搜索字段

V1 搜索范围：

- Agent 名称
- 一句话介绍
- 标签
- 分类名称

## 10.2 搜索实现

使用 Payload 查询和 PostgreSQL 支持的基础过滤完成。

不引入独立搜索服务。

搜索逻辑：

```text
status = published
AND
(
  name contains q
  OR summary contains q
  OR tags contains q
)
```

分类条件与关键词条件同时生效。

## 10.3 URL 状态

筛选状态写入 URL 查询参数：

```text
q
category
sort
page
```

浏览器前进、后退、刷新后状态必须正确恢复。

---

# 11. 下载流程

## 11.1 V1 文件管理方式

Agent 压缩包由公司员工手动上传到腾讯云 COS。

上传完成后，在 Payload 后台的 AgentVersions 中填写：

- 下载地址
- 文件名
- 文件大小
- 版本号
- 更新日志
- SHA256，可选

V1 不开发 COS 上传 SDK。

## 11.2 下载接口

统一通过：

```text
GET /api/download/[versionId]
```

处理流程：

1. 查询版本；
2. 确认版本状态为 `published`；
3. 确认关联 Agent 状态为 `published`；
4. 校验 `downloadUrl` 为合法 HTTPS 地址；
5. 创建 DownloadRecord；
6. 增加 Agent 下载量；
7. 返回 302/307 重定向至腾讯云 COS；
8. 出错时返回清晰错误页，不暴露系统堆栈。

## 11.3 下载次数

V1 可以使用数据库更新累计值，但代码要集中封装，便于以后替换为 Redis 或原子计数。

不能在前端点击时直接 `downloadCount + 1`。

## 11.4 安全限制

下载重定向必须限制允许的域名。

配置环境变量：

```env
DOWNLOAD_ALLOWED_HOSTS=example.cos.ap-guangzhou.myqcloud.com,download.facemini.com
```

不能把任意数据库 URL 无条件重定向给用户，避免开放重定向风险。

---

# 12. 用户认证

## 12.1 认证方式

V1 使用 Payload Auth：

- 邮箱
- 密码
- HTTP-only Cookie
- 同域认证

不在 localStorage 存 Token。

## 12.2 密码规则

至少：

- 8 位；
- 服务端校验；
- 登录失败返回统一错误，不泄露邮箱是否存在；
- 可配置登录失败锁定策略。

## 12.3 忘记密码

V1 可以保留 Payload 能力和接口，但如果未配置 SMTP：

- 前台不展示无法工作的忘记密码入口；
- README 明确说明；
- 不伪造“邮件已发送”。

后续配置腾讯企业邮、腾讯云邮件服务或其他 SMTP 后再开放。

---

# 13. SEO 与分享

每个 Agent 详情页生成动态 Metadata：

- title
- description
- canonical
- Open Graph
- Twitter Card
- 封面图
- robots

要求：

- 草稿和下架 Agent 不被索引；
- Agent 广场支持规范 canonical；
- SiteSettings 提供默认 SEO；
- 生成 `sitemap.xml`；
- 生成 `robots.txt`；
- 详情页标题格式建议：
  - `{Agent名称} - 鲸创 AgentHub`
- 中文内容使用正确语言标记。

---

# 14. 项目目录建议

以 Payload Website Template 实际目录为准，可整理为：

```text
src/
├─ app/
│  ├─ (frontend)/
│  │  ├─ page.tsx
│  │  ├─ agents/
│  │  ├─ categories/
│  │  ├─ login/
│  │  ├─ register/
│  │  ├─ me/
│  │  ├─ about/
│  │  ├─ terms/
│  │  └─ privacy/
│  ├─ (payload)/
│  │  └─ admin/
│  └─ api/
│     ├─ download/
│     ├─ favorites/
│     ├─ account/
│     └─ health/
├─ collections/
│  ├─ Admins.ts
│  ├─ Users.ts
│  ├─ Media.ts
│  ├─ Categories.ts
│  ├─ Agents.ts
│  ├─ AgentVersions.ts
│  ├─ Favorites.ts
│  └─ DownloadRecords.ts
├─ globals/
│  └─ SiteSettings.ts
├─ access/
│  ├─ isAdmin.ts
│  ├─ isSuperAdmin.ts
│  ├─ isPublishedOrAdmin.ts
│  ├─ ownDocument.ts
│  └─ fieldPermissions.ts
├─ components/
│  ├─ layout/
│  ├─ agent/
│  ├─ auth/
│  ├─ account/
│  ├─ common/
│  └─ ui/
├─ features/
│  ├─ agents/
│  ├─ auth/
│  ├─ favorites/
│  ├─ downloads/
│  └─ site-settings/
├─ lib/
│  ├─ payload.ts
│  ├─ auth.ts
│  ├─ env.ts
│  ├─ urls.ts
│  ├─ seo.ts
│  └─ utils.ts
├─ hooks/
├─ styles/
└─ payload.config.ts

tests/
├─ unit/
└─ e2e/

public/
└─ brand/

docker/
├─ nginx.conf
└─ scripts/

docker-compose.yml
Dockerfile
.env.example
README.md
```

不要为了机械符合目录而破坏 Payload 脚手架约定；如实际模板结构不同，保持兼容并在 README 说明。

---

# 15. 环境变量

创建 `.env.example`：

```env
# Application
NODE_ENV=development
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
PAYLOAD_SECRET=replace-with-at-least-32-random-characters

# PostgreSQL
DATABASE_URI=postgresql://agenthub:agenthub_password@postgres:5432/agenthub

# Download redirect allowlist
DOWNLOAD_ALLOWED_HOSTS=example.cos.ap-guangzhou.myqcloud.com,download.facemini.com

# Optional initial admin for development seed only
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=change-me-in-local-only

# Optional site defaults
NEXT_PUBLIC_SITE_NAME=鲸创 AgentHub
NEXT_PUBLIC_SITE_DESCRIPTION=智能体应用发现平台
```

要求：

- `.env` 加入 `.gitignore`；
- 不提交真实密码；
- `PAYLOAD_SECRET` 生产环境必须单独生成；
- 环境变量在启动时使用 Zod 校验；
- 缺少关键变量时给出明确错误并终止启动。

---

# 16. Docker 与部署

## 16.1 Docker Compose 服务

V1 包含：

```text
app
postgres
```

可选开发工具：

```text
adminer
```

生产环境默认不暴露 Adminer。

## 16.2 持久化

必须配置：

```text
PostgreSQL 数据卷
Payload Media 数据卷
```

重建容器后：

- 数据库不能丢失；
- 已上传封面和截图不能丢失。

## 16.3 Nginx

提供配置示例：

- HTTP 跳转 HTTPS；
- 反向代理至 Next.js；
- 上传大小限制；
- 正确传递 `X-Forwarded-For`；
- 正确传递 `X-Forwarded-Proto`；
- 静态资源缓存；
- 不缓存用户个人中心和认证接口；
- `/admin` 正常访问；
- 健康检查接口可访问。

## 16.4 腾讯云 CVM 初始部署

目标环境：

```text
Ubuntu LTS
Docker Engine
Docker Compose Plugin
Nginx 可运行于宿主机或容器
```

V1 不要求自动化 CI/CD，但 README 必须提供：

```bash
git pull
docker compose build
docker compose up -d
docker compose logs -f app
```

---

# 17. 数据初始化

## 17.1 原则

生产页面不使用虚假 Agent 数据。

允许开发环境提供可选 Seed，但必须：

- 只在明确执行 Seed 命令时写入；
- 数据标记为开发示例；
- 生产环境不自动执行；
- 不伪造下载量；
- 不伪造用户评价。

## 17.2 必须初始化

- 超级管理员；
- SiteSettings 默认信息；
- 可选基础分类。

基础分类可以初始化为：

- 电商经营
- 内容创作
- 办公效率
- 企业服务
- 开发工具
- 行业应用

分类后续可在后台修改。

---

# 18. 空状态与异常状态

每个数据页面必须提供：

- Loading
- Empty
- Error
- Not Found

示例：

### Agent 广场为空

```text
暂时还没有已发布的 Agent
鲸创正在整理第一批实用智能体应用。
```

### 搜索无结果

```text
没有找到匹配的 Agent
请尝试更换关键词或清除筛选条件。
```

### 收藏为空

```text
还没有收藏 Agent
前往 Agent 广场发现实用工具。
```

### 下载失败

```text
当前版本暂时无法下载
请稍后重试或联系平台管理员。
```

不能显示原始数据库错误、堆栈和内部对象 ID。

---

# 19. 性能要求

- 首页优先使用服务端渲染；
- Agent 列表使用分页；
- 图片使用 Next.js Image；
- 封面提供合理尺寸；
- 截图使用延迟加载；
- 不在首页一次查询全部 Agent；
- 不把完整富文本字段加载到卡片列表；
- 避免重复查询 SiteSettings；
- 服务端请求设置合理缓存和失效策略；
- Agent 发布、修改、下架后应正确触发页面再验证；
- 移动端首屏避免加载大型视频；
- V1 Hero 不使用自动播放背景视频。

---

# 20. 安全要求

必须实现：

- 服务端权限校验；
- Zod 参数校验；
- 防止开放重定向；
- 用户角色字段级保护；
- 管理后台与前台用户隔离；
- 密码不出现在日志；
- 下载接口基础频率保护，可先使用内存级轻量策略并说明限制；
- 富文本输出安全渲染；
- 外部 URL 使用 `rel="noopener noreferrer"`；
- 文件下载仅允许 HTTPS；
- 用户输入长度限制；
- Cookie 在生产环境启用 Secure；
- 配置合理的安全响应头；
- 不在客户端暴露数据库连接和 Payload Secret；
- 不记录完整明文 IP；
- 不信任前端提交的 `userId`；
- 收藏和个人资料均从当前登录用户解析。

---

# 21. 测试要求

## 21.1 单元测试

至少覆盖：

- 管理员判断；
- 用户只能访问自己数据；
- 下载域名白名单；
- URL 校验；
- Agent 发布状态判断；
- 版本号基础校验；
- 用户角色字段不可自行修改。

## 21.2 E2E 测试

至少覆盖：

1. 首页能够打开；
2. Agent 广场能够打开；
3. 已发布 Agent 能进入详情页；
4. 草稿 Agent 前台不可访问；
5. 搜索和分类查询参数生效；
6. 用户可以注册；
7. 用户可以登录和退出；
8. 未登录收藏会进入登录流程；
9. 已登录用户可以收藏和取消收藏；
10. 用户只能查看自己的收藏；
11. 下载接口记录后重定向；
12. 非白名单下载地址被拒绝；
13. 普通用户无法进入管理后台；
14. 管理员可以进入管理后台。

## 21.3 每阶段检查

执行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

如果脚手架没有 `typecheck`，补充：

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

最终不能通过删除规则、关闭 Strict 或大量使用 `any` 来规避错误。

---

# 22. 开发阶段

## 阶段 0：初始化和清理

任务：

- 初始化 Payload Website Template；
- 配置 PostgreSQL；
- 配置 pnpm；
- 清理无关博客示例；
- 建立品牌变量；
- 建立基础目录；
- 创建 `.env.example`；
- 保证空项目可启动。

验收：

- 本地打开前台；
- 本地打开 `/admin`；
- 数据库连接成功；
- 无模板虚假内容；
- Build 通过。

## 阶段 1：数据模型与权限

任务：

- Admins；
- Users；
- Media；
- Categories；
- Agents；
- AgentVersions；
- Favorites；
- DownloadRecords；
- SiteSettings；
- Collection access；
- Field access；
- Hooks；
- Migration。

验收：

- 管理员可以登录；
- 普通用户无法进入后台；
- 管理员能创建分类、Agent 和版本；
- 草稿内容不出现在公开 API；
- 权限测试通过。

## 阶段 2：公共前台

任务：

- 全局布局；
- 首页；
- Agent 广场；
- Agent 卡片；
- 分类页；
- Agent 详情；
- 版本列表；
- 关于、协议、隐私；
- SEO；
- 响应式；
- 空状态。

验收：

- 后台发布 Agent 后前台出现；
- 下架后前台消失；
- 搜索、分类和分页可用；
- 无硬编码 Agent 数据；
- 手机端正常。

## 阶段 3：用户系统

任务：

- 注册；
- 登录；
- 退出；
- 当前用户；
- 个人中心；
- 修改昵称和头像；
- 登录重定向；
- 禁用用户处理。

验收：

- 用户注册成功；
- 用户不能修改角色；
- 登录态持久；
- 退出后受保护页面不可访问；
- 普通用户不能进入后台。

## 阶段 4：收藏和下载

任务：

- 收藏切换；
- 我的收藏；
- 下载 Route Handler；
- 下载记录；
- 下载量；
- 白名单校验；
- 我的下载记录。

验收：

- 收藏不重复；
- 下载接口记录真实数据；
- 腾讯云 COS 地址跳转成功；
- 非白名单地址被拒绝；
- 用户只能看到自己的记录。

## 阶段 5：测试和部署

任务：

- 单元测试；
- E2E；
- Dockerfile；
- Docker Compose；
- Nginx 示例；
- 健康检查；
- README；
- 初始化管理员说明；
- 数据备份说明。

验收：

- 全部命令通过；
- Docker 启动成功；
- 重启容器数据不丢；
- README 可供另一位开发者独立启动；
- 不依赖开发者本机隐式配置。

---

# 23. 验收标准

## 23.1 功能验收

- [ ] 首页能读取真实推荐 Agent；
- [ ] Agent 广场能搜索、筛选和分页；
- [ ] Agent 详情能展示富文本和截图；
- [ ] 历史版本能展示；
- [ ] 腾讯云 COS 压缩包能下载；
- [ ] 下载行为有记录；
- [ ] 用户能注册登录；
- [ ] 用户能收藏；
- [ ] 用户能查看自己的下载历史；
- [ ] 管理员能通过后台发布内容；
- [ ] 普通用户不能进入后台；
- [ ] 草稿和下架 Agent 不公开；
- [ ] 网站设置可从后台修改；
- [ ] 移动端可用。

## 23.2 数据可信度验收

- [ ] 无虚假用户数；
- [ ] 无虚假下载量；
- [ ] 无虚假评分；
- [ ] 无生产 Mock Agent；
- [ ] 所有统计都来自真实数据；
- [ ] 无数据时展示空状态。

## 23.3 工程验收

- [ ] TypeScript Strict；
- [ ] 无大面积 `any`；
- [ ] 环境变量校验；
- [ ] 数据库 Migration；
- [ ] Docker 可启动；
- [ ] 数据与媒体持久化；
- [ ] Lint 通过；
- [ ] Typecheck 通过；
- [ ] 测试通过；
- [ ] Build 通过；
- [ ] README 完整；
- [ ] 无密钥提交到 Git。

## 23.4 安全验收

- [ ] 用户不能修改角色；
- [ ] 用户不能查看他人资料；
- [ ] 用户不能查看他人收藏和下载记录；
- [ ] 普通用户不能进入后台；
- [ ] 下载重定向有域名白名单；
- [ ] 草稿不可公开；
- [ ] Cookie 生产环境安全配置；
- [ ] 外部链接安全属性；
- [ ] 无敏感信息日志。

---

# 24. README 必须包含

Codex 完成项目后，README 至少包含：

1. 项目简介；
2. 技术栈；
3. 环境要求；
4. 本地安装；
5. PostgreSQL 启动；
6. 环境变量；
7. 数据库迁移；
8. 创建首个管理员；
9. 创建分类；
10. 创建 Agent；
11. 上传封面和截图；
12. 腾讯云 COS 上传压缩包；
13. 在版本记录中配置下载 URL；
14. 发布 Agent；
15. 测试命令；
16. Docker 部署；
17. Nginx 配置；
18. 数据库和媒体备份；
19. 常见问题；
20. V1 未实现功能。

---

# 25. 腾讯云 COS 人工发布流程

V1 运营人员发布一个 Agent 的标准步骤：

```text
1. 将 Agent 项目整理并打包为 ZIP
2. 文件命名包含项目名和版本号
3. 登录腾讯云 COS 控制台
4. 上传到约定目录
5. 获取 HTTPS 下载地址
6. 登录鲸创 AgentHub 管理后台
7. 创建或编辑 Agent
8. 上传封面和截图
9. 创建 AgentVersion
10. 填写版本号、更新日志、文件大小和 COS 地址
11. 发布版本
12. 发布 Agent
13. 前台检查详情和下载
```

推荐 COS 目录：

```text
agents/
└─ official/
   └─ {agent-slug}/
      ├─ v1.0.0/
      │  └─ {agent-slug}-v1.0.0.zip
      └─ v1.1.0/
         └─ {agent-slug}-v1.1.0.zip
```

文件名规则：

```text
{agent-slug}-v{version}.zip
```

示例：

```text
ecommerce-diagnosis-v1.0.0.zip
product-selling-points-v1.2.0.zip
```

---

# 26. 后续 V2 预留方向

V1 完成并稳定后，V2 再评估：

- 创作者申请；
- 用户投稿；
- 审核工作台；
- 用户直传 COS；
- 文件类型和大小限制；
- 内容安全审核；
- ZIP 扫描；
- 创作者主页；
- 评论；
- 评分；
- 排行榜；
- 官方认证；
- 付费 Agent；
- 企业定制线索；
- Redis；
- CDN；
- 独立腾讯云 PostgreSQL；
- 搜索服务。

V1 代码应避免堵死这些方向，但不要提前实现。

---

# 27. 最终交付物

Codex 最终应提交：

```text
1. 可运行的 Next.js + Payload 项目
2. PostgreSQL 数据模型和迁移
3. Payload 管理后台
4. 完整公共前台
5. 用户认证和个人中心
6. 收藏与下载记录
7. COS 外链下载流程
8. 权限和安全控制
9. 单元测试与 E2E
10. Dockerfile
11. docker-compose.yml
12. Nginx 配置示例
13. .env.example
14. README.md
15. 开发完成报告
```

---

# 28. 禁止事项

Codex 不得：

- 将 Agent 数据写死在前端；
- 使用 Mock 接口伪装完成；
- 使用虚假统计；
- 将 ZIP 存入 PostgreSQL；
- 把腾讯云密钥写到代码；
- 为 V1 开发复杂社区功能；
- 创建第二套无必要后台；
- 拆成微服务；
- 引入 Redis；
- 引入大型状态管理；
- 使用 localStorage 保存认证 Token；
- 仅通过隐藏按钮控制权限；
- 用大量 `any` 绕过类型问题；
- 为了通过构建关闭 ESLint 或 TypeScript Strict；
- 随意升级脚手架生成的核心依赖；
- 删除失败测试来假装验收通过；
- 未经说明改变本文件确定的产品范围。

---

# 29. 完成报告模板

Codex 完成后按下面格式回复：

```markdown
# FaceMini AgentHub V1 完成报告

## 已完成
- ...

## 未完成
- 功能：
- 原因：
- 影响：
- 建议：

## 关键目录
- ...

## 数据模型
- ...

## 权限实现
- ...

## 本地运行
```bash
...
```

## 创建管理员
```bash
...
```

## 腾讯云 COS 下载配置
- ...

## 测试结果
- pnpm lint：
- pnpm typecheck：
- pnpm test：
- pnpm build：
- Playwright：

## 部署方式
- ...

## 已知风险
- ...

## 下一步建议
- ...
```

---

# 30. 工具分工结论

本项目第一版本推荐：

```text
Codex：
- 初始化项目
- 数据模型
- Payload 配置
- 权限
- Route Handlers
- 用户系统
- Docker
- 测试
- 完整功能联调

Cursor：
- 第一版功能完成后的页面视觉调整
- 根据截图微调间距、字体、卡片和响应式
- 小范围组件重构
```

不要让 Codex 和 Cursor 同时在同一分支大范围修改。

建议流程：

```text
Codex 完成 V1 功能
→ 人工验收
→ 创建 Git Tag 或备份分支
→ Cursor 根据真实页面截图做 UI 精修
→ 再执行完整构建和回归测试
```
