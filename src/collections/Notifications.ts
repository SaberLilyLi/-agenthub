import type { CollectionConfig } from 'payload'
import { hasAdminRole } from '../access/isAdmin'
import { isActivePlatformUser } from '../access/isActivePlatformUser'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  labels: { singular: '站内通知', plural: '站内通知' },
  admin: { useAsTitle: 'title', hidden: ({ user }) => !hasAdminRole(user) },
  access: {
    admin: ({ req }) => hasAdminRole(req.user),
    read: ({ req }) => hasAdminRole(req.user) ? true : isActivePlatformUser(req.user) ? { user: { equals: req.user.id } } : false,
    create: ({ req }) => hasAdminRole(req.user),
    update: ({ req }) => isActivePlatformUser(req.user) ? { user: { equals: req.user.id } } : false,
    delete: ({ req }) => hasAdminRole(req.user),
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, admin: { readOnly: true } },
    { name: 'type', type: 'select', required: true, options: ['permission_approved', 'permission_rejected', 'skill_approved', 'skill_rejected'] },
    { name: 'title', type: 'text', required: true },
    { name: 'message', type: 'textarea', required: true },
    { name: 'link', type: 'text' },
    { name: 'readAt', type: 'date' },
  ],
}
