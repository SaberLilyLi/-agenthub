import type { Payload } from 'payload'

export type UserCenterData = {
  permission: { active: boolean; expiresAt: string | null }
  skills: Array<{ id: number; name: string; version: string; status: 'published' | 'pending' | 'rejected'; submittedAt: string; reviewNote: string; downloads: number; favorites: number }>
}

export async function getUserCenterData(payload: Payload, userId: number | string): Promise<UserCenterData> {
  const [user, submissions, agents, permissions] = await Promise.all([
    payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'skill-submissions', where: { owner: { equals: userId } }, sort: '-createdAt', depth: 1, limit: 100, overrideAccess: true }),
    payload.find({ collection: 'agents', where: { owner: { equals: userId } }, depth: 0, pagination: false, limit: 1000, overrideAccess: true }),
    payload.find({ collection: 'skill-submission-permissions', where: { user: { equals: userId } }, depth: 0, limit: 1, overrideAccess: true }),
  ])

  const agentIds = agents.docs.map((agent) => agent.id)
  const favoriteCounts = new Map<number, number>()
  if (agentIds.length) {
    const favorites = await payload.find({ collection: 'favorites', where: { agent: { in: agentIds } }, depth: 0, pagination: false, limit: 10000, overrideAccess: true })
    for (const favorite of favorites.docs) {
      const id = typeof favorite.agent === 'number' ? favorite.agent : favorite.agent.id
      favoriteCounts.set(id, (favoriteCounts.get(id) ?? 0) + 1)
    }
  }

  const metricsByAgent = new Map(agents.docs.map((agent) => [agent.id, { downloads: agent.downloadCount ?? 0, favorites: favoriteCounts.get(agent.id) ?? 0 }]))
  const permission = permissions.docs[0]
  const expiresAt = permission?.expiresAt ?? null
  const active = permission?.status === 'active' && typeof expiresAt === 'string' && Date.parse(expiresAt) > Date.now() && user.disabled !== true

  return {
    permission: { active, expiresAt: typeof expiresAt === 'string' ? expiresAt : null },
    skills: submissions.docs.map((submission) => {
      const agent = typeof submission.agent === 'number' ? null : submission.agent
      const metrics = agent ? metricsByAgent.get(agent.id) : undefined
      const status = submission.reviewStatus === 'approved' ? 'published' : submission.reviewStatus
      return {
        id: submission.id,
        name: submission.name,
        version: `v${submission.version}`,
        status,
        submittedAt: new Date(submission.createdAt).toLocaleDateString('zh-CN'),
        reviewNote: status === 'published' ? '已审核通过并发布到 Agent 广场。' : status === 'pending' ? '已提交，等待管理员审核。' : '审核未通过，请完善资料后重新提交。',
        downloads: metrics?.downloads ?? 0,
        favorites: metrics?.favorites ?? 0,
      }
    }),
  }
}
