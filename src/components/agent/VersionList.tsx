import { Badge } from '@/components/ui/badge'
import { relativeTime } from '@/lib/format'

import { DownloadButton } from './DownloadButton'

type Version = {
  id: number
  version: string
  fileSize?: string | null
  changelog?: string | null
  channel?: 'stable' | 'beta' | null
  publishedAt?: string | null
}

export function VersionList({ versions, agentName }: { versions: Version[]; agentName?: string }) {
  return (
    <div className="divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)] bg-white">
      {versions.map((version) => (
        <div key={version.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 font-medium">
              v{version.version}
              <Badge variant="secondary">{version.channel === 'beta' ? '测试版' : '稳定版'}</Badge>
              {version.publishedAt && <span className="text-xs font-normal text-slate-400">{relativeTime(version.publishedAt)}</span>}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {[version.fileSize, version.changelog || '暂无更新说明'].filter(Boolean).join('　')}
            </p>
          </div>
          <DownloadButton versionId={version.id} agentName={agentName} />
        </div>
      ))}
    </div>
  )
}
