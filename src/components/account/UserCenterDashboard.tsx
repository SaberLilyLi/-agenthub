'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Clock3, Download, FileClock, Heart, LayoutDashboard, Settings, ShieldCheck, Sparkles, Upload } from 'lucide-react'
import type { UserCenterData } from '@/lib/userCenter'

type SkillStatus = 'published' | 'pending' | 'rejected'
type MockSkill = { id: number; name: string; version: string; status: SkillStatus; submittedAt: string; reviewNote: string; downloads: number; favorites: number }

const statusMeta: Record<SkillStatus, { label: string; className: string }> = {
  published: { label: '已发布', className: 'bg-emerald-50 text-emerald-700' },
  pending: { label: '审核中', className: 'bg-amber-50 text-amber-700' },
  rejected: { label: '需修改', className: 'bg-rose-50 text-rose-700' },
}

export function UserCenterDashboard({ name, dashboard, isAdmin }: { name: string; dashboard: UserCenterData; isAdmin?: boolean }) {
  const [filter, setFilter] = useState<'all' | SkillStatus>('all')
  const mockSkills: MockSkill[] = dashboard.skills
  const skills = useMemo(() => filter === 'all' ? mockSkills : mockSkills.filter((skill) => skill.status === filter), [filter])
  const published = mockSkills.filter((skill) => skill.status === 'published').length
  const pending = mockSkills.filter((skill) => skill.status === 'pending').length
  const downloads = mockSkills.reduce((total, skill) => total + skill.downloads, 0)
  const favorites = mockSkills.reduce((total, skill) => total + skill.favorites, 0)

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 rounded-[var(--radius)] border border-[var(--border)] bg-gradient-to-br from-blue-50 via-white to-sky-50 p-6 shadow-[var(--shadow)] md:flex-row md:items-center md:justify-between md:p-8">
        <div><p className="text-sm font-medium text-[var(--brand)]">个人中心</p><h1 className="mt-2 text-3xl font-bold tracking-tight">你好，{name}</h1><p className="mt-2 text-slate-600">{isAdmin ? '管理员请到 Skill 管理台直接上传与发布。' : '查看你的 Skill 审核进度与创作数据。'}</p></div>
        {isAdmin ? (
          <Link href="/admin/collections/agents" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--brand)] px-4 text-sm font-medium text-white transition hover:bg-[var(--brand-hover)]"><Settings className="size-4" />Skill 管理台</Link>
        ) : (
          <Link href="/me/submit-skill" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--brand)] px-4 text-sm font-medium text-white transition hover:bg-[var(--brand-hover)]"><Upload className="size-4" />投稿 Skill</Link>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Sparkles} label="已发布 Skills" value={String(published)} detail="正在广场展示" />
        <Metric icon={Clock3} label="待审核" value={String(pending)} detail="可在我的 Skills 查看进度" tone="amber" />
        <Metric icon={Download} label="获得下载" value={downloads.toLocaleString()} detail="来自已发布 Skill" />
        <Metric icon={Heart} label="获得收藏" value={favorites.toLocaleString()} detail="用户收藏你的 Skill" tone="rose" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)] md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">我的 Skills</h2><p className="mt-1 text-sm text-slate-500">{isAdmin ? '管理员内容请在 Skill 管理台维护。' : '查看你的投稿、审核状态与发布数据。'}</p></div>{!isAdmin && <Link href="/me/submit-skill" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)] hover:underline">新建投稿 <ArrowRight className="size-4" /></Link>}</div>
          <div className="mt-5 flex flex-wrap gap-2" aria-label="投稿状态筛选">
            {([['all', '全部'], ['published', '已发布'], ['pending', '审核中'], ['rejected', '需修改']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={filter === value ? 'rounded-full bg-[var(--brand)] px-3 py-1.5 text-sm font-medium text-white' : 'rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]'}>{label}</button>)}
          </div>
          <div className="mt-4 divide-y divide-[var(--border)]">
            {skills.map((skill) => {
              const meta = statusMeta[skill.status]
              return <article key={skill.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{skill.name}</h3><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>{meta.label}</span></div><p className="mt-1 text-sm text-slate-500">{skill.version} · 提交于 {skill.submittedAt}</p></div>{skill.status === 'published' && <div className="flex gap-3 text-sm text-slate-500"><span className="inline-flex items-center gap-1"><Download className="size-3.5" />{skill.downloads.toLocaleString()}</span><span className="inline-flex items-center gap-1"><Heart className="size-3.5" />{skill.favorites}</span></div>}</div><p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{skill.reviewNote}</p></article>
            })}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)]"><div className="flex items-start gap-3"><span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${isAdmin || dashboard.permission.active ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}><ShieldCheck className="size-5" /></span><div><h2 className="font-bold">投稿资格</h2><p className={`mt-1 text-sm ${isAdmin || dashboard.permission.active ? 'text-emerald-700' : 'text-amber-700'}`}>{isAdmin ? '管理员无需申请投稿资格' : dashboard.permission.active ? `已开通，至 ${new Date(dashboard.permission.expiresAt!).toLocaleDateString('zh-CN')} 有效` : '尚未开通投稿资格'}</p><p className="mt-2 text-sm text-slate-500">{isAdmin ? '请直接前往 Skill 管理台上传与发布 Skill。' : dashboard.permission.active ? '可以提交新的 Skill 或新版本，提交后需等待审核。' : '请先提交投稿资格申请，审核通过后即可投稿。'}</p></div></div></section>
          <section className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)]"><h2 className="font-bold">我的快捷入口</h2><div className="mt-3 divide-y divide-[var(--border)]"><QuickLink href="/me/favorites" icon={Heart} title="我的收藏" detail="查看已收藏的 Agent" /><QuickLink href="/me/downloads" icon={Download} title="我的下载" detail="查看下载过的版本" />{isAdmin && <QuickLink href="/admin/collections/agents" icon={Settings} title="Skill 管理台" detail="直接上传与发布 Skill" />}<QuickLink href="/me" icon={LayoutDashboard} title="账户设置" detail="修改昵称和查看邮箱" /></div></section>
          <section className="rounded-[var(--radius)] bg-slate-900 p-5 text-white shadow-[var(--shadow)]"><div className="flex items-center gap-2 text-sm text-blue-200"><FileClock className="size-4" />投稿说明</div><p className="mt-2 text-sm leading-6 text-slate-200">审核被退回时，可根据审核意见完善压缩包或说明后重新提交。</p></section>
        </div>
      </section>
    </div>
  )
}

function Metric({ icon: Icon, label, value, detail, tone = 'blue' }: { icon: typeof Download; label: string; value: string; detail: string; tone?: 'blue' | 'amber' | 'rose' }) {
  const tones = { blue: 'bg-[var(--brand-soft)] text-[var(--brand)]', amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600' }
  return <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)]"><div className="flex items-center justify-between gap-3"><span className={`flex size-10 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="size-5" /></span><span className="text-2xl font-bold">{value}</span></div><p className="mt-4 font-medium">{label}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div>
}

function QuickLink({ href, icon: Icon, title, detail }: { href: string; icon: typeof Download; title: string; detail: string }) {
  return <Link href={href} className="group flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><span className="flex min-w-0 items-center gap-3"><Icon className="size-4 shrink-0 text-slate-400" /><span className="min-w-0"><span className="block text-sm font-medium">{title}</span><span className="block truncate text-xs text-slate-500">{detail}</span></span></span><ArrowRight className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)]" /></Link>
}
