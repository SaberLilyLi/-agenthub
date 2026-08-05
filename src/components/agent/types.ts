export type CategorySummary = {
  id: number
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  count: number
}

export type VersionInfo = {
  version: string
  publishedAt?: string | null
  changelog?: string | null
  fileSize?: string | null
}

/** Plain serializable data shape shared by server pages and client card components. */
export type AgentCardData = {
  id: number
  slug: string
  name: string
  summary: string
  downloadCount: number
  featured: boolean
  categorySlug: string | null
  categoryName: string | null
  tags: string[]
  coverUrl: string | null
  coverAlt: string
  latestVersion: string | null
  lastActiveAt: string | null
}

export type HomeStats = {
  agentCount: number
  totalDownloads: number
  activeCategories: number
  recentUpdates: number
}
