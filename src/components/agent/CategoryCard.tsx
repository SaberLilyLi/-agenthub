import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { AgentIcon } from './AgentIcon'
import type { CategorySummary } from './types'

export function CategoryCard({ category }: { category: CategorySummary }) {
  return (
    <Link
      href={`/agents?category=${category.slug}`}
      className="group flex flex-col rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
    >
      <AgentIcon name={category.name} categorySlug={category.slug} categoryName={category.name} size="md" />
      <h3 className="mt-4 font-semibold group-hover:text-[var(--brand)]">{category.name}</h3>
      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
        {category.description || '探索该分类下的官方 Agent。'}
      </p>
      <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)]">
        {category.count} 个 Agent
        <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
      </p>
    </Link>
  )
}
