import type { ReactNode } from 'react'
import { SearchX } from 'lucide-react'

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
      <SearchX className="mx-auto size-8 text-slate-400" />
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}
