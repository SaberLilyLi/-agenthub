import path from 'path'

import { APIError, type CollectionAfterChangeHook, type CollectionConfig, type Where } from 'payload'

import { hasReviewerRole, isReviewer, isSystemAdmin } from '../access/isAdmin'
import { isActivePlatformUser } from '../access/isActivePlatformUser'
import { localSkillSubmissionUrl, skillFileTypes } from '../lib/skillSubmission'

const relationId = (value: number | { id: number }) => typeof value === 'number' ? value : value.id
const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const validVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

const reviewError = (message: string): never => {
  throw new APIError(message, 400)
}

const isEmpty = (value: unknown) => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return !value.trim()
  if (Array.isArray(value)) return value.length === 0
  return false
}

const publishApprovedSubmission: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  if (operation !== 'update' || previousDoc.reviewStatus === 'approved' || doc.reviewStatus !== 'approved') return doc

  try {
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
      if (duplicate.docs.length) reviewError(`slug “${doc.slug}” 已被使用，无法发布`)

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
  } catch (error) {
    if (error instanceof APIError) throw error
    reviewError(error instanceof Error ? error.message : '审核发布失败，请稍后重试')
  }
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

const notifySubmissionReview: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  if (operation === 'update' && doc.reviewStatus !== previousDoc.reviewStatus && ['approved', 'rejected'].includes(doc.reviewStatus)) {
    await req.payload.create({ collection: 'notifications', data: { user: relationId(doc.owner), type: doc.reviewStatus === 'approved' ? 'skill_approved' : 'skill_rejected', title: doc.reviewStatus === 'approved' ? 'Skill 审核已通过' : 'Skill 审核未通过', message: doc.reviewNote || '请前往个人中心查看审核结果。', link: '/me' }, overrideAccess: true, req })
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
    {
      name: 'owner',
      label: '投稿用户',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { readOnly: true },
      access: { create: () => false, update: () => false },
      validate: (value: unknown) => (isEmpty(value) ? '请选择投稿用户' : true),
    },
    { name: 'agent', label: '目标智能体', type: 'relationship', relationTo: 'agents', admin: { readOnly: true }, access: { create: () => false, update: () => false } },
    {
      name: 'name',
      label: 'Skill 名称',
      type: 'text',
      required: true,
      admin: { placeholder: '请输入 Skill 名称' },
      validate: (value: unknown) => (isEmpty(value) ? '请填写 Skill 名称' : true),
    },
    {
      name: 'slug',
      label: '标识',
      type: 'text',
      required: true,
      admin: { placeholder: '例如 workbuddy-desktop-helper', description: '仅小写字母、数字和连字符' },
      validate: (value: unknown) => {
        if (isEmpty(value)) return '请填写标识'
        if (!validSlug.test(String(value).trim())) return '标识仅支持小写字母、数字和连字符，例如 workbuddy-desktop-helper'
        return true
      },
    },
    {
      name: 'summary',
      label: '简介',
      type: 'textarea',
      required: true,
      maxLength: 180,
      admin: { placeholder: '请用一句话介绍该 Skill（180 字以内）' },
      validate: (value: unknown) => {
        if (isEmpty(value)) return '请填写简介'
        if (String(value).trim().length > 180) return '简介不能超过 180 字'
        return true
      },
    },
    { name: 'description', label: '详细介绍', type: 'textarea', admin: { placeholder: '可选，补充功能说明与使用场景' } },
    {
      name: 'category',
      label: '分类',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      validate: (value: unknown) => (isEmpty(value) ? '请选择分类' : true),
    },
    {
      name: 'tags',
      label: '标签',
      type: 'array',
      labels: { singular: '标签', plural: '标签' },
      fields: [{
        name: 'tag',
        label: '标签',
        type: 'text',
        required: true,
        validate: (value: unknown) => (isEmpty(value) ? '请填写标签' : true),
      }],
    },
    {
      name: 'version',
      label: '版本号',
      type: 'text',
      required: true,
      admin: { placeholder: '例如 1.0.0', description: '格式为 x.y.z' },
      validate: (value: unknown) => {
        if (isEmpty(value)) return '请填写版本号'
        if (!validVersion.test(String(value).trim())) return '版本号格式应为 x.y.z，例如 1.0.0'
        return true
      },
    },
    { name: 'changelog', label: '更新说明', type: 'textarea', admin: { placeholder: '可选，说明本版本改动' } },
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
      validate: (value: unknown) => (isEmpty(value) ? '请选择审核状态' : true),
    },
    {
      name: 'reviewNote',
      label: '审核意见',
      type: 'textarea',
      maxLength: 1000,
      admin: {
        placeholder: '审核通过或拒绝时必填',
        description: '将审核状态设为「通过」或「拒绝」时必须填写，保存前会校验',
      },
      access: { create: () => false, update: ({ req }) => hasReviewerRole(req.user) },
      validate: (value: unknown, { siblingData }) => {
        const status = String((siblingData as { reviewStatus?: string } | undefined)?.reviewStatus || '')
        if (['approved', 'rejected'].includes(status) && isEmpty(value)) {
          return '审核通过或拒绝时必须填写审核意见'
        }
        if (value && String(value).length > 1000) return '审核意见不能超过 1000 字'
        return true
      },
    },
    { name: 'reviewer', label: '审核人', type: 'relationship', relationTo: 'users', admin: { readOnly: true }, access: { create: () => false, update: () => false } },
    { name: 'reviewedAt', label: '审核时间', type: 'date', admin: { readOnly: true }, access: { create: () => false, update: () => false } },
  ],
  hooks: {
    beforeChange: [({ data, operation, originalDoc, req }) => {
      if (operation === 'create') {
        data.owner = data.owner || req.user?.id
        data.reviewStatus = 'pending'
      }
      if (operation === 'update' && req.file) reviewError('投稿后不能替换压缩包，请创建新的投稿')
      if (operation === 'update' && data.reviewStatus && data.reviewStatus !== originalDoc?.reviewStatus && ['approved', 'rejected'].includes(String(data.reviewStatus))) {
        if (!String(data.reviewNote || '').trim()) reviewError('审核通过或拒绝时必须填写审核意见')
        data.reviewer = req.user?.id
        data.reviewedAt = new Date().toISOString()
      }
      if (
        operation === 'update' &&
        ['approved', 'rejected'].includes(String(originalDoc?.reviewStatus)) &&
        data.reviewStatus !== originalDoc.reviewStatus
      ) {
        reviewError('已完成审核的投稿不能再次修改审核状态')
      }
      return data
    }],
    afterChange: [publishApprovedSubmission, removeRejectedSubmission, notifySubmissionReview],
  },
}
