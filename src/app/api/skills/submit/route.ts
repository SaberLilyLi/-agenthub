import { NextRequest, NextResponse } from 'next/server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { deleteSubmissionFromCos, skillFileExtension, uploadSubmissionToCos } from '@/lib/skillSubmission'
import { payloadForRequest } from '@/lib/auth'
import { hasActiveSkillSubmissionPermission } from '@/access/skillSubmissionPermission'
import { inspectUpload } from '@/lib/uploadSecurity'
import { MAX_SKILL_FILE_BYTES, MAX_SKILL_FILE_LABEL } from '@/lib/uploadLimits'

export const runtime = 'nodejs'

const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const validVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

export async function POST(request: NextRequest) {
  const { user } = await payloadForRequest(request)
  if (!user || user.collection !== 'users') return NextResponse.json({ message: '请先登录后再投稿' }, { status: 401 })
  if (!hasActiveSkillSubmissionPermission(user)) return NextResponse.json({ message: 'Skill 投稿权限不存在、已到期或已被撤销' }, { status: 403 })

  const form = await request.formData()
  const file = form.get('file')
  const name = String(form.get('name') || '').trim()
  const slug = String(form.get('slug') || '').trim()
  const summary = String(form.get('summary') || '').trim()
  const description = String(form.get('description') || '').trim()
  const category = Number(form.get('category'))
  const version = String(form.get('version') || '').trim()
  const changelog = String(form.get('changelog') || '').trim()
  const tags = String(form.get('tags') || '').split(/[,，]/).map((tag) => tag.trim()).filter(Boolean).map((tag) => ({ tag }))

  if (!(file instanceof File) || !name || !validSlug.test(slug) || !summary || !Number.isInteger(category) || !validVersion.test(version)) {
    return NextResponse.json({ message: '请完整填写名称、slug、简介、分类和规范版本号，并选择投稿文件' }, { status: 400 })
  }
  if (!skillFileExtension(file.name) || file.size === 0 || file.size > MAX_SKILL_FILE_BYTES) {
    return NextResponse.json({ message: `仅支持不超过 ${MAX_SKILL_FILE_LABEL} 的 ZIP 或 RAR 压缩包` }, { status: 413 })
  }

  const payload = await getPayload({ config })
  let storageKey: string | undefined
  try {
    const data = Buffer.from(await file.arrayBuffer())
    await inspectUpload(data, file.name)
    const uploaded = await uploadSubmissionToCos({ data, filename: file.name, slug, version })
    storageKey = uploaded.key
    const submission = await payload.create({
      collection: 'skill-submissions',
      data: { owner: user.id, name, slug, summary, description, category, version, changelog, tags, storageKey: uploaded.key, fileName: file.name, fileSize: uploaded.fileSize, reviewStatus: 'pending' },
      user,
      draft: false,
      overrideAccess: false,
    })
    return NextResponse.json({ id: submission.id, message: '投稿已提交，审核通过后才会上传至 COS 并展示在 Agent 广场。' }, { status: 201 })
  } catch (error) {
    await deleteSubmissionFromCos(storageKey).catch(() => undefined)
    const message = error instanceof Error ? error.message : '投稿提交失败，请稍后重试'
    return NextResponse.json({ message }, { status: 400 })
  }
}
