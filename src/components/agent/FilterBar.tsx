'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

import { cn } from '@/utilities/ui'

import type { CategorySummary } from './types'

export type MarketplaceQuery = {
  q?: string
  category?: string
  sort?: string
  page?: string
}

export function buildAgentsHref(query: MarketplaceQuery): string {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.category) params.set('category', query.category)
  if (query.sort && query.sort !== 'latest') params.set('sort', query.sort)
  if (query.page && query.page !== '1') params.set('page', query.page)
  const search = params.toString()
  return search ? `/agents?${search}` : '/agents'
}

const SORT_OPTIONS = [
  { value: 'latest', label: '最新发布' },
  { value: 'featured', label: '综合推荐' },
  { value: 'downloads', label: '最多下载' },
]

type FilterBarProps = {
  categories: CategorySummary[]
  current: MarketplaceQuery
  totalDocs: number
}

export function FilterBar({ categories, current, totalDocs }: FilterBarProps) {
  const router = useRouter()
  const activeCategory = categories.find((category) => category.slug === current.category)
  const hasFilters = Boolean(current.q || current.category || (current.sort && current.sort !== 'latest'))

  return (
    <div className="sticky top-16 z-10 -mx-5 bg-[var(--background)]/95 px-5 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
          <Link
            href={buildAgentsHref({ q: current.q, sort: current.sort })}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm transition',
              !current.category
                ? 'bg-[var(--brand)] font-medium text-white'
                : 'text-slate-600 hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]',
            )}
          >
            全部
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={buildAgentsHref({ q: current.q, category: category.slug, sort: current.sort })}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-sm transition',
                current.category === category.slug
                  ? 'bg-[var(--brand)] font-medium text-white'
                  : 'text-slate-600 hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]',
              )}
            >
              {category.name}
            </Link>
          ))}
        </nav>

        <select
          aria-label="排序方式"
          value={current.sort || 'latest'}
          onChange={(event) =>
            router.push(buildAgentsHref({ q: current.q, category: current.category, sort: event.target.value }))
          }
          className="h-8 shrink-0 rounded-md border border-[var(--border)] bg-white px-2 text-sm text-slate-600 outline-none focus:border-[var(--brand)]"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>共 {totalDocs} 个 Agent</span>
        {current.q && (
          <FilterChip label={`搜索：${current.q}`} href={buildAgentsHref({ category: current.category, sort: current.sort })} />
        )}
        {activeCategory && (
          <FilterChip label={`分类：${activeCategory.name}`} href={buildAgentsHref({ q: current.q, sort: current.sort })} />
        )}
        {hasFilters && (
          <Link href="/agents" className="font-medium text-[var(--brand)] hover:underline">
            清空筛选
          </Link>
        )}
      </div>
    </div>
  )
}

function FilterChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-soft)] px-2.5 py-1 font-medium text-[var(--brand)] transition hover:bg-blue-100"
    >
      {label}
      <X className="size-3" />
    </Link>
  )
}
