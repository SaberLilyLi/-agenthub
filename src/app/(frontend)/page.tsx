import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Bot,
  Download,
  FolderKanban,
  History,
  Mail,
  MessagesSquare,
  Search,
} from 'lucide-react'

import { AgentListItem } from '@/components/agent/AgentListItem'
import { CategoryCard } from '@/components/agent/CategoryCard'
import { FeaturedCarousel } from '@/components/agent/FeaturedCarousel'
import { getCategorySummaries, getHomeStats, getLatestVersionMap, getPayloadClient, toCardData } from '@/lib/agentQueries'
import { formatCount } from '@/lib/format'

export default async function Home() {
  const payload = await getPayloadClient()

  const categories = await getCategorySummaries(payload)
  const activeCategories = categories.filter((category) => category.count > 0)
  const hotKeywords = [...activeCategories].sort((a, b) => b.count - a.count).slice(0, 4)

  const [featured, latest] = await Promise.all([
    payload.find({
      collection: 'agents',
      where: { and: [{ status: { equals: 'published' } }, { featured: { equals: true } }] },
      limit: 8,
      sort: '-publishedAt',
      depth: 1,
    }),
    payload.find({
      collection: 'agents',
      where: { status: { equals: 'published' } },
      limit: 6,
      sort: '-publishedAt',
      depth: 1,
    }),
  ])

  const agentIds = [...new Set([...featured.docs, ...latest.docs].map((agent) => agent.id))]
  const versions = await getLatestVersionMap(payload, agentIds)
  const stats = await getHomeStats(payload, categories)

  const featuredCards = featured.docs.map((agent) => toCardData(agent, versions))
  const latestCards = latest.docs.map((agent) => toCardData(agent, versions))

  const statItems = [
    { icon: Bot, value: String(stats.agentCount), label: '已发布 Agent' },
    { icon: Download, value: formatCount(stats.totalDownloads), label: '累计使用' },
    { icon: FolderKanban, value: String(stats.activeCategories), label: '覆盖分类' },
    { icon: History, value: String(stats.recentUpdates), label: '近 30 天更新' },
  ]

  return (
    <>
      {/* Hero 搜索区 */}
      <section className="relative overflow-hidden rounded-[var(--radius)] bg-gradient-to-br from-blue-50 via-white to-sky-50 px-6 py-10 md:px-10">
        <div className="relative z-10 max-w-xl">
          <p className="text-sm font-medium text-[var(--brand)]">官方 Agent 广场</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            发现真正好用的 <span className="text-[var(--brand)]">Agent</span>
          </h1>
          <p className="mt-3 text-slate-600">精选优质智能体，解决实际业务问题，让 AI 真正为你所用。</p>

          <form action="/agents" className="mt-6 flex items-center gap-2 rounded-[10px] bg-white p-2 shadow-[var(--shadow)] ring-1 ring-[var(--border)]">
            <Search className="ml-2 size-4 shrink-0 text-slate-400" />
            <input
              type="search"
              name="q"
              placeholder="搜索 Agent、功能或使用场景"
              className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="h-9 shrink-0 rounded-lg bg-[var(--brand)] px-5 text-sm font-medium text-white transition hover:bg-[var(--brand-hover)]"
            >
              搜索
            </button>
          </form>

          {hotKeywords.length > 0 && (
            <p className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm text-slate-500">
              热门搜索：
              {hotKeywords.map((category, index) => (
                <span key={category.id} className="flex items-center">
                  {index > 0 && <span className="mx-1.5 text-slate-300">|</span>}
                  <Link href={`/agents?category=${category.slug}`} className="transition hover:text-[var(--brand)]">
                    {category.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>

        {/* 轻量 CSS 图形，不依赖图片素材 */}
        <div className="pointer-events-none absolute inset-y-0 right-10 hidden w-72 items-center justify-center lg:flex" aria-hidden>
          <div className="relative">
            <div className="flex size-44 rotate-6 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-400 shadow-2xl shadow-blue-200">
              <Bot className="size-20 text-white/90" />
            </div>
            <div className="absolute -left-20 -top-2 flex -rotate-3 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-lg ring-1 ring-[var(--border)]">
              <MessagesSquare className="size-4 text-blue-500" />
              会议纪要
            </div>
            <div className="absolute -bottom-4 -left-14 flex rotate-2 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-lg ring-1 ring-[var(--border)]">
              <Mail className="size-4 text-violet-500" />
              邮件助手
            </div>
            <div className="absolute -right-10 top-16 flex rotate-3 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-lg ring-1 ring-[var(--border)]">
              <BarChart3 className="size-4 text-emerald-500" />
              数据分析
            </div>
          </div>
        </div>
      </section>

      {/* 统计条：全部来自真实数据 */}
      <section className="mt-6 grid grid-cols-2 gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-white px-6 py-5 shadow-[var(--shadow)] md:grid-cols-4">
        {statItems.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-[var(--brand-soft)]">
              <Icon className="size-5 text-[var(--brand)]" />
            </span>
            <span>
              <span className="block text-xl font-bold leading-6">{value}</span>
              <span className="block text-xs text-slate-500">{label}</span>
            </span>
          </div>
        ))}
      </section>

      {/* 分类入口 */}
      {activeCategories.length > 0 && (
        <nav className="mt-8 flex items-center gap-2 overflow-x-auto pb-1">
          <Link
            href="/agents"
            className="shrink-0 rounded-full bg-[var(--brand)] px-4 py-1.5 text-sm font-medium text-white"
          >
            全部
          </Link>
          {activeCategories.map((category) => (
            <Link
              key={category.id}
              href={`/agents?category=${category.slug}`}
              className="shrink-0 rounded-full px-4 py-1.5 text-sm text-slate-600 transition hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
            >
              {category.name}
            </Link>
          ))}
        </nav>
      )}

      {/* 官方精选 */}
      {featuredCards.length > 0 && (
        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">官方精选</h2>
              <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-xs font-medium text-[var(--brand)]">编辑推荐</span>
            </div>
            <Link href="/agents?sort=featured" className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-[var(--brand)]">
              查看更多
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <FeaturedCarousel agents={featuredCards} />
        </section>
      )}

      {/* 最近更新 */}
      {latestCards.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-xl font-bold">最近更新</h2>
            <Link href="/agents?sort=latest" className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-[var(--brand)]">
              查看更多
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {latestCards.map((agent) => (
              <AgentListItem key={agent.id} agent={agent} />
            ))}
          </div>
        </section>
      )}

      {/* 热门分类 */}
      {activeCategories.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-xl font-bold">热门分类</h2>
            <Link href="/agents" className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-[var(--brand)]">
              探索更多分类
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {activeCategories.slice(0, 8).map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
