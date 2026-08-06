import type {
  Access,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  Where,
} from 'payload'

import { hasContentAdminRole, hasReviewerRole } from '../access/isAdmin'
import { isActivePlatformUser } from '../access/isActivePlatformUser'

const readAgents: Access = ({ req }) => {
  if (hasContentAdminRole(req.user) || hasReviewerRole(req.user)) return true
  if (isActivePlatformUser(req.user)) {
    const visible: Where = { or: [{ status: { equals: 'published' } }, { owner: { equals: req.user.id } }] }
    return visible
  }
  return { status: { equals: 'published' } }
}

const createAgent: Access = ({ req }) => isActivePlatformUser(req.user)

const updateAgent: Access = ({ req }) => {
  if (hasContentAdminRole(req.user)) return true
  if (!isActivePlatformUser(req.user)) return false
  const ownDraft: Where = { and: [{ owner: { equals: req.user.id } }, { status: { equals: 'draft' } }] }
  return ownDraft
}

const deleteAgent: Access = ({ req }) => {
  if (hasContentAdminRole(req.user)) return true
  if (!isActivePlatformUser(req.user)) return false
  const ownDraft: Where = { and: [{ owner: { equals: req.user.id } }, { status: { equals: 'draft' } }] }
  return ownDraft
}

const protectContributorFields: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (req.context.skillReviewPublication === true) return data
  if (hasContentAdminRole(req.user)) return data
  if (!isActivePlatformUser(req.user)) return data

  if (operation === 'create') data.owner = req.user.id
  data.featured = false
  data.status = 'draft'
  data.publishedAt = null
  if (operation === 'create') data.downloadCount = 0
  return data
}

/**
 * Child FKs use ON DELETE SET NULL while agent_id columns are NOT NULL.
 * Delete dependents first so admin/API agent deletes do not hit Postgres 23502.
 */
const cascadeDeleteAgentRelations: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const agentId = typeof id === 'number' ? id : Number(id)
  if (!Number.isFinite(agentId)) return

  const whereAgent = { agent: { equals: agentId } } as const
  const shared = { overrideAccess: true as const, req }

  await req.payload.delete({ collection: 'download-records', where: whereAgent, ...shared })
  await req.payload.delete({ collection: 'favorites', where: whereAgent, ...shared })
  await req.payload.delete({ collection: 'agent-versions', where: whereAgent, ...shared })

  const linkedSubmissions = await req.payload.find({
    collection: 'skill-submissions',
    where: whereAgent,
    depth: 0,
    limit: 1000,
    pagination: false,
    ...shared,
  })
  for (const submission of linkedSubmissions.docs) {
    await req.payload.update({
      collection: 'skill-submissions',
      id: submission.id,
      data: { agent: null },
      ...shared,
    })
  }
}

const contentAdminOnly = ({ req }: { req: { user?: unknown } }) => hasContentAdminRole(req.user)
const showToContentAdmin = (_data: unknown, _siblingData: unknown, { user }: { user?: unknown }) => hasContentAdminRole(user)

export const Agents: CollectionConfig = {
  slug: 'agents',
  labels: { singular: '智能体', plural: '智能体' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'status', 'featured', 'publishedAt', 'downloadCount'],
  },
  access: {
    admin: ({ req }) => isActivePlatformUser(req.user),
    read: readAgents,
    create: createAgent,
    update: updateAgent,
    delete: deleteAgent,
  },
  hooks: {
    beforeChange: [protectContributorFields],
    beforeDelete: [cascadeDeleteAgentRelations],
  },
  fields: [
    {
      name: 'owner',
      label: '创建用户',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar', readOnly: true, condition: showToContentAdmin },
      access: { create: () => false, update: () => false },
    },
    { name: 'name', label: '名称', type: 'text', required: true },
    { name: 'slug', label: '标识', type: 'text', required: true, unique: true },
    { name: 'summary', label: '简介', type: 'textarea', required: true, maxLength: 180 },
    { name: 'description', label: '详细介绍', type: 'textarea' },
    { name: 'category', label: '分类', type: 'relationship', relationTo: 'categories', required: true },
    { name: 'tags', label: '标签', type: 'array', fields: [{ name: 'tag', label: '标签', type: 'text' }] },
    {
      name: 'cover',
      label: '封面图',
      type: 'upload',
      relationTo: 'media',
      admin: { condition: showToContentAdmin },
      access: { create: contentAdminOnly, update: contentAdminOnly },
    },
    {
      name: 'screenshots',
      label: '截图',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: { condition: showToContentAdmin },
      access: { create: contentAdminOnly, update: contentAdminOnly },
    },
    {
      name: 'demoUrl',
      label: '演示地址',
      type: 'text',
      admin: {
        placeholder: '/oneManCompany 或 https://example.com/demo',
        description:
          '本地与线上共用：填相对路径（如 /oneManCompany）会按当前访问域名自动打开；外链演示则填完整 https 地址。',
      },
    },
    {
      name: 'featured',
      label: '推荐展示',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', condition: showToContentAdmin },
      access: { create: contentAdminOnly, update: contentAdminOnly },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: '草稿', value: 'draft' },
        { label: '已发布', value: 'published' },
        { label: '已归档', value: 'archived' },
      ],
      admin: { position: 'sidebar', condition: showToContentAdmin },
      access: { create: contentAdminOnly, update: contentAdminOnly },
    },
    {
      name: 'publishedAt',
      label: '发布时间',
      type: 'date',
      admin: { position: 'sidebar', condition: showToContentAdmin },
      access: { create: contentAdminOnly, update: contentAdminOnly },
    },
    {
      name: 'packageUpload',
      label: 'Skill 文件投稿',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '@/components/admin/AgentPackageUpload#AgentPackageUpload' },
      },
    },
    {
      name: 'downloadCount',
      label: '下载次数',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true, condition: showToContentAdmin },
      access: { create: contentAdminOnly, update: contentAdminOnly },
    },
  ],
}
