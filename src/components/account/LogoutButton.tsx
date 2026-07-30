'use client'

import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { csrfHeaders } from '@/lib/client/csrf'

export function LogoutButton() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function logout() {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: csrfHeaders() })
      router.replace('/')
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600" disabled={isLoggingOut} onClick={logout}>
      <LogOut className="size-4" />
      {isLoggingOut ? '退出中…' : '退出登录'}
    </Button>
  )
}
