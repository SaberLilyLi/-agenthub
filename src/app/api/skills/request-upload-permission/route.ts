import { NextRequest, NextResponse } from 'next/server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { payloadForRequest } from '@/lib/auth'
import { hasActiveSkillSubmissionPermission } from '@/access/skillSubmissionPermission'

export async function POST(request: NextRequest) {
  const { user } = await payloadForRequest(request)
  if (!user || user.collection !== 'users') return NextResponse.json({ message: '请先登录后再申请权限' }, { status: 401 })
  if (hasActiveSkillSubmissionPermission(user)) return NextResponse.json({ message: '你已拥有 Skill 投稿权限' }, { status: 409 })

  const { reason = '' } = await request.json().catch(() => ({})) as { reason?: unknown }
  const payload = await getPayload({ config })
  const permission = await payload.find({ collection: 'skill-submission-permissions', where: { user: { equals: user.id } }, limit: 1, depth: 0, overrideAccess: true })
  if (hasActiveSkillSubmissionPermission(permission.docs[0])) return NextResponse.json({ message: '已有有效投稿资格' }, { status: 409 })
  const existing = await payload.find({ collection: 'skill-upload-requests', where: { and: [{ requester: { equals: user.id } }, { status: { equals: 'pending' } }] }, limit: 1, depth: 0, user, overrideAccess: false })
  if (existing.docs.length) return NextResponse.json({ message: '你的上传权限申请正在审核中' }, { status: 409 })

  try {
    await payload.create({
      collection: 'skill-upload-requests',
      data: { requester: user.id, reason: String(reason).trim().slice(0, 500), status: 'pending' },
      user,
      draft: false,
      overrideAccess: true,
    })
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
      return NextResponse.json({ message: '已有待审核的投稿资格申请' }, { status: 409 })
    }
    throw error
  }
  return NextResponse.json({ message: '申请已提交，管理员审核通过后即可投稿 Skill。' }, { status: 201 })
}
