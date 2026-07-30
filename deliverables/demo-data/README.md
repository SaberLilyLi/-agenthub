# 演示数据使用说明

## 数据概览

本目录包含「会议纪要助手」和「客户邮件助手」的完整演示数据，模拟一家 B2B SaaS 公司（鲸创科技）的真实业务场景。

### 会议纪要演示数据

| 文件 | 场景 | 说明 |
|------|------|------|
| `meeting_01_product_launch.txt` | 产品发布评审会 | 6 人参会，含决策/行动项/风险/待确认/紧急事项，纯文本格式 |
| `meeting_02_project_sync_chat.json` | 项目双周同步群聊 | 5 人群聊，JSON 格式，含 12 条消息，覆盖多模块进度同步 |
| `meeting_03_complaint_handling.txt` | 客户投诉处理专项会 | 5 人参会，P1 事故处理，含合同/法务/赔偿等高风险内容 |

### 客户邮件演示数据

| 文件 | 意图 | 风险 | 说明 |
|------|------|------|------|
| `email_mock_inbox.json` | 全部 | 混合 | 完整模拟收件箱，10 封邮件，覆盖所有意图类型 |
| `email_01_inquiry.json` | inquiry（询盘） | low | 200 人企业咨询产品功能和演示 |
| `email_07_followup.json` | followup（跟进） | low | 金茂集团跟进报价方案细节 |
| `email_02_quote.json` | quote（报价） | high | 鼎信科技 100 人采购，含 SLA 和合同条款 |
| `email_03_complaint.json` | complaint（投诉） | high | 鼎信科技 P1 投诉，含赔偿和法律威胁 |
| `email_04_urging.json` | urging（催办） | high | 华润置业催促数据迁移方案 |
| `email_05_refund.json` | complaint（退款） | high | 永达物流申请退款，涉及合同争议 |
| `email_06_partnership.json` | other（其他） | low | 中信咨询探讨集成合作 |

## 使用方法

### 会议纪要助手

```bash
# 场景1：纯文本会议记录 → 生成行动项
python scripts/build_action_items.py demo-data/meeting_01_product_launch.txt \
  --title "智能客服V2.0发布评审会" \
  --meeting-at "2026-07-24 14:00" \
  --attendees "张伟,李明,王倩,陈晨,赵强,刘洋" \
  --source-reference "meeting-001" \
  --output-dir ./output

# 场景2：群聊 JSON → 生成行动项
python scripts/build_action_items.py demo-data/meeting_02_project_sync_chat.json \
  --title "Q3项目双周同步" \
  --attendees "张伟,李明,王倩,陈晨,赵强,刘洋" \
  --source-reference "meeting-002" \
  --output-dir ./output

# 场景3：投诉处理会 → 生成行动项
python scripts/build_action_items.py demo-data/meeting_03_complaint_handling.txt \
  --title "客户投诉处理与质量改进专项会" \
  --meeting-at "2026-07-24 10:00" \
  --attendees "孙磊,赵强,李明,周婷,黄海" \
  --source-reference "meeting-003" \
  --output-dir ./output
```

### 客户邮件助手

```bash
# 方式1：使用模拟收件箱中的邮件
python scripts/analyze_email.py --demo-id "201" --output-dir ./output
python scripts/analyze_email.py --demo-id "203" --output-dir ./output
python scripts/analyze_email.py --demo-id "204" --output-dir ./output

# 方式2：使用独立 JSON 文件
python scripts/analyze_email.py --input demo-data/email_01_inquiry.json --output-dir ./output
python scripts/analyze_email.py --input demo-data/email_03_complaint.json --output-dir ./output

# 方式3：直接传参（演示模式）
python scripts/analyze_email.py \
  --from "吴芳 <wufang@haoyuan-tech.com>" \
  --subject "想了解智能客服产品的功能和价格" \
  --body "我们公司大约有200人，想了解产品功能和价格，能否安排演示？" \
  --output-dir ./output
```

## 业务场景背景

鲸创科技是一家 B2B SaaS 公司，核心产品「智能客服平台」服务于中大型企业。当前正处于 V2.0 版本发布关键期，同时处理多条客户线索和既有客户的服务保障。

关键客户：
- **鼎信科技**：重点客户，正采购 100 人企业版，同时遭遇系统宕机投诉
- **金茂集团**：意向客户，50 人企业版报价跟进中，要求提供数据迁移方案
- **华润置业**：既有客户，催促数据迁移方案，有流失风险
- **永达物流**：既有客户，项目暂停申请退款
- **浩源科技**：新线索，200 人企业咨询产品
- **长河制造**：新线索，制造业场景咨询
- **中信咨询**：合作意向，集成合作探讨

## 数据特征

- 所有时间线设定在 2026-07-24（同一天），模拟一个繁忙工作日
- 会议和邮件之间存在业务关联（如鼎信科技的投诉同时出现在会议和邮件中）
- 每组数据覆盖不同风险等级：low / medium / high
- 高风险场景涉及报价、合同、法务、赔偿、退款、投诉等敏感内容
- 所有数据均为虚构，不涉及真实公司或个人信息
