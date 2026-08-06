import config from '@payload-config'
import { getPayload, type Payload, type Where } from 'payload'

import type { Agent } from '@/payload-types'
import type { AgentCardData, CategorySummary, HomeStats, VersionInfo } from '@/components/agent/types'

export async function getPayloadClient(): Promise<Payload> {
  return getPayload({ config })
}

/** Latest published version per agent, keyed by agent id. */
export async function getLatestVersionMap(payload: Payload, agentIds: number[]): Promise<Map<number, VersionInfo>> {
  const map = new Map<number, VersionInfo>()
  if (!agentIds.length) return map
  const versions = await payload.find({
    collection: 'agent-versions',
    where: { and: [{ agent: { in: agentIds } }, { status: { equals: 'published' } }] },
    sort: '-publishedAt',
    pagination: false,
    limit: 1000,
    depth: 0,
  })
  for (const version of versions.docs) {
    const agentId = typeof version.agent === 'number' ? version.agent : version.agent.id
    if (!map.has(agentId)) {
      map.set(agentId, {
        version: version.version,
        publishedAt: version.publishedAt,
        changelog: version.changelog,
        fileSize: version.fileSize,
      })
    }
  }
  return map
}

/** All categories with their real published-agent counts. */
export async function getCategorySummaries(payload: Payload): Promise<CategorySummary[]> {
  const [categories, agents] = await Promise.all([
    payload.find({ collection: 'categories', sort: 'sortOrder', pagination: false, limit: 200, depth: 0 }),
    payload.find({
      collection: 'agents',
      where: { status: { equals: 'published' } },
      depth: 0,
      pagination: false,
      limit: 1000,
    }),
  ])
  const counts = new Map<number, number>()
  for (const agent of agents.docs) {
    const categoryId = typeof agent.category === 'number' ? agent.category : agent.category?.id
    if (typeof categoryId === 'number') counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1)
  }
  return categories.docs.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    count: counts.get(category.id) ?? 0,
  }))
}

export async function getHomeStats(payload: Payload, categories: CategorySummary[]): Promise<HomeStats> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [agents, recentVersions] = await Promise.all([
    payload.find({
      collection: 'agents',
      where: { status: { equals: 'published' } },
      depth: 0,
      pagination: false,
      limit: 1000,
    }),
    payload.find({
      collection: 'agent-versions',
      where: { and: [{ status: { equals: 'published' } }, { publishedAt: { greater_than: thirtyDaysAgo } }] },
      limit: 1,
      depth: 0,
    }),
  ])
  return {
    agentCount: agents.totalDocs,
    totalDownloads: agents.docs.reduce((sum, agent) => sum + (agent.downloadCount ?? 0), 0),
    activeCategories: categories.filter((category) => category.count > 0).length,
    recentUpdates: recentVersions.totalDocs,
  }
}

export function toCardData(agent: Agent, versions?: Map<number, VersionInfo>): AgentCardData {
  const category = typeof agent.category === 'object' && agent.category ? agent.category : null
  const cover = typeof agent.cover === 'object' && agent.cover ? agent.cover : null
  const version = versions?.get(agent.id) ?? null
  return {
    id: agent.id,
    slug: agent.slug,
    name: agent.name,
    summary: agent.summary,
    downloadCount: agent.downloadCount ?? 0,
    featured: agent.featured === true,
    categorySlug: category?.slug ?? null,
    categoryName: category?.name ?? null,
    tags: (agent.tags ?? []).map((item) => item?.tag).filter((tag): tag is string => Boolean(tag)),
    coverUrl: cover?.url ?? null,
    coverAlt: cover?.alt ?? agent.name,
    latestVersion: version?.version ?? null,
    lastActiveAt: version?.publishedAt ?? agent.publishedAt ?? agent.updatedAt ?? null,
    demoUrl: agent.demoUrl?.trim() ? agent.demoUrl.trim() : null,
  }
}

export type AgentsQuery = {
  q?: string
  categorySlug?: string
  sort?: 'featured' | 'latest' | 'downloads'
  page?: number
  limit?: number
}

export async function findPublishedAgents(payload: Payload, query: AgentsQuery) {
  const conditions: Where[] = [{ status: { equals: 'published' } }]

  if (query.categorySlug) {
    const matched = await payload.find({
      collection: 'categories',
      where: { slug: { equals: query.categorySlug } },
      limit: 1,
      depth: 0,
    })
    const category = matched.docs[0]
    if (!category) return { docs: [], totalDocs: 0, totalPages: 0, page: 1, categoryName: null }
    conditions.push({ category: { equals: category.id } })
  }

  const keyword = query.q?.trim()
  if (keyword) {
    conditions.push({
      or: [
        { name: { contains: keyword } },
        { summary: { contains: keyword } },
        { 'tags.tag': { contains: keyword } },
      ],
    })
  }

  const sort =
    query.sort === 'downloads'
      ? ['-downloadCount', '-publishedAt']
      : query.sort === 'featured'
        ? ['-featured', '-downloadCount']
        : ['-publishedAt']

  const result = await payload.find({
    collection: 'agents',
    where: { and: conditions },
    sort,
    page: Math.max(1, query.page ?? 1),
    limit: query.limit ?? 12,
    depth: 1,
  })

  const firstDoc = result.docs[0]
  const categoryName =
    query.categorySlug && firstDoc && typeof firstDoc.category === 'object' && firstDoc.category
      ? firstDoc.category.name
      : null

  return { ...result, categoryName }
}
