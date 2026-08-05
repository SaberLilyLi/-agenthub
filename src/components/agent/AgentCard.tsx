import Link from 'next/link'
import { BadgeCheck, Download } from 'lucide-react'

import { formatCount, relativeTime } from '@/lib/format'
import { cn } from '@/utilities/ui'

import { AgentIcon } from './AgentIcon'
import type { AgentCardData } from './types'

export function AgentCard({ agent, className }: { agent: AgentCardData; className?: string }) {
  const detailHref = `/agents/${agent.slug}`
  const updatedLabel = agent.lastActiveAt ? relativeTime(agent.lastActiveAt) : ''

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <AgentIcon
          name={agent.name}
          categorySlug={agent.categorySlug}
          categoryName={agent.categoryName}
          coverUrl={agent.coverUrl}
          coverAlt={agent.coverAlt}
          size="lg"
        />
        {agent.featured && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-xs font-medium text-[var(--brand)]">
            <BadgeCheck className="size-3.5" />
            官方精选
          </span>
        )}
      </div>

      <h3 className="mt-4 truncate font-semibold">
        <Link href={detailHref} className="hover:text-[var(--brand)]">
          {agent.name}
          <span className="absolute inset-0" aria-hidden />
        </Link>
      </h3>
      {agent.latestVersion && <p className="mt-0.5 text-xs text-slate-400">v{agent.latestVersion}</p>}

      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">{agent.summary}</p>

      {agent.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {agent.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto">
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Download className="size-3.5" />
            {formatCount(agent.downloadCount)}
          </span>
          {updatedLabel && <span className="truncate">更新于 {updatedLabel}</span>}
          <Link
            href={detailHref}
            className="relative z-10 shrink-0 rounded-md border border-[var(--brand)] px-3.5 py-1.5 text-sm font-medium text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
          >
            使用
          </Link>
        </div>
      </div>
    </article>
  )
}
