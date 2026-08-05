import Link from 'next/link'
import { Download } from 'lucide-react'

import { formatCount, relativeTime } from '@/lib/format'
import { cn } from '@/utilities/ui'

import { AgentIcon } from './AgentIcon'
import type { AgentCardData } from './types'

export function AgentListItem({ agent, className }: { agent: AgentCardData; className?: string }) {
  const updatedLabel = agent.lastActiveAt ? relativeTime(agent.lastActiveAt) : ''

  return (
    <Link
      href={`/agents/${agent.slug}`}
      className={cn(
        'flex items-center gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg',
        className,
      )}
    >
      <AgentIcon
        name={agent.name}
        categorySlug={agent.categorySlug}
        categoryName={agent.categoryName}
        coverUrl={agent.coverUrl}
        coverAlt={agent.coverAlt}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{agent.name}</h3>
          {agent.latestVersion && <span className="shrink-0 text-xs text-slate-400">v{agent.latestVersion}</span>}
        </div>
        <p className="mt-1 truncate text-sm text-slate-500">{agent.summary}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
        <span className="hidden items-center gap-1 sm:inline-flex">
          <Download className="size-3.5" />
          {formatCount(agent.downloadCount)}
        </span>
        {updatedLabel && (
          <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 font-medium text-[var(--brand)]">{updatedLabel}</span>
        )}
      </div>
    </Link>
  )
}
