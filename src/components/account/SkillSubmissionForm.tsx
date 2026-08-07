'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { csrfHeaders } from '@/lib/client/csrf'
import { MAX_SKILL_FILE_BYTES, MAX_SKILL_FILE_LABEL } from '@/lib/uploadLimits'

type Category = { id: number; name: string }
type FieldErrors = Partial<Record<'name' | 'slug' | 'summary' | 'category' | 'version' | 'file' | 'form', string>>

const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const validVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

function RequiredMark() {
  return <span className="ml-1 text-rose-600" aria-hidden="true">*</span>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-sm text-rose-600" role="alert">{message}</p>
}

function validateForm(form: FormData): FieldErrors {
  const errors: FieldErrors = {}
  const name = String(form.get('name') || '').trim()
  const slug = String(form.get('slug') || '').trim()
  const summary = String(form.get('summary') || '').trim()
  const category = String(form.get('category') || '').trim()
  const version = String(form.get('version') || '').trim()
  const file = form.get('file')

  if (!name) errors.name = '请填写 Skill 名称'
  if (!slug) errors.slug = '请填写标识'
  else if (!validSlug.test(slug)) errors.slug = '标识仅支持小写字母、数字和连字符，例如 meeting-action-organizer'
  if (!summary) errors.summary = '请填写简介'
  else if (summary.length > 180) errors.summary = '简介不能超过 180 字'
  if (!category) errors.category = '请选择分类'
  if (!version) errors.version = '请填写版本号'
  else if (!validVersion.test(version)) errors.version = '版本号格式应为 x.y.z，例如 1.0.0'
  if (!(file instanceof File) || file.size === 0) errors.file = '请上传 Skill 压缩包'
  else if (file.size > MAX_SKILL_FILE_BYTES) errors.file = `压缩包不能超过 ${MAX_SKILL_FILE_LABEL}`
  else if (!/\.(zip|rar)$/i.test(file.name)) errors.file = '仅支持 ZIP 或 RAR 压缩包'

  return errors
}

export function SkillSubmissionForm({ categories }: { categories: Category[] }) {
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function submit(form: FormData) {
    const nextErrors = validateForm(form)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      setMessage('请先完善必填项后再提交')
      return
    }

    setSubmitting(true)
    setErrors({})
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

  return (
    <form
      id="skill-submission-form"
      action={submit}
      noValidate
      className="mt-8 space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow)]"
      onChange={() => {
        if (message === '请先完善必填项后再提交') setMessage('')
      }}
    >
      <p className="text-sm text-slate-500">标有 <span className="text-rose-600">*</span> 的为必填项，保存前会先校验。</p>

      <label className="block text-sm font-medium">
        Skill 名称<RequiredMark />
        <Input className="mt-2" name="name" placeholder="请输入 Skill 名称" aria-invalid={Boolean(errors.name)} />
        <FieldError message={errors.name} />
      </label>

      <label className="block text-sm font-medium">
        标识<RequiredMark />
        <Input className="mt-2" name="slug" placeholder="例如 meeting-action-organizer" aria-invalid={Boolean(errors.slug)} />
        <FieldError message={errors.slug} />
      </label>

      <label className="block text-sm font-medium">
        简介（180 字以内）<RequiredMark />
        <Textarea className="mt-2" name="summary" maxLength={180} placeholder="请用一句话介绍该 Skill" aria-invalid={Boolean(errors.summary)} />
        <FieldError message={errors.summary} />
      </label>

      <label className="block text-sm font-medium">
        详细介绍
        <Textarea className="mt-2" name="description" placeholder="可选，补充功能说明与使用场景" />
      </label>

      <label className="block text-sm font-medium">
        分类<RequiredMark />
        <select
          name="category"
          className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          defaultValue=""
          aria-invalid={Boolean(errors.category)}
        >
          <option value="" disabled>请选择分类</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <FieldError message={errors.category} />
      </label>

      <label className="block text-sm font-medium">
        标签（用逗号分隔）
        <Input className="mt-2" name="tags" placeholder="会议, 效率工具" />
      </label>

      <label className="block text-sm font-medium">
        版本号<RequiredMark />
        <Input className="mt-2" name="version" placeholder="例如 1.0.0" aria-invalid={Boolean(errors.version)} />
        <FieldError message={errors.version} />
      </label>

      <label className="block text-sm font-medium">
        更新说明
        <Textarea className="mt-2" name="changelog" placeholder="可选，说明本版本改动" />
      </label>

      <label className="block text-sm font-medium">
        Skill 压缩包（最大 {MAX_SKILL_FILE_LABEL}）<RequiredMark />
        <Input className="mt-2" name="file" type="file" accept=".zip,application/zip,.rar,application/vnd.rar" aria-invalid={Boolean(errors.file)} />
        <FieldError message={errors.file} />
      </label>

      <Button disabled={submitting}>{submitting ? '提交中…' : '提交审核'}</Button>
      {message && (
        <p className={`text-sm ${message.includes('完善必填') || message.includes('失败') ? 'text-rose-600' : 'text-slate-600'}`}>
          {message}
        </p>
      )}
    </form>
  )
}
