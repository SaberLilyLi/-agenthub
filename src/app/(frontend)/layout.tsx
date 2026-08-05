import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Upload } from 'lucide-react'

import { hasAdminRole } from '@/access/isAdmin'
import { UserMenu } from '@/components/account/UserMenu'
import { MainNav } from '@/components/common/MainNav'
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
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5">
            <div className="flex items-center gap-6">
              <Link href="/" className="shrink-0 font-semibold tracking-tight">
                FaceMini <span className="text-[var(--brand)]">AgentHub</span>
              </Link>
              <MainNav />
            </div>
            <div className="flex items-center gap-3">
              {currentUser ? (
                <>
                  <Link
                    href="/me/submit-skill"
                    className="hidden items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-slate-600 transition hover:border-[var(--brand)] hover:text-[var(--brand)] sm:inline-flex"
                  >
                    <Upload className="size-4" />
                    投稿 Skill
                  </Link>
                  <UserMenu name={currentUser.name} email={currentUser.email} isAdmin={hasAdminRole(currentUser)} />
                </>
              ) : (
                <Link
                  className="rounded-md bg-[var(--brand)] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[var(--brand-hover)]"
                  href="/login"
                >
                  登录
                </Link>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-61px)] max-w-7xl px-5 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
