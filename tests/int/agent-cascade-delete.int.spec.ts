// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload } from 'payload'

import config from '@/payload.config'

const suffix = `${process.pid}-${Date.now()}`

describe('agent cascade delete', () => {
  const ids: {
    agent?: number
    category?: number
    download?: number
    favorite?: number
    user?: number
    version?: number
  } = {}

  beforeAll(async () => {
    const payload = await getPayload({ config })

    const category = await payload.create({
      collection: 'categories',
      data: { name: `级联删除分类 ${suffix}`, slug: `cascade-category-${suffix}` },
      overrideAccess: true,
    })
    ids.category = category.id

    const user = await payload.create({
      collection: 'users',
      data: {
        name: '级联删除用户',
        email: `cascade-${suffix}@agenthub.test`,
        password: 'cascade-test-password',
        role: 'user',
      },
      overrideAccess: true,
    })
    ids.user = user.id

    const agent = await payload.create({
      collection: 'agents',
      data: {
        name: '级联删除智能体',
        slug: `cascade-agent-${suffix}`,
        summary: '删除时应一并清理关联记录。',
        category: category.id,
        status: 'published',
        publishedAt: new Date().toISOString(),
        owner: user.id,
      },
      overrideAccess: true,
    })
    ids.agent = agent.id

    const version = await payload.create({
      collection: 'agent-versions',
      data: {
        agent: agent.id,
        version: '1.0.0',
        status: 'published',
        channel: 'stable',
        publishedAt: new Date().toISOString(),
        downloadUrl: 'https://example.com/cascade.zip',
      },
      overrideAccess: true,
    })
    ids.version = version.id

    const favorite = await payload.create({
      collection: 'favorites',
      data: { user: user.id, agent: agent.id },
      overrideAccess: true,
    })
    ids.favorite = favorite.id

    const download = await payload.create({
      collection: 'download-records',
      data: {
        user: user.id,
        agent: agent.id,
        version: version.id,
        actorType: 'authenticated',
        requestId: `cascade-req-${suffix}`,
      },
      overrideAccess: true,
    })
    ids.download = download.id
  })

  afterAll(async () => {
    const payload = await getPayload({ config })
    // Prefer cascade path; fall back to manual cleanup if the hook is missing.
    if (ids.agent) {
      try {
        await payload.delete({ collection: 'agents', id: ids.agent, overrideAccess: true })
      } catch {
        if (ids.download) {
          try {
            await payload.delete({ collection: 'download-records', id: ids.download, overrideAccess: true })
          } catch {
            /* already gone */
          }
        }
        if (ids.favorite) {
          try {
            await payload.delete({ collection: 'favorites', id: ids.favorite, overrideAccess: true })
          } catch {
            /* already gone */
          }
        }
        if (ids.version) {
          try {
            await payload.delete({ collection: 'agent-versions', id: ids.version, overrideAccess: true })
          } catch {
            /* already gone */
          }
        }
        try {
          await payload.delete({ collection: 'agents', id: ids.agent, overrideAccess: true })
        } catch {
          /* already gone */
        }
      }
    }
    if (ids.category) {
      try {
        await payload.delete({ collection: 'categories', id: ids.category, overrideAccess: true })
      } catch {
        /* already gone */
      }
    }
    if (ids.user) {
      try {
        await payload.delete({ collection: 'users', id: ids.user, overrideAccess: true })
      } catch {
        /* already gone */
      }
    }
  })

  it('deletes an agent that still has versions, favorites, and download records', async () => {
    const payload = await getPayload({ config })
    const agentId = ids.agent!
    const versionId = ids.version!
    const favoriteId = ids.favorite!
    const downloadId = ids.download!

    await expect(
      payload.delete({ collection: 'agents', id: agentId, overrideAccess: true }),
    ).resolves.toBeTruthy()

    await expect(payload.findByID({ collection: 'agents', id: agentId, overrideAccess: true })).rejects.toThrow()
    await expect(
      payload.findByID({ collection: 'agent-versions', id: versionId, overrideAccess: true }),
    ).rejects.toThrow()
    await expect(
      payload.findByID({ collection: 'favorites', id: favoriteId, overrideAccess: true }),
    ).rejects.toThrow()
    await expect(
      payload.findByID({ collection: 'download-records', id: downloadId, overrideAccess: true }),
    ).rejects.toThrow()

    ids.agent = undefined
    ids.version = undefined
    ids.favorite = undefined
    ids.download = undefined
  })
})
