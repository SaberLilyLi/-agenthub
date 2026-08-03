import type { CollectionConfig } from 'payload'

import { hasSystemAdminRole, isSystemAdmin } from '../access/isAdmin'
import { isActivePlatformUser } from '../access/isActivePlatformUser'

export const DownloadRecords: CollectionConfig = {
  slug: 'download-records',
  labels: { singular: '下载记录', plural: '下载记录' },
  admin: { hidden: ({ user }) => !hasSystemAdminRole(user) },
  access: {
    admin: ({ req }) => hasSystemAdminRole(req.user),
    create: () => false,
    read: ({ req }) => isSystemAdmin({ req }) ? true : isActivePlatformUser(req.user) ? { user: { equals: req.user.id } } : false,
    update: () => false,
    delete: isSystemAdmin,
  },
  fields: [
    { name: 'user', label: '用户', type: 'relationship', relationTo: 'users' },
    { name: 'agent', label: '智能体', type: 'relationship', relationTo: 'agents', required: true },
    { name: 'version', label: '版本', type: 'relationship', relationTo: 'agent-versions', required: true },
    { name: 'actorType', label: '访问身份', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'requestId', label: '请求标识', type: 'text', required: true, unique: true, admin: { readOnly: true } },
    { name: 'ipHash', label: '客户端 IP HMAC', type: 'text', admin: { readOnly: true } },
    { name: 'ipHashKeyVersion', label: 'IP 哈希密钥版本', type: 'text', admin: { readOnly: true } },
    { name: 'userAgent', label: 'User-Agent', type: 'text', maxLength: 512, admin: { readOnly: true } },
  ],
}
