import type { CollectionConfig } from 'payload'

import { hasAdminRole, isAdmin } from '../access/isAdmin'
import { isActivePlatformUser } from '../access/isActivePlatformUser'

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
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, unique: true },
    { name: 'status', type: 'select', required: true, defaultValue: 'active', options: ['active', 'revoked', 'expired'] },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'grantedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    { name: 'grantedFromRequest', type: 'relationship', relationTo: 'skill-upload-requests', admin: { readOnly: true } },
    { name: 'revokedAt', type: 'date', admin: { readOnly: true } },
    { name: 'revokeReason', type: 'textarea', admin: { readOnly: true } },
  ],
}
