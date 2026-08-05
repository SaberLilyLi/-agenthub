import { Forbidden, type CollectionAfterChangeHook, type CollectionConfig } from 'payload'

import { hasAdminRole, hasUserAdminRole, isUserAdmin } from '../../access/isAdmin'
import { isActivePlatformUser, isDisabledUser } from '../../access/isActivePlatformUser'
import { hasSuperAdminRole, isSuperAdmin } from '../../access/isSuperAdmin'

const revokeSkillSubmissionPermissionOnDisable: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  if (operation === 'update' && previousDoc.disabled !== true && doc.disabled === true) {
    await req.payload.update({ collection: 'users', id: doc.id, data: { canSubmitSkills: false, skillSubmissionPermissionExpiresAt: null }, overrideAccess: true, req })
  }
  return doc
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: '用户', plural: '用户' },
  auth: true,
  hooks: {
    beforeLogin: [({ user, req }) => { if (isDisabledUser(user)) throw new Forbidden(req.t); return user }],
    refresh: [({ user, args }) => { if (isDisabledUser(user)) throw new Forbidden(args.req.t) }],
    me: [({ user, args }) => { if (isDisabledUser(user)) throw new Forbidden(args.req.t) }],
    afterChange: [revokeSkillSubmissionPermissionOnDisable],
  },
  admin: { useAsTitle: 'name', hidden: ({ user }) => !hasAdminRole(user) },
  access: {
    create: isUserAdmin,
    admin: ({ req }) => isActivePlatformUser(req.user),
    read: ({ req }) => isUserAdmin({ req }) ? true : isActivePlatformUser(req.user) ? { id: { equals: req.user.id } } : false,
    update: ({ req }) => isUserAdmin({ req }) ? true : isActivePlatformUser(req.user) ? { id: { equals: req.user.id } } : false,
    delete: isSuperAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 50 },
    { name: 'avatar', type: 'upload', relationTo: 'media' },
    { name: 'role', type: 'select', defaultValue: 'user', saveToJWT: true, options: [{ label: '超级管理员', value: 'superadmin' }, { label: '管理员', value: 'admin' }, { label: '用户', value: 'user' }], access: { create: ({ req }) => hasSuperAdminRole(req.user), update: ({ req }) => hasSuperAdminRole(req.user) } },
    { name: 'disabled', type: 'checkbox', defaultValue: false, access: { create: ({ req }) => hasUserAdminRole(req.user), update: ({ req }) => hasUserAdminRole(req.user) } },
    { name: 'canSubmitSkills', label: '允许投稿 Skill', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', readOnly: true }, access: { create: () => false, update: () => false } },
    { name: 'skillSubmissionPermissionExpiresAt', type: 'date', admin: { position: 'sidebar', readOnly: true }, access: { create: () => false, update: () => false } },
  ],
}
