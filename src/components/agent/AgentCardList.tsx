'use client'
/* eslint-disable react-hooks/set-state-in-effect -- hydrate from localStorage after mount, same pattern as ui/carousel.tsx */

import { LayoutGrid, List } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/utilities/ui'

import { AgentCard } from './AgentCard'
import { AgentListItem } from './AgentListItem'
import type { AgentCardData } from './types'

type ViewMode = 'grid' | 'list'

const STORAGE_KEY = 'agenthub:view'

export function AgentCardList({ agents, className }: { agents: AgentCardData[]; className?: string }) {
  const [view, setView] = useState<ViewMode>('grid')

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'grid' || saved === 'list') setView(saved)
  }, [])

  function switchView(next: ViewMode) {
    setView(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <div className={className}>
      <div className="mb-4 flex justify-end">
        <div className="flex rounded-md border border-[var(--border)] bg-white p-0.5">
          {(
            [
              { mode: 'grid' as const, label: '网格视图', Icon: LayoutGrid },
              { mode: 'list' as const, label: '列表视图', Icon: List },
            ]
          ).map(({ mode, label, Icon }) => (
            <button
              key={mode}
              type="button"
              aria-label={label}
              title={label}
              onClick={() => switchView(mode)}
              className={cn(
                'rounded px-2 py-1.5 text-slate-500 transition',
                view === mode ? 'bg-[var(--brand-soft)] text-[var(--brand)]' : 'hover:text-slate-900',
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {agents.map((agent) => (
            <AgentListItem key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}
