import path from 'path'

import type { CollectionAfterChangeHook, CollectionConfig, Where } from 'payload'

import { hasReviewerRole, isReviewer, isSystemAdmin } from '../access/isAdmin'
import { isActivePlatformUser } from '../access/isActivePlatformUser'
import { localSkillSubmissionUrl, skillFileTypes } from '../lib/skillSubmission'

const relationId = (value: number | { id: number }) => typeof value === 'number' ? value : value.id

const publishApprovedSubmission: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  if (operation !== 'update' || previousDoc.reviewStatus === 'approved' || doc.reviewStatus !== 'approved') return doc

  const ownerId = relationId(doc.owner)
  let agent

  if (doc.agent) {
    agent = await req.payload.findByID({
      collection: 'agents',
      id: relationId(doc.agent),
      depth: 0,
      overrideAccess: true,
      req,
    })
  } else {
    const duplicate = await req.payload.find({
      collection: 'agents',
      where: { slug: { equals: doc.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (duplicate.docs.length) throw new Error(`slug “${doc.slug}” 已被使用，无法发布`)

    agent = await req.payload.create({
      collection: 'agents',
      data: {
        owner: ownerId,
        name: doc.name,
        slug: doc.slug,
        summary: doc.summary,
        description: doc.description,
        category: relationId(doc.category),
        tags: doc.tags,
        status: 'published',
        publishedAt: new Date().toISOString(),
      },
      context: { skillReviewPublication: true },
      overrideAccess: true,
      req,
    })
  }

  const downloadUrl = localSkillSubmissionUrl(doc.url)
  const existingVersions = await req.payload.find({
    collection: 'agent-versions',
    where: { and: [{ agent: { equals: agent.id } }, { version: { equals: doc.version } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const versionData = {
    agent: agent.id,
    package: doc.id,
    version: doc.version,
    fileSize: `${doc.filesize || 0} B`,
    changelog: doc.changelog || '用户投稿，审核通过后发布。',
    downloadUrl,
    channel: 'stable' as const,
    status: 'published' as const,
    publishedAt: new Date().toISOString(),
  }

  if (existingVersions.docs[0]) {
    await req.payload.update({
      collection: 'agent-versions',
      id: existingVersions.docs[0].id,
      data: versionData,
      overrideAccess: true,
      req,
    })
  } else {
    await req.payload.create({ collection: 'agent-versions', data: versionData, overrideAccess: true, req })
  }

  await req.payload.update({
    collection: 'agents',
    id: agent.id,
    data: { status: 'published', publishedAt: agent.publishedAt || new Date().toISOString() },
    context: { skillReviewPublication: true },
    overrideAccess: true,
    req,
  })

  return doc
}

const removeRejectedSubmission: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  if (operation === 'update' && previousDoc.reviewStatus !== 'rejected' && doc.reviewStatus === 'rejected' && doc.filename) {
    await req.payload.jobs.queue({
      task: 'deleteRejectedSkillArchive',
      input: { filename: doc.filename },
      queue: 'storage-cleanup',
      overrideAccess: true,
      req,
    })
  }
  return doc
}

export const SkillSubmissions: CollectionConfig = {
  slug: 'skill-submissions',
  labels: { singular: 'Skill 投稿', plural: 'Skill 投稿审核' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'owner', 'agent', 'slug', 'version', 'reviewStatus', 'updatedAt'],
    description: '压缩包保存在服务器本地持久卷中；管理员审核通过后才发布智能体版本。',
    hidden: ({ user }) => !hasReviewerRole(user),
  },
  access: {
    admin: ({ req }) => hasReviewerRole(req.user),
    read: ({ req }) => {
      if (hasReviewerRole(req.user)) return true
      if (isActivePlatformUser(req.user)) {
        const visible: Where = { or: [{ owner: { equals: req.user.id } }, { reviewStatus: { equals: 'approved' } }] }
        return visible
      }
      return { reviewStatus: { equals: 'approved' } }
    },
    // Uploads must pass through the custom routes so archive inspection cannot be bypassed.
    create: () => false,
    update: isReviewer,
    delete: isSystemAdmin,
  },
  upload: {
    staticDir: path.resolve(process.cwd(), 'skill-submissions'),
    mimeTypes: Object.values(skillFileTypes),
    filesRequiredOnCreate: true,
  },
  fields: [
    { name: 'reviewer', type: 'relationship', relationTo: 'users', admin: { readOnly: true }, access: { create: () => false, update: () => false } },
    { name: 'reviewNote', type: 'textarea', maxLength: 1000, access: { create: () => false, update: ({ req }) => hasReviewerRole(req.user) } },
    { name: 'reviewedAt', type: 'date', admin: { readOnly: true }, access: { create: () => false, update: () => false } },
    { name: 'owner', label: '投稿用户', type: 'relationship', relationTo: 'users', required: true, admin: { readOnly: true }, access: { create: () => false, update: () => false } },
    { name: 'agent', label: '目标智能体', type: 'relationship', relationTo: 'agents', admin: { readOnly: true }, access: { create: () => false, update: () => false } },
    { name: 'name', label: 'Skill 名称', type: 'text', required: true },
    { name: 'slug', label: '标识', type: 'text', required: true },
    { name: 'summary', label: '简介', type: 'textarea', required: true, maxLength: 180 },
    { name: 'description', label: '详细介绍', type: 'textarea' },
    { name: 'category', label: '分类', type: 'relationship', relationTo: 'categories', required: true },
    { name: 'tags', label: '标签', type: 'array', fields: [{ name: 'tag', label: '标签', type: 'text', required: true }] },
    { name: 'version', label: '版本号', type: 'text', required: true },
    { name: 'changelog', label: '更新说明', type: 'textarea' },
    {
      name: 'reviewStatus',
      label: '审核状态',
      type: 'select',
      defaultValue: 'pending',
      required: true,
      options: [
        { label: '待审核', value: 'pending' },
        { label: '通过（保存后发布）', value: 'approved' },
        { label: '拒绝', value: 'rejected' },
      ],
      access: { create: () => false, update: ({ req }) => hasReviewerRole(req.user) },
    },
  ],
  hooks: {
    beforeChange: [({ data, operation, originalDoc, req }) => {
      if (operation === 'create') {
        data.owner = data.owner || req.user?.id
        data.reviewStatus = 'pending'
      }
      if (operation === 'update' && req.file) throw new Error('投稿后不能替换压缩包，请创建新的投稿')
      if (operation === 'update' && data.reviewStatus && data.reviewStatus !== originalDoc?.reviewStatus && ['approved', 'rejected'].includes(String(data.reviewStatus))) {
        if (!String(data.reviewNote || '').trim()) throw new Error('审核通过或拒绝时必须填写审核意见')
        data.reviewer = req.user?.id
        data.reviewedAt = new Date().toISOString()
      }
      if (
        operation === 'update' &&
        ['approved', 'rejected'].includes(String(originalDoc?.reviewStatus)) &&
        data.reviewStatus !== originalDoc.reviewStatus
      ) {
        throw new Error('已完成审核的投稿不能再次修改审核状态')
      }
      return data
    }],
    afterChange: [publishApprovedSubmission, removeRejectedSubmission],
  },
}
