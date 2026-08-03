'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { csrfHeaders } from '@/lib/client/csrf'

export default function AdminUpload() {
  const [message, setMessage] = useState('')

  async function submit(form: FormData) {
    const response = await fetch('/api/admin/skills/upload', { method: 'POST', headers: csrfHeaders(), body: form })
    const body = await response.json()
    setMessage(response.ok ? `上传并发布成功：${body.downloadUrl}` : body.message)
  }

  return (
    <section className="max-w-xl">
      <h1 className="text-3xl font-bold">提交 Agent 文件审核</h1>
      <p className="mt-3 text-slate-600">文件保存到服务器本地，管理员审核通过后才会发布版本。</p>
      <form action={submit} className="mt-8 space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-white p-6">
        <label className="block text-sm font-medium">Agent ID<Input className="mt-2" name="agentId" inputMode="numeric" placeholder="例如：12" required /></label>
        <label className="block text-sm font-medium">版本号<Input className="mt-2" name="version" placeholder="1.0.0" required /></label>
        <label className="block text-sm font-medium">更新说明<Textarea className="mt-2" name="changelog" placeholder="例如：新增客户跟进邮件模板。" /></label>
        <label className="block text-sm font-medium">Skill 压缩包（最大 20 MB）<Input className="mt-2" name="file" type="file" accept=".zip,application/zip,.rar,application/vnd.rar" required /></label>
        <Button>保存到本地并提交审核</Button>
        {message && <p className="break-all text-sm text-slate-600">{message}</p>}
      </form>
    </section>
  )
}
