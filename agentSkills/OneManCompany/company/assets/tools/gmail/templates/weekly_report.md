---
name: 周报
description: 每周工作汇报邮件
variables:
  - name: recipient
    label: 收件人
  - name: week_number
    label: 周次
  - name: accomplishments
    label: 本周完成
  - name: next_week_plan
    label: 下周计划
  - name: blockers
    label: 阻塞问题
    default: 暂无
---

主题：第 {{week_number}} 周工作总结

你好，{{recipient}}：

## 本周完成
{{accomplishments}}

## 下周计划
{{next_week_plan}}

## 阻塞问题
{{blockers}}

此致
