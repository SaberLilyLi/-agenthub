'use client'

import { Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { csrfHeaders } from '@/lib/client/csrf'

export function DownloadButton({ versionId }: { versionId: number }) {
  const [downloading, setDownloading] = useState(false)

  async function download() {
    setDownloading(true)
    try {
      const response = await fetch(`/api/download/${versionId}`, { method: 'POST', headers: csrfHeaders() })
      const body = await response.json().catch(() => ({})) as { downloadUrl?: string; message?: string }
      if (!response.ok || !body.downloadUrl) return toast.error(body.message || '下载请求失败')
      window.location.assign(body.downloadUrl)
    } finally {
      setDownloading(false)
    }
  }

  return <Button onClick={download} disabled={downloading}><Download />{downloading ? '准备下载…' : '下载'}</Button>
}
