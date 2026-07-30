import type { CollectionConfig } from 'payload'

import { hasContentAdminRole, isContentAdmin } from '../access/isAdmin'

const published = ({ req }: { req: { user?: unknown } }) =>
  hasContentAdminRole(req.user) ? true : { status: { equals: 'published' } }

export const Agents: CollectionConfig = {
  slug: 'agents',
  labels: { singular: '智能体', plural: '智能体' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'status', 'featured', 'publishedAt', 'downloadCount'],
  },
  access: { read: published, create: isContentAdmin, update: isContentAdmin, delete: isContentAdmin },
  fields: [
    { name: 'name', label: '名称', type: 'text', required: true },
    { name: 'slug', label: '标识', type: 'text', required: true, unique: true },
    { name: 'summary', label: '简介', type: 'textarea', required: true, maxLength: 180 },
    { name: 'description', label: '详细介绍', type: 'textarea' },
    { name: 'category', label: '分类', type: 'relationship', relationTo: 'categories', required: true },
    { name: 'tags', label: '标签', type: 'array', fields: [{ name: 'tag', label: '标签', type: 'text' }] },
    { name: 'cover', label: '封面图', type: 'upload', relationTo: 'media' },
    { name: 'screenshots', label: '截图', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'demoUrl', label: '演示地址', type: 'text' },
    { name: 'featured', label: '推荐展示', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
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
      admin: { position: 'sidebar' },
    },
    { name: 'publishedAt', label: '发布时间', type: 'date', admin: { position: 'sidebar' } },
    { name: 'downloadCount', label: '下载次数', type: 'number', defaultValue: 0, admin: { readOnly: true } },
  ],
}
