'use client'

import { LogOut, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { csrfHeaders } from '@/lib/client/csrf'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter()
  const initial = name.trim().slice(0, 1).toUpperCase() || '用'

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', headers: csrfHeaders() })
    router.replace('/')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-[var(--brand)]">
        <Avatar className="h-8 w-8 border border-[var(--border)]">
          <AvatarFallback className="bg-blue-50 text-sm font-semibold text-[var(--brand)]">{initial}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-28 truncate sm:inline">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>
          <p className="truncate">{name}</p>
          <p className="mt-0.5 truncate text-xs font-normal text-slate-500">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push('/me')}>
          <UserRound />
          账户中心
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={logout}>
          <LogOut />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
