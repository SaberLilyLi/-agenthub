import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig, PayloadRequest } from 'payload'

import { hasReviewerRole, isReviewer, isSystemAdmin } from '../access/isAdmin'
import { isActivePlatformUser } from '../access/isActivePlatformUser'
import { skillSubmissionPermissionExpiry } from '../access/skillSubmissionPermission'

const requesterIdOf = (requester: number | { id: number }) =>
  typeof requester === 'number' ? requester : requester.id

/** Keep the user flag derived from approved requests, rather than granting it permanently. */
const syncSkillSubmissionPermission = async (
  requester: number | { id: number },
  req: PayloadRequest,
  renewExpiry = false,
) => {
  const requesterId = requesterIdOf(requester)
  const user = await req.payload.findByID({ collection: 'users', id: requesterId, depth: 0, overrideAccess: true, req })
  const approved = await req.payload.find({
    collection: 'skill-upload-requests',
    where: { and: [{ requester: { equals: requesterId } }, { status: { equals: 'approved' } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const canSubmitSkills = approved.docs.length > 0 && !user.disabled
  const existingExpiry = user.skillSubmissionPermissionExpiresAt
  const expiry = canSubmitSkills
    ? renewExpiry || typeof existingExpiry !== 'string'
      ? skillSubmissionPermissionExpiry()
      : existingExpiry
    : null

  await req.payload.update({
    collection: 'users',
    id: requesterId,
    data: { canSubmitSkills, skillSubmissionPermissionExpiresAt: expiry },
    overrideAccess: true,
    req,
  })

  const existingPermission = await req.payload.find({ collection: 'skill-submission-permissions', where: { user: { equals: requesterId } }, limit: 1, depth: 0, overrideAccess: true, req })
  const data = canSubmitSkills
    ? { user: requesterId, status: 'active' as const, expiresAt: expiry || skillSubmissionPermissionExpiry(), grantedFromRequest: approved.docs[0]?.id }
    : { user: requesterId, status: 'revoked' as const, expiresAt: new Date().toISOString(), revokedAt: new Date().toISOString(), revokeReason: '资格申请已失效或账户已禁用' }
  if (existingPermission.docs[0]) await req.payload.update({ collection: 'skill-submission-permissions', id: existingPermission.docs[0].id, data, overrideAccess: true, req })
  else await req.payload.create({ collection: 'skill-submission-permissions', data, overrideAccess: true, req })
}

const syncChangedRequestPermission: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  const newlyApproved = doc.status === 'approved' && (operation === 'create' || previousDoc.status !== 'approved')
  await syncSkillSubmissionPermission(doc.requester, req, newlyApproved)
  return doc
}

const syncDeletedRequestPermission: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await syncSkillSubmissionPermission(doc.requester, req)
  return doc
}

export const SkillUploadRequests: CollectionConfig = {
  slug: 'skill-upload-requests',
  labels: { singular: 'Skill 上传权限申请', plural: 'Skill 上传权限申请' },
  admin: { useAsTitle: 'requester', defaultColumns: ['requester', 'status', 'updatedAt'], hidden: ({ user }) => !hasReviewerRole(user) },
  access: {
    admin: ({ req }) => hasReviewerRole(req.user),
    read: ({ req }) => (hasReviewerRole(req.user) ? true : isActivePlatformUser(req.user) ? { requester: { equals: req.user.id } } : false),
    // Requests are created only through the guarded endpoint, which enforces
    // active-permission and duplicate-pending checks before insert.
    create: () => false,
    update: isReviewer,
    delete: isSystemAdmin,
  },
  hooks: {
    beforeChange: [({ data, operation, originalDoc, req }) => {
      if (operation === 'create') {
        data.requester = req.user?.id
        data.status = 'pending'
      }
      if (operation === 'update' && data.status && data.status !== originalDoc?.status && ['approved', 'rejected'].includes(String(data.status))) {
        if (!String(data.reviewNote || '').trim()) throw new Error('审批通过或拒绝时必须填写审批意见')
        data.reviewer = req.user?.id
        data.reviewedAt = new Date().toISOString()
      }
      return data
    }],
    afterChange: [syncChangedRequestPermission],
    afterDelete: [syncDeletedRequestPermission],
  },
  fields: [
    { name: 'reviewer', type: 'relationship', relationTo: 'users', admin: { readOnly: true }, access: { create: () => false, update: () => false } },
    { name: 'reviewNote', type: 'textarea', maxLength: 1000, access: { create: () => false, update: ({ req }) => hasReviewerRole(req.user) } },
    { name: 'reviewedAt', type: 'date', admin: { readOnly: true }, access: { create: () => false, update: () => false } },
    { name: 'requester', label: '申请用户', type: 'relationship', relationTo: 'users', required: true, admin: { readOnly: true } },
    { name: 'reason', label: '申请说明', type: 'textarea', maxLength: 500 },
    {
      name: 'status', label: '审核状态', type: 'select', required: true, defaultValue: 'pending',
      options: [{ label: '待审核', value: 'pending' }, { label: '通过', value: 'approved' }, { label: '拒绝', value: 'rejected' }],
      access: { create: () => false, update: ({ req }) => hasReviewerRole(req.user) },
    },
  ],
}
