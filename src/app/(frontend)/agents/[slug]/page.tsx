import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BadgeCheck, ChevronRight, Download, MonitorPlay } from 'lucide-react'

import { AgentIcon } from '@/components/agent/AgentIcon'
import { DownloadButton } from '@/components/agent/DownloadButton'
import { FavoriteButton } from '@/components/agent/FavoriteButton'
import { ScreenshotGallery } from '@/components/agent/ScreenshotGallery'
import { VersionList } from '@/components/agent/VersionList'
import { getLatestVersionMap, getPayloadClient } from '@/lib/agentQueries'
import { isExternalDemoUrl, resolveDemoUrl } from '@/lib/demoUrl'
import { formatCount, relativeTime } from '@/lib/format'

export default async function AgentDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'agents',
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] },
    limit: 1,
    depth: 1,
  })
  const agent = found.docs[0]
  if (!agent) return notFound()

  const versions = await payload.find({
    collection: 'agent-versions',
    where: { and: [{ agent: { equals: agent.id } }, { status: { equals: 'published' } }] },
    sort: '-publishedAt',
  })
  const latest = versions.docs[0]
  const versionMap = await getLatestVersionMap(payload, [agent.id])
  const latestInfo = versionMap.get(agent.id)

  const category = typeof agent.category === 'object' && agent.category ? agent.category : null
  const cover = typeof agent.cover === 'object' && agent.cover ? agent.cover : null
  const tags = (agent.tags ?? []).map((item) => item?.tag).filter((tag): tag is string => Boolean(tag))
  const updatedAt = latestInfo?.publishedAt ?? agent.publishedAt ?? agent.updatedAt
  const demoHref = resolveDemoUrl(agent.demoUrl)
  const demoExternal = isExternalDemoUrl(agent.demoUrl)

  return (
    <article>
      {/* 面包屑 */}
      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        <Link href="/agents" className="hover:text-[var(--brand)]">
          Agent 广场
        </Link>
        {category && (
          <>
            <ChevronRight className="size-3.5" />
            <Link href={`/agents?category=${category.slug}`} className="hover:text-[var(--brand)]">
              {category.name}
            </Link>
          </>
        )}
        <ChevronRight className="size-3.5" />
        <span className="text-slate-900">{agent.name}</span>
      </nav>

      {/* 头部信息 */}
      <div className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow)] md:p-8">
        <div className="flex flex-wrap items-start gap-5">
          <AgentIcon name={agent.name} categorySlug={category?.slug} categoryName={category?.name} coverUrl={cover?.url} coverAlt={cover?.alt ?? agent.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{agent.name}</h1>
              {agent.featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--brand)]">
                  <BadgeCheck className="size-3.5" />
                  官方精选
                </span>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-slate-600">{agent.summary}</p>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <h2 className="text-xl font-bold">产品介绍</h2>
          <p className="mt-4 whitespace-pre-wrap leading-8 text-slate-700">{agent.description || agent.summary}</p>

          {Array.isArray(agent.screenshots) && agent.screenshots.length > 0 && (
            <>
              <h2 className="mt-10 text-xl font-bold">截图画廊</h2>
              <div className="mt-4">
                <ScreenshotGallery screenshots={agent.screenshots} />
              </div>
            </>
          )}

          {versions.docs.length > 0 && (
            <>
              <h2 className="mt-10 text-xl font-bold">版本更新记录</h2>
              <div className="mt-4">
                <VersionList versions={versions.docs} agentName={agent.name} />
              </div>
            </>
          )}
        </div>

        {/* 右侧固定操作栏 */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)]">
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">免费</span>
            <dl className="mt-4 space-y-3 text-sm">
              {category && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">分类</dt>
                  <dd>
                    <Link href={`/agents?category=${category.slug}`} className="text-[var(--brand)] hover:underline">
                      {category.name}
                    </Link>
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">下载量</dt>
                <dd className="inline-flex items-center gap-1">
                  <Download className="size-3.5 text-slate-400" />
                  {formatCount(agent.downloadCount)}
                </dd>
              </div>
              {latestInfo && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">最新版本</dt>
                  <dd>v{latestInfo.version}</dd>
                </div>
              )}
              {latest?.fileSize && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">文件大小</dt>
                  <dd>{latest.fileSize}</dd>
                </div>
              )}
              {updatedAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">更新时间</dt>
                  <dd>{relativeTime(updatedAt)}</dd>
                </div>
              )}
            </dl>
            <div className="mt-5 flex flex-col gap-2 border-t border-[var(--border)] pt-4">
              {latest && <DownloadButton versionId={latest.id} agentName={agent.name} />}
              {demoHref && (
                <a
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 text-sm font-medium transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  href={demoHref}
                  target={demoExternal ? '_blank' : undefined}
                  rel={demoExternal ? 'noopener noreferrer' : undefined}
                >
                  <MonitorPlay className="size-4" />
                  在线演示
                </a>
              )}
              <FavoriteButton agentId={agent.id} />
            </div>
          </div>
        </aside>
      </section>
    </article>
  )
}
