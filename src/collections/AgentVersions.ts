import type { Access, CollectionConfig, Where } from 'payload'

import { hasAdminRole, isContentAdmin } from '../access/isAdmin'
import { isActivePlatformUser } from '../access/isActivePlatformUser'

export const publicVersionWhere = (agentIds: number[]): Where | false => {
  if (!agentIds.length) return false

  return {
    and: [
      { status: { equals: 'published' } },
      { agent: { in: agentIds } },
    ],
  }
}

const readPublishedVersions: Access = async ({ req }) => {
  if (hasAdminRole(req.user)) return true

  const publishedAgents = await req.payload.find({
    collection: 'agents',
    where: { status: { equals: 'published' } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const published = publicVersionWhere(publishedAgents.docs.map((agent) => agent.id))

  if (!isActivePlatformUser(req.user)) return published

  const ownedAgents = await req.payload.find({
    collection: 'agents',
    where: { owner: { equals: req.user.id } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const ownedAgentIds = ownedAgents.docs.map((agent) => agent.id)
  if (!ownedAgentIds.length) return published || { id: { equals: -1 } }
  if (!published) return { agent: { in: ownedAgentIds } }

  return { or: [published, { agent: { in: ownedAgentIds } }] }
}

export const AgentVersions: CollectionConfig = {
  slug: 'agent-versions',
  indexes: [{ fields: ['agent', 'version'], unique: true }],
  labels: { singular: '智能体版本', plural: '智能体版本' },
  admin: { useAsTitle: 'version', defaultColumns: ['agent', 'version', 'channel', 'status', 'publishedAt'] },
  access: {
    admin: ({ req }) => isActivePlatformUser(req.user),
    read: readPublishedVersions,
    create: isContentAdmin,
    update: isContentAdmin,
    delete: isContentAdmin,
  },
  fields: [
    { name: 'agent', label: '智能体', type: 'relationship', relationTo: 'agents', required: true },
    { name: 'package', label: '本地 Skill 文件', type: 'relationship', relationTo: 'skill-submissions', admin: { readOnly: true } },
    { name: 'version', label: '版本号', type: 'text', required: true },
    { name: 'fileSize', label: '文件大小', type: 'text' },
    { name: 'changelog', label: '更新说明', type: 'textarea' },
    { name: 'downloadUrl', label: '下载地址', type: 'text' },
    {
      name: 'channel',
      label: '发布通道',
      type: 'select',
      defaultValue: 'stable',
      options: [
        { label: '正式版', value: 'stable' },
        { label: '测试版', value: 'beta' },
      ],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: '草稿', value: 'draft' },
        { label: '已发布', value: 'published' },
      ],
    },
    { name: 'publishedAt', label: '发布时间', type: 'date' },
  ],
}
