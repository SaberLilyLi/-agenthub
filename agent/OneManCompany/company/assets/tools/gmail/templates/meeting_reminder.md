---
name: 会议提醒
description: 通知同事参加即将开始的会议
variables:
  - name: recipient
    label: 收件人
  - name: meeting_time
    label: 会议时间
  - name: meeting_topic
    label: 会议主题
  - name: location
    label: 会议地点
    default: 线上
---

主题：会议提醒：{{meeting_topic}} — {{meeting_time}}

你好，{{recipient}}：

提醒你于 {{meeting_time}} 参加“{{meeting_topic}}”会议。

地点：{{location}}

请准时参加，并提前准备相关议题。

此致
