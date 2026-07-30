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
  admin: { useAsTitle: 'requester', defaultColumns: ['requester', 'status', 'updatedAt'] },
  access: {
    read: ({ req }) => (hasReviewerRole(req.user) ? true : isActivePlatformUser(req.user) ? { requester: { equals: req.user.id } } : false),
    create: ({ req }) => isActivePlatformUser(req.user),
    update: isReviewer,
    delete: isSystemAdmin,
  },
  hooks: {
    beforeChange: [({ data, operation, req }) => {
      if (operation === 'create') {
        data.requester = req.user?.id
        data.status = 'pending'
      }
      return data
    }],
    afterChange: [syncChangedRequestPermission],
    afterDelete: [syncDeletedRequestPermission],
  },
  fields: [
    { name: 'requester', label: '申请用户', type: 'relationship', relationTo: 'users', required: true, admin: { readOnly: true } },
    { name: 'reason', label: '申请说明', type: 'textarea', maxLength: 500 },
    {
      name: 'status', label: '审核状态', type: 'select', required: true, defaultValue: 'pending',
      options: [{ label: '待审核', value: 'pending' }, { label: '通过', value: 'approved' }, { label: '拒绝', value: 'rejected' }],
      access: { create: () => false, update: ({ req }) => hasReviewerRole(req.user) },
    },
  ],
}
