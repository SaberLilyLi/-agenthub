'use client'

import { Heart } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { csrfHeaders } from '@/lib/client/csrf'

export function FavoriteButton({ agentId }: { agentId: number }) {
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    const response = await fetch('/api/favorites/toggle', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...csrfHeaders() },
      body: JSON.stringify({ agentId }),
    })
    setBusy(false)
    if (response.status === 401) return toast.error('请先登录后收藏')
    toast.success((await response.json()).favorited ? '已加入收藏' : '已取消收藏')
  }

  return <Button variant="outline" disabled={busy} onClick={toggle}><Heart />收藏</Button>
}
