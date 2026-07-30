'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { csrfHeaders } from '@/lib/client/csrf'

export function SkillUploadPermissionRequest() {
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    try {
      const response = await fetch('/api/skills/request-upload-permission', { method: 'POST', headers: { 'content-type': 'application/json', ...csrfHeaders() }, body: JSON.stringify({ reason }) })
      const body = await response.json()
      setMessage(body.message || '申请提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="mt-8 rounded-[var(--radius)] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow)]"><h2 className="text-lg font-semibold">申请上传权限</h2><p className="mt-2 text-sm text-slate-600">普通用户不能直接上传 Skill。请提交申请，管理员审核通过后将为你的账户开放投稿入口。</p><label className="mt-5 block text-sm font-medium">申请说明（可选）<Textarea className="mt-2" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} /></label><Button className="mt-5" onClick={submit} disabled={submitting}>{submitting ? '提交中…' : '申请上传权限'}</Button>{message && <p className="mt-3 text-sm text-slate-600">{message}</p>}</div>
}
