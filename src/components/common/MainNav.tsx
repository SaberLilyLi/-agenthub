'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/utilities/ui'

const LINKS = [
  { href: '/', label: '首页', exact: true },
  { href: '/agents', label: 'Agent 广场', exact: false },
  { href: '/about', label: '关于鲸创', exact: false },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'rounded-md px-3 py-2 transition',
              active ? 'font-medium text-[var(--brand)]' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
