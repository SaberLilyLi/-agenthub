import { Forbidden, type CollectionAfterChangeHook, type CollectionConfig } from 'payload'
import { hasAdminRole, hasUserAdminRole, isUserAdmin } from '../../access/isAdmin'
import { isActivePlatformUser, isDisabledUser } from '../../access/isActivePlatformUser'
import { hasSuperAdminRole, isSuperAdmin } from '../../access/isSuperAdmin'

const revokeSkillSubmissionPermissionOnDisable: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  if (operation === 'update' && previousDoc.disabled !== true && doc.disabled === true) {
    await req.payload.update({
      collection: 'users',
      id: doc.id,
      data: { canSubmitSkills: false, skillSubmissionPermissionExpiresAt: null },
      overrideAccess: true,
      req,
    })
  }
  return doc
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: '用户', plural: '用户' },
  auth: true,
  hooks: {
    // Payload's REST auth endpoints bypass our Next.js route helpers, so deny
    // disabled accounts at login, token refresh, and /me as well.
    beforeLogin: [({ user, req }) => {
      if (isDisabledUser(user)) throw new Forbidden(req.t)
      return user
    }],
    refresh: [({ user, args }) => {
      if (isDisabledUser(user)) throw new Forbidden(args.req.t)
    }],
    me: [({ user, args }) => {
      if (isDisabledUser(user)) throw new Forbidden(args.req.t)
    }],
    afterChange: [revokeSkillSubmissionPermissionOnDisable],
  },
  admin: { useAsTitle: 'name' },
  access: {
    // Accounts are provisioned by user operators in the admin UI only.
    create: isUserAdmin,
    admin: ({ req }) => hasAdminRole(req.user),
    read: ({ req }) => (isUserAdmin({ req }) ? true : isActivePlatformUser(req.user) ? { id: { equals: req.user.id } } : false),
    update: ({ req }) => (isUserAdmin({ req }) ? true : isActivePlatformUser(req.user) ? { id: { equals: req.user.id } } : false),
    delete: isSuperAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 50 },
    { name: 'avatar', type: 'upload', relationTo: 'media' },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'user',
      // The route proxy uses this signed claim only as an early routing gate.
      // Collection access remains the authoritative authorization layer.
      saveToJWT: true,
      options: [
        { label: '超级管理员', value: 'superadmin' },
        { label: '系统管理员', value: 'system_admin' },
        { label: '内容运营', value: 'content_admin' },
        { label: 'Skill 审核员', value: 'reviewer' },
        { label: '用户运营', value: 'user_admin' },
        { label: '付费用户', value: 'paid_user' },
        { label: '普通用户', value: 'user' },
      ],
      access: { create: ({ req }) => hasSuperAdminRole(req.user), update: ({ req }) => hasSuperAdminRole(req.user) },
    },
    { name: 'disabled', type: 'checkbox', defaultValue: false, access: { create: ({ req }) => hasUserAdminRole(req.user), update: ({ req }) => hasUserAdminRole(req.user) } },
    {
      name: 'membershipStatus',
      type: 'select',
      defaultValue: 'free',
      options: ['free', 'active', 'expired', 'cancelled'],
      access: { create: ({ req }) => hasUserAdminRole(req.user), update: ({ req }) => hasUserAdminRole(req.user) },
    },
    { name: 'membershipExpiresAt', type: 'date', access: { create: ({ req }) => hasUserAdminRole(req.user), update: ({ req }) => hasUserAdminRole(req.user) } },
    {
      name: 'plan',
      type: 'select',
      options: ['monthly', 'yearly', 'lifetime'],
      access: { create: ({ req }) => hasUserAdminRole(req.user), update: ({ req }) => hasUserAdminRole(req.user) },
    },
    {
      name: 'canSubmitSkills',
      label: '允许投稿 Skill',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', readOnly: true, description: '由“Skill 上传权限申请”审核通过后自动授予。' },
      // This is a workflow-derived entitlement. Only the request hooks may change it.
      access: { create: () => false, update: () => false },
    },
    {
      name: 'skillSubmissionPermissionExpiresAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true, description: '投稿权限过期时间；由权限申请审核流程维护。' },
      access: { create: () => false, update: () => false },
    },
  ],
}
