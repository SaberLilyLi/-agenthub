import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'

import { LogoutButton } from '@/components/account/LogoutButton'
import { UserMenu } from '@/components/account/UserMenu'
import { Toaster } from '@/components/ui/sonner'
import { payloadForHeaders } from '@/lib/auth'

import './globals.css'

export const metadata: Metadata = {
  title: '鲸创 AgentHub',
  description: '智能体应用发现平台',
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user } = await payloadForHeaders(await headers())
  const currentUser = user?.collection === 'users' ? user : null

  return (
    <html lang="zh-CN">
      <body className={currentUser?.role === 'superadmin' ? undefined : 'hide-nextjs-dev-tools'}>
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="font-semibold tracking-tight">
              FaceMini <span className="text-[var(--brand)]">AgentHub</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-slate-600">
              <Link href="/agents">Agent 广场</Link>
              <Link href="/about">关于鲸创</Link>
              {currentUser && <Link className="font-medium text-[var(--brand)]" href="/admin/collections/agents">Skill 管理台</Link>}
              {currentUser ? (
                <><UserMenu name={currentUser.name} email={currentUser.email} /><LogoutButton /></>
              ) : (
                <Link className="rounded-md bg-[var(--brand)] px-3 py-2 text-white" href="/login">
                  登录
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-65px)] max-w-6xl px-5 py-10">{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
