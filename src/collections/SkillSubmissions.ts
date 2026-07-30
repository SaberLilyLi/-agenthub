import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

import { hasReviewerRole, isSystemAdmin } from '../access/isAdmin'
import { isActivePlatformUser } from '../access/isActivePlatformUser'
import { hasActiveSkillSubmissionPermission } from '../access/skillSubmissionPermission'
import { cosPublicUrl } from '../lib/cos'

const publishApprovedSubmission: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  if (operation !== 'update' || previousDoc.reviewStatus === 'approved' || doc.reviewStatus !== 'approved') return doc
  if (!doc.storageKey) throw new Error('投稿对象缺失，无法发布')
  const duplicate = await req.payload.find({ collection: 'agents', where: { slug: { equals: doc.slug } }, limit: 1, depth: 0, overrideAccess: true, req })
  if (duplicate.docs.length) throw new Error(`slug “${doc.slug}” 已被使用，无法发布`)
  const agent = await req.payload.create({ collection: 'agents', data: { name: doc.name, slug: doc.slug, summary: doc.summary, description: doc.description, category: typeof doc.category === 'number' ? doc.category : doc.category.id, tags: doc.tags, status: 'published', publishedAt: new Date().toISOString() }, overrideAccess: true, req })
  await req.payload.create({ collection: 'agent-versions', data: { agent: agent.id, version: doc.version, fileSize: `${doc.fileSize || 0} B`, changelog: doc.changelog || '用户投稿，审核通过后发布。', downloadUrl: cosPublicUrl(doc.storageKey), channel: 'stable', status: 'published', publishedAt: new Date().toISOString() }, overrideAccess: true, req })
  return doc
}

const removeRejectedSubmission: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  if (operation === 'update' && previousDoc.reviewStatus !== 'rejected' && doc.reviewStatus === 'rejected') {
    await req.payload.jobs.queue({
      task: 'deleteRejectedSkillArchive',
      input: { storageKey: doc.storageKey },
      queue: 'storage-cleanup',
      overrideAccess: true,
      req,
    })
  }
  return doc
}

export const SkillSubmissions: CollectionConfig = {
  slug: 'skill-submissions', labels: { singular: 'Skill 投稿', plural: 'Skill 投稿审核' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'owner', 'slug', 'version', 'reviewStatus', 'updatedAt'], description: '文件经安全检查后直接存入 COS；本地不保存上传文件。拒绝后保留审核记录，并通过持久化任务清理 COS 对象。' },
  access: {
    read: ({ req }) => hasReviewerRole(req.user) ? true : isActivePlatformUser(req.user) ? { owner: { equals: req.user.id } } : false,
    create: ({ req }) => hasActiveSkillSubmissionPermission(req.user),
    update: ({ req }) => hasReviewerRole(req.user) ? true : hasActiveSkillSubmissionPermission(req.user) ? { owner: { equals: (req.user as { id: number }).id }, reviewStatus: { equals: 'pending' } } : false,
    delete: isSystemAdmin,
  },
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true, admin: { readOnly: true } },
    { name: 'name', type: 'text', required: true }, { name: 'slug', type: 'text', required: true, unique: true }, { name: 'summary', type: 'textarea', required: true, maxLength: 180 }, { name: 'description', type: 'textarea' },
    { name: 'category', type: 'relationship', relationTo: 'categories', required: true }, { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text', required: true }] }, { name: 'version', type: 'text', required: true }, { name: 'changelog', type: 'textarea' },
    { name: 'storageKey', type: 'text', required: true, admin: { readOnly: true } }, { name: 'fileName', type: 'text', required: true, admin: { readOnly: true } }, { name: 'fileSize', type: 'number', required: true, admin: { readOnly: true } },
    { name: 'reviewStatus', type: 'select', defaultValue: 'pending', required: true, options: [{ label: '待审核', value: 'pending' }, { label: '通过（保存后发布）', value: 'approved' }, { label: '拒绝（保留记录并清理文件）', value: 'rejected' }], access: { create: () => false, update: ({ req }) => hasReviewerRole(req.user) } },
  ],
  hooks: { beforeChange: [({ data, operation, req }) => { if (operation === 'create') { data.owner = req.user?.id; data.reviewStatus = 'pending' } return data }], afterChange: [publishApprovedSubmission, removeRejectedSubmission] },
}
