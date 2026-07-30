'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { csrfHeaders } from '@/lib/client/csrf'

const loginSchema = z.object({
  email: z.string().min(1, '请输入邮箱').email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少 8 位'),
})

type FieldErrors = { email?: string; password?: string }

export default function LoginPage() {
  const router = useRouter()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setServerError('')
    const parsed = loginSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)))
    if (!parsed.success) {
      const errors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if ((field === 'email' || field === 'password') && !errors[field]) {
          errors[field] = issue.message
        }
      }
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(parsed.data),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null
        setServerError(data?.message ?? '登录失败，请稍后重试')
        return
      }
      toast.success('登录成功')
      const from = new URLSearchParams(window.location.search).get('from')
      const target = from && from.startsWith('/') && !from.startsWith('//') ? from : '/agents'
      router.push(target)
      router.refresh()
    } catch {
      setServerError('网络异常，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    'h-11 w-full rounded-lg border border-[var(--border)] bg-white pl-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]'

  return (
    <div className="relative flex min-h-[calc(100vh-240px)] items-center justify-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-4 h-64 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--brand-soft),transparent)] blur-2xl"
      />
      <div className="relative w-full max-w-[400px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-tight">
            FaceMini <span className="text-[var(--brand)]">AgentHub</span>
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">欢迎回来</h1>
          <p className="mt-2 text-sm text-slate-500">登录以继续使用鲸创 AgentHub</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {serverError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-[var(--danger)]">
              {serverError}
            </p>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              邮箱
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`${inputClass} pr-3`}
                onChange={() => setFieldErrors((e) => ({ ...e, email: undefined }))}
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-[var(--danger)]">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
              密码
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="至少 8 位"
                className={`${inputClass} pr-11`}
                onChange={() => setFieldErrors((e) => ({ ...e, password: undefined }))}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1.5 text-xs text-[var(--danger)]">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] text-sm font-medium text-white transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting ? '登录中…' : '登录'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">账号由管理员统一创建和配置。</p>
      </div>
    </div>
  )
}
