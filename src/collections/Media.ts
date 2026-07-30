import type { CollectionConfig } from 'payload'
import path from 'path'
import { isContentAdmin } from '../access/isAdmin'
export const Media: CollectionConfig = { slug: 'media', labels: { singular: '媒体文件', plural: '媒体文件' }, access: { read: () => true, create: isContentAdmin, update: isContentAdmin, delete: isContentAdmin }, upload: { staticDir: path.resolve(process.cwd(), 'media'), mimeTypes: ['image/*'] }, fields: [{ name: 'alt', label: '替代文本', type: 'text', required: true }] }
