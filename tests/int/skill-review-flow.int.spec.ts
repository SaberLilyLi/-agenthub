// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload } from 'payload'

import config from '@/payload.config'

const suffix = `${process.pid}-${Date.now()}`
const slug = `local-skill-${suffix}`

describe('local Skill review flow', () => {
  const ids: { agent?: number; category?: number; rejectedSubmission?: number; submission?: number; user?: number; version?: number; reviewer?: number } = {}
  const previousServerURL = process.env.NEXT_PUBLIC_SERVER_URL

  beforeAll(() => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'http://127.0.0.1:3102'
  })

  afterAll(async () => {
    const payload = await getPayload({ config })
    if (ids.version) await payload.delete({ collection: 'agent-versions', id: ids.version, overrideAccess: true })
    if (ids.rejectedSubmission) await payload.delete({ collection: 'skill-submissions', id: ids.rejectedSubmission, overrideAccess: true })
    if (ids.submission) await payload.delete({ collection: 'skill-submissions', id: ids.submission, overrideAccess: true })
    if (ids.agent) await payload.delete({ collection: 'agents', id: ids.agent, overrideAccess: true })
    if (ids.category) await payload.delete({ collection: 'categories', id: ids.category, overrideAccess: true })
    for (const id of [ids.user, ids.reviewer]) {
      if (id) await payload.delete({ collection: 'users', id, overrideAccess: true })
    }
    if (previousServerURL === undefined) delete process.env.NEXT_PUBLIC_SERVER_URL
    else process.env.NEXT_PUBLIC_SERVER_URL = previousServerURL
  })

  it('lets an ordinary user create a draft and publishes its local package only after review', async () => {
    const payload = await getPayload({ config })
    const category = await payload.create({
      collection: 'categories',
      data: { name: `本地测试 ${suffix}`, slug: `local-category-${suffix}` },
      overrideAccess: true,
    })
    ids.category = category.id

    const owner = await payload.create({
      collection: 'users',
      data: { name: '本地投稿用户', email: `owner-${suffix}@agenthub.test`, password: 'local-test-password', role: 'user' },
      overrideAccess: true,
    })
    ids.user = owner.id
    const reviewer = await payload.create({
      collection: 'users',
      data: { name: '本地管理员', email: `reviewer-${suffix}@agenthub.test`, password: 'local-test-password', role: 'admin' },
      overrideAccess: true,
    })
    ids.reviewer = reviewer.id

    const agent = await payload.create({
      collection: 'agents',
      data: { name: '本地 Skill', slug, summary: '本地持久化与审核流程测试。', category: category.id },
      user: owner,
      overrideAccess: false,
    })
    ids.agent = agent.id
    expect(typeof agent.owner === 'number' ? agent.owner : agent.owner?.id).toBe(owner.id)
    expect(agent.status).toBe('draft')

    const archive = Buffer.from('PK\u0005\u0006'.padEnd(22, '\u0000'))
    const submission = await payload.create({
      collection: 'skill-submissions',
      data: {
        owner: owner.id,
        agent: agent.id,
        name: agent.name,
        slug: agent.slug,
        summary: agent.summary,
        category: category.id,
        version: '1.0.0',
        reviewStatus: 'pending',
      },
      file: { data: archive, name: `${slug}-v1.0.0.zip`, mimetype: 'application/zip', size: archive.length },
      user: owner,
      overrideAccess: true,
    })
    ids.submission = submission.id
    expect(submission.url).toContain('/api/skill-submissions/file/')

    await payload.update({
      collection: 'skill-submissions',
      id: submission.id,
      data: { reviewStatus: 'approved' },
      user: reviewer,
      overrideAccess: false,
    })

    const versions = await payload.find({
      collection: 'agent-versions',
      where: { and: [{ agent: { equals: agent.id } }, { version: { equals: '1.0.0' } }] },
      depth: 0,
      overrideAccess: true,
    })
    const version = versions.docs[0]
    ids.version = version.id
    expect(version.status).toBe('published')
    expect(version.package).toBe(submission.id)
    expect(version.downloadUrl).toBe(`http://127.0.0.1:3102${submission.url}`)

    const publishedAgent = await payload.findByID({ collection: 'agents', id: agent.id, depth: 0, overrideAccess: true })
    expect(publishedAgent.status).toBe('published')

    const rejectedSubmission = await payload.create({
      collection: 'skill-submissions',
      data: {
        owner: owner.id,
        agent: agent.id,
        name: agent.name,
        slug: agent.slug,
        summary: agent.summary,
        category: category.id,
        version: '1.0.1',
        reviewStatus: 'pending',
      },
      file: { data: archive, name: `${slug}-v1.0.1.zip`, mimetype: 'application/zip', size: archive.length },
      user: owner,
      overrideAccess: true,
    })
    ids.rejectedSubmission = rejectedSubmission.id
    await payload.update({
      collection: 'skill-submissions',
      id: rejectedSubmission.id,
      data: { reviewStatus: 'rejected' },
      user: reviewer,
      overrideAccess: false,
    })

    const cleanupJobs = await payload.find({
      collection: 'payload-jobs',
      where: { taskSlug: { equals: 'deleteRejectedSkillArchive' } },
      sort: '-createdAt',
      limit: 1,
      overrideAccess: true,
    })
    expect(cleanupJobs.docs[0]?.input).toMatchObject({ filename: rejectedSubmission.filename })
  })
})
