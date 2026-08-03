import type { CollectionConfig } from 'payload'
import path from 'path'
import { hasContentAdminRole, isContentAdmin } from '../access/isAdmin'
export const Media: CollectionConfig = { slug: 'media', labels: { singular: '媒体文件', plural: '媒体文件' }, admin: { hidden: ({ user }) => !hasContentAdminRole(user) }, access: { admin: ({ req }) => hasContentAdminRole(req.user), read: () => true, create: isContentAdmin, update: isContentAdmin, delete: isContentAdmin }, upload: { staticDir: path.resolve(process.cwd(), 'media'), mimeTypes: ['image/*'] }, fields: [{ name: 'alt', label: '替代文本', type: 'text', required: true }] }
