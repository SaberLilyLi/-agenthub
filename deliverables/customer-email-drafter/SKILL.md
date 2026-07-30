---
name: customer-email-drafter
description: 使用已安装的 QQ 邮箱、网易邮箱、Gmail、Outlook 或其他邮件连接器读取客户邮件、生成专业回复并在规则允许时发送。适用于客户询盘、跟进、会议邀约、进度同步、投诉、报价和催办；支持用户明确要求时使用自建 IMAP/SMTP 配置。
---

# 客户邮件自动收发助手

负责识别客户邮件意图、风险和回复策略；邮件收发优先交给当前环境中已授权的邮箱专家技能/连接器。

## 先选择收发方式

1. 检查当前任务已启用的邮件专家技能或连接器。
2. 若已有已授权连接器（例如 QQ 邮箱），默认使用它读取、查看和发送邮件。不要创建虚拟环境、不要生成本地配置、不要假设 `C:\secure` 或其他路径、不要调用或修改本 Skill 的脚本。
3. 若存在多个已授权邮箱，先让用户选择发件账号；若只有一个则说明将使用该账号。
4. 只有用户明确说“自建 IMAP/SMTP”“不用现有连接器”或当前没有任何可用连接器时，才进入“自建模式”。
5. 绝不声称已读取、发送、创建环境、写入配置或修复脚本，除非对应工具调用已经返回成功结果。

## 连接器模式（默认）

1. 读取用户指定范围的邮件；未指定时最多读取最近 3 封未读邮件。
2. 使用连接器返回的实际发件人、主题、正文和线程信息；HTML 邮件需提取可读正文，不能因缺少纯文本部分而视为正文为空。
3. 对每封邮件先输出 `邮件状态`、`客户诉求`、`风险`、`建议动作`；默认只生成草稿，不发送。
4. 用户明确确认某封草稿后，使用同一连接器回复原发件人，并报告工具返回的发送状态。平台营销、账单通知、发票和订阅邮件默认“不回复”，除非用户另有要求。

## 自建模式（仅明确请求时）

自建模式才可使用 `scripts/setup_mail_environment.py` 与 `scripts/email_bridge.py`。先询问用户选择 `qq`、`netease-163`、`netease-126`、`gmail`、`outlook` 或自定义企业邮箱；缺少运行环境时才创建隔离虚拟环境。

授权码/应用专用密码必须由用户在邮箱官方后台生成并保存到 WorkBuddy 安全凭据 `MAIL_APP_PASSWORD`。不得生成、索取、展示、复述或写入聊天、日志或配置文件。Gmail、Microsoft 365 优先使用 OAuth/官方连接器。

自建模式仅在用户已授权脚本执行和网络访问时运行。首次初始化时，脚本默认将**非敏感配置**保存到 WorkBuddy 用户数据目录：Windows 为 `%LOCALAPPDATA%\WorkBuddy\customer-email-drafter\mail-config.json`；也可通过 `WORKBUDDY_DATA_DIR` 指定根目录。后续新会话先执行 `inspect`；如 `config_ready: true`，直接复用配置，不再重复询问邮箱地址、服务商和服务器参数。`auto_send` 默认 `false`。

```powershell
# 首次配置：默认保存到 WorkBuddy 用户数据目录
python scripts/setup_mail_environment.py init --provider gmail --email sales@example.com

# 新会话：检查并复用已保存的非敏感配置
python scripts/setup_mail_environment.py inspect
python scripts/setup_mail_environment.py show

# 读取或发送时可省略 --config，桥接脚本会使用同一持久化配置
python scripts/email_bridge.py poll --limit 10
```

持久化配置只保存邮箱地址、服务商、IMAP/SMTP 参数、白名单与日志位置；授权码仍只从 WorkBuddy 安全凭据 `MAIL_APP_PASSWORD` 读取，绝不写入本地文件。若 WorkBuddy 切换到不同设备、不同用户或隔离沙箱，需重新配置或设置一致的 `WORKBUDDY_DATA_DIR`。

### 自建模式的搜索与过滤

使用 `poll` 检索邮件时，默认只读取未读且未处理过的邮件。可按需增加以下过滤条件：

```powershell
# 搜索指定发件人的未读邮件
python scripts/email_bridge.py --config <config> poll --from customer@example.com

# 搜索主题包含“报价”的全部历史邮件；--all 不受历史去重状态限制
python scripts/email_bridge.py --config <config> poll --all --subject 报价 --limit 20

# 搜索指定日期及之后、来自某客户的全部邮件
python scripts/email_bridge.py --config <config> poll --all --from customer@example.com --since 2026-07-01

# 搜索 7 月 1 日（含）至 8 月 1 日（不含）的邮件
python scripts/email_bridge.py --config <config> poll --all --since 2026-07-01 --before 2026-08-01
```

