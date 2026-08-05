'use client'

import Link from 'next/link'
import { CheckCircle2, Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { csrfHeaders } from '@/lib/client/csrf'

export function DownloadButton({ versionId, agentName }: { versionId: number; agentName?: string }) {
  const [downloading, setDownloading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function download() {
    setDownloading(true)
    try {
      const response = await fetch(`/api/download/${versionId}`, { method: 'POST', headers: csrfHeaders() })
      const body = (await response.json().catch(() => ({}))) as { downloadUrl?: string; message?: string }
      if (!response.ok || !body.downloadUrl) {
        toast.error(body.message || '下载请求失败，请稍后重试')
        return
      }
      setSuccess(true)
      window.location.assign(body.downloadUrl)
    } catch {
      toast.error('网络异常，下载请求失败')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <Button onClick={download} disabled={downloading}>
        <Download />
        {downloading ? '准备下载…' : '立即下载'}
      </Button>
      <Dialog open={success} onOpenChange={setSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-[var(--success)]" />
              已开始下载
            </DialogTitle>
            <DialogDescription>
              {agentName ? `「${agentName}」已开始下载` : '已开始下载'}，下载记录可在「我的下载」中查看。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuccess(false)}>
              继续浏览
            </Button>
            <Button asChild>
              <Link href="/me/downloads">查看我的下载</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
