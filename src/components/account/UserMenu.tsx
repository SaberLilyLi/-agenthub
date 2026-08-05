'use client'

import { Download, Heart, LayoutDashboard, LogOut, Settings, Upload, UserRound } from 'lucide-react'
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

export function UserMenu({ name, email, isAdmin }: { name: string; email: string; isAdmin?: boolean }) {
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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate">{name}</p>
          <p className="mt-0.5 truncate text-xs font-normal text-slate-500">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push('/me')}>
          <UserRound />
          账户中心
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push('/me/favorites')}>
          <Heart />
          我的收藏
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push('/me/downloads')}>
          <Download />
          我的下载
        </DropdownMenuItem>
        {!isAdmin && (
          <DropdownMenuItem onSelect={() => router.push('/me/submit-skill')}>
            <Upload />
            投稿 Skill
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/admin/collections/agents')}>
              <Settings />
              Skill 管理台
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/admin')}>
              <LayoutDashboard />
              平台管理
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOut />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