`--from` 使用 IMAP 发件人条件，`--subject` 在读取后按主题关键字筛选，`--since` 为起始日（含），`--before` 为结束日（不含），日期均使用 `YYYY-MM-DD`。搜索只读，不会把邮件标为已读；`--all` 仅用于用户明确要求检索历史邮件时使用。

## 自动发送规则

只自动发送已批准模板的预约确认、资料发送和简单跟进，且必须匹配同一邮件线程与用户设置的收件人白名单。

报价/折扣、付款/退款、合同/法律、个人或敏感信息、投诉、威胁升级、交期或赔偿承诺、新联系人群发、意图不明邮件，以及包含“紧急”“投诉”“退款”“法务”的邮件，一律转人工确认，不得自动发送。

## 回复规范

主题不超过 25 个汉字。开头说明联系原因，结尾明确下一步；不得编造姓名、价格、库存、交期、合同条款或承诺。简短模式正文不超过 150 字。

## 结构化输出（email_analysis.json / reply_draft.json）

除回复草稿外，每次分析邮件时**必须**同时产出结构化 JSON，供未来"统一行政事项中心"直接消费。

### email_analysis.json

```json
{
  "sourceType": "email",
  "messageId": "原始 Message-ID 或本地演示ID",
  "threadId": "线程ID或 null",
  "from": "发件人",
  "subject": "主题",
  "intent": "inquiry | followup | complaint | quote | urging | other",
  "riskLevel": "low | medium | high",
  "recommendedAction": "建议动作",
  "draftReply": "回复草稿",
  "requiresHumanConfirmation": true
}
```

### reply_draft.json

```json
{
  "reply": "回复草稿正文",
  "subject": "Re: 原主题"
}
```

字段约束：
- `intent`：询盘=inquiry、跟进=followup、投诉=complaint、报价=quote、催办=urging、无法判断=other。
- `riskLevel`：包含报价/折扣/付款/退款/合同/法务/法律/敏感/隐私/投诉/紧急/赔偿/违约等关键词为 `high`；包含确认/协调/审批/申请等为 `medium`；其余为 `low`。
- `requiresHumanConfirmation`：**始终为 `true`**——所有回复草稿均需人工确认后才可发送。
- `draftReply`：不得编造姓名、价格、库存、交期、合同条款或承诺；无法确定的信息用 `[待补充]` 占位。
- `messageId`：连接器模式取真实 Message-ID；演示模式取本地演示 ID（如 `demo-001`）。

### 辅助脚本

提供 `scripts/analyze_email.py`（纯标准库，无需安装依赖），可从邮件字段或演示数据中自动分类意图与风险并生成 `email_analysis.json` 和 `reply_draft.json`：

```
# 从 CLI 参数生成，写入本地输出目录
python scripts/analyze_email.py --from "王倩 <w@example.com>" --subject "确认演示时间" --body "..." --output-dir ./输出目录

# 使用 mock-inbox.json 中的演示邮件
python scripts/analyze_email.py --demo-id 102 --output-dir ./输出目录

# 从 JSON 文件读取
python scripts/analyze_email.py --input email.json

# 从标准输入读取，仅输出到对话（不写文件）
cat email.json | python scripts/analyze_email.py
```

使用 `--output-dir` 时，`email_analysis.json` 和 `reply_draft.json` 写入该目录；**未指定时仅打印到标准输出，不写入任何文件、数据库或远程服务。**

LLM 生成分析后，可运行该脚本作为结构化输出的基线，也可在脚本结果基础上人工补充和修正；但最终交付的 JSON 必须符合上述 schema。

## 安全规则摘要

- 无凭据不转写、不读取真实邮箱、不自动发送邮件。
- 连接器模式仅在配置已存在且连接成功时读取邮件；未配置时清晰提示，不创建虚拟环境、不索取密码、不伪造邮件数据。
- 演示模式（粘贴邮件内容）无需任何凭据即可使用。
- 对报价、付款、退款、合同、法律、敏感信息、投诉、紧急请求等高风险邮件，`riskLevel` 必须为 `high`，`requiresHumanConfirmation` 必须为 `true`，仅生成草稿并强制人工确认。
- 邮件发送默认禁止自动执行，必须由用户在页面或对话中明确确认后才可发送。

## 示例任务

> 使用 $customer-email-drafter 和当前已授权的 QQ 邮箱连接器读取最近 3 封未读邮件。只生成处理建议和草稿，不创建本地环境或配置，也不要发送邮件。

> 使用 $customer-email-drafter 分析以下粘贴的邮件内容，生成 email_analysis.json 和 reply_draft.json，输出到 ./邮件产物 目录。请勿编造价格或承诺。
