'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { csrfHeaders } from '@/lib/client/csrf'

export default function AdminUpload() {
  const [message, setMessage] = useState('')

  async function submit(form: FormData) {
    const response = await fetch('/api/admin/cos/upload', { method: 'POST', headers: csrfHeaders(), body: form })
    const body = await response.json()
    setMessage(response.ok ? `上传并发布成功：${body.downloadUrl}` : body.message)
  }

  return (
    <section className="max-w-xl">
      <h1 className="text-3xl font-bold">上传并发布 Agent 文件</h1>
      <p className="mt-3 text-slate-600">仅管理员可用。文件上传至 COS 后，系统会自动创建或更新已发布版本，并在 Agent 详情页显示下载按钮。</p>
      <form action={submit} className="mt-8 space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-white p-6">
        <label className="block text-sm font-medium">Agent slug<Input className="mt-2" name="agentSlug" placeholder="ecommerce-diagnosis" required /></label>
        <label className="block text-sm font-medium">版本号<Input className="mt-2" name="version" placeholder="1.0.0" required /></label>
        <label className="block text-sm font-medium">更新说明<Textarea className="mt-2" name="changelog" placeholder="例如：新增客户跟进邮件模板。" /></label>
        <label className="block text-sm font-medium">Skill 压缩包（最大 20 MB）<Input className="mt-2" name="file" type="file" accept=".zip,application/zip,.rar,application/vnd.rar" required /></label>
        <Button>上传并发布</Button>
        {message && <p className="break-all text-sm text-slate-600">{message}</p>}
      </form>
    </section>
  )
}
