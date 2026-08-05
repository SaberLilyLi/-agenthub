import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { hasAdminRole, isAdmin } from '../access/isAdmin'
import { isActivePlatformUser } from '../access/isActivePlatformUser'

const auditRevocation: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  const becomesRevoked = data.status === 'revoked' && (operation === 'create' || originalDoc?.status !== 'revoked')
  if (becomesRevoked) {
    if (!String(data.revokeReason || '').trim()) throw new Error('撤销投稿资格时必须填写撤销原因')
    data.revokedAt = new Date().toISOString()
  }
  if (operation === 'update' && originalDoc?.status === 'revoked' && data.status === 'active') {
    data.grantedBy = req.user?.id
    data.revokedAt = null
    data.revokeReason = null
  }
  return data
}

export const SkillSubmissionPermissions: CollectionConfig = {
  slug: 'skill-submission-permissions',
  labels: { singular: '投稿资格', plural: '投稿资格' },
  admin: { useAsTitle: 'user', hidden: ({ user }) => !hasAdminRole(user) },
  access: {
    admin: ({ req }) => hasAdminRole(req.user),
    read: ({ req }) => hasAdminRole(req.user) ? true : isActivePlatformUser(req.user) ? { user: { equals: req.user.id } } : false,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: { beforeChange: [auditRevocation] },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, unique: true },
    { name: 'status', type: 'select', required: true, defaultValue: 'active', options: ['active', 'revoked', 'expired'] },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'grantedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'grantedFromRequest', type: 'relationship', relationTo: 'skill-upload-requests', admin: { readOnly: true } },
    { name: 'revokedAt', type: 'date', admin: { readOnly: true } },
    { name: 'revokeReason', type: 'textarea', maxLength: 500 },
  ],
}
