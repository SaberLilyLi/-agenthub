import Link from 'next/link'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

import { AgentCardList } from '@/components/agent/AgentCardList'
import { FilterBar, buildAgentsHref } from '@/components/agent/FilterBar'
import { EmptyState } from '@/components/common/EmptyState'
import { findPublishedAgents, getCategorySummaries, getLatestVersionMap, getPayloadClient, toCardData } from '@/lib/agentQueries'
import { cn } from '@/utilities/ui'

type Search = { q?: string; category?: string; sort?: string; page?: string }

const SORTS = ['featured', 'latest', 'downloads'] as const
const PAGE_SIZE = 12

export default async function Agents({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams
  const payload = await getPayloadClient()

  const page = Math.max(1, Number(query.page) || 1)
  const sort = SORTS.includes(query.sort as (typeof SORTS)[number]) ? (query.sort as (typeof SORTS)[number]) : 'latest'

  const [categories, result] = await Promise.all([
    getCategorySummaries(payload),
    findPublishedAgents(payload, { q: query.q, categorySlug: query.category, sort, page, limit: PAGE_SIZE }),
  ])
  const versions = await getLatestVersionMap(
    payload,
    result.docs.map((agent) => agent.id),
  )
  const cards = result.docs.map((agent) => toCardData(agent, versions))
  const activeCategories = categories.filter((category) => category.count > 0)

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Agent 广场</h1>
        <p className="mt-2 text-slate-600">发现并安装适合你的 Agent 和 Skill</p>
      </div>

      <form action="/agents" className="mb-4 flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-white p-2 shadow-[var(--shadow)]">
        <Search className="ml-2 size-4 shrink-0 text-slate-400" />
        <input
          type="search"
          name="q"
          defaultValue={query.q}
          placeholder="搜索 Agent、功能或使用场景"
          className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        {query.category && <input type="hidden" name="category" value={query.category} />}
        {sort !== 'latest' && <input type="hidden" name="sort" value={sort} />}
        <button
          type="submit"
          className="h-9 shrink-0 rounded-lg bg-[var(--brand)] px-5 text-sm font-medium text-white transition hover:bg-[var(--brand-hover)]"
        >
          搜索
        </button>
      </form>

      <FilterBar categories={activeCategories} current={{ q: query.q, category: query.category, sort }} totalDocs={result.totalDocs} />

      <div className="mt-5">
        {cards.length ? (
          <>
            <AgentCardList agents={cards} />
            {result.totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-3 text-sm">
                <PageLink
                  href={buildAgentsHref({ q: query.q, category: query.category, sort, page: String(page - 1) })}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="size-4" />
                  上一页
                </PageLink>
                <span className="text-slate-500">
                  第 {result.page} / {result.totalPages} 页
                </span>
                <PageLink
                  href={buildAgentsHref({ q: query.q, category: query.category, sort, page: String(page + 1) })}
                  disabled={page >= result.totalPages}
                >
                  下一页
                  <ChevronRight className="size-4" />
                </PageLink>
              </nav>
            )}
          </>
        ) : (
          <EmptyState
            title="没有找到匹配的 Agent"
            description={query.q || query.category ? '请更换关键词或调整筛选条件。' : '鲸创正在整理第一批实用智能体应用。'}
            action={
              query.q || query.category ? (
                <Link
                  href="/agents"
                  className="rounded-md border border-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand)] transition hover:bg-[var(--brand-soft)]"
                >
                  清空筛选条件
                </Link>
              ) : undefined
            }
          />
        )}
      </div>
    </>
  )
}

function PageLink({ href, disabled, children, className }: { href: string; disabled?: boolean; children: React.ReactNode; className?: string }) {
  if (disabled) {
    return (
      <span className={cn('inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-slate-300', className)}>
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-slate-600 transition hover:border-[var(--brand)] hover:text-[var(--brand)]',
        className,
      )}
    >
      {children}
    </Link>
  )
}
