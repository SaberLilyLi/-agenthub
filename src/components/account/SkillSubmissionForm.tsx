'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { csrfHeaders } from '@/lib/client/csrf'
import { MAX_SKILL_FILE_LABEL } from '@/lib/uploadLimits'

type Category = { id: number; name: string }

export function SkillSubmissionForm({ categories }: { categories: Category[] }) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(form: FormData) {
    setSubmitting(true)
    setMessage('')
    try {
      const response = await fetch('/api/skills/submit', { method: 'POST', headers: csrfHeaders(), body: form })
      const body = await response.json()
      setMessage(body.message || '提交失败，请稍后重试')
      if (response.ok) document.querySelector<HTMLFormElement>('#skill-submission-form')?.reset()
    } finally {
      setSubmitting(false)
    }
  }

  return <form id="skill-submission-form" action={submit} className="mt-8 space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow)]">
    <label className="block text-sm font-medium">Skill 名称<Input className="mt-2" name="name" required /></label>
    <label className="block text-sm font-medium">Slug<Input className="mt-2" name="slug" placeholder="meeting-action-organizer" pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label>
    <label className="block text-sm font-medium">简介（180 字以内）<Textarea className="mt-2" name="summary" maxLength={180} required /></label>
    <label className="block text-sm font-medium">详细介绍<Textarea className="mt-2" name="description" /></label>
    <label className="block text-sm font-medium">分类<select name="category" className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required defaultValue=""><option value="" disabled>请选择分类</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    <label className="block text-sm font-medium">标签（用逗号分隔）<Input className="mt-2" name="tags" placeholder="会议, 效率工具" /></label>
    <label className="block text-sm font-medium">版本号<Input className="mt-2" name="version" placeholder="1.0.0" pattern="\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?" required /></label>
    <label className="block text-sm font-medium">更新说明<Textarea className="mt-2" name="changelog" /></label>
    <label className="block text-sm font-medium">Skill 压缩包（最大 {MAX_SKILL_FILE_LABEL}）<Input className="mt-2" name="file" type="file" accept=".zip,application/zip,.rar,application/vnd.rar" required /></label>
    <Button disabled={submitting}>{submitting ? '提交中…' : '提交审核'}</Button>
    {message && <p className="text-sm text-slate-600">{message}</p>}
  </form>
}
