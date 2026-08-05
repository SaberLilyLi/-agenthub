import { NextRequest, NextResponse } from 'next/server'

import { payloadForRequest } from '@/lib/auth'
import { skillFileExtension, skillFileTypes } from '@/lib/skillSubmission'
import { inspectUpload } from '@/lib/uploadSecurity'
import { MAX_SKILL_FILE_BYTES, MAX_SKILL_FILE_LABEL } from '@/lib/uploadLimits'
import { hasActiveSkillSubmissionPermission } from '@/access/skillSubmissionPermission'

export const runtime = 'nodejs'

const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const validVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

export async function POST(request: NextRequest) {
  const { payload, user } = await payloadForRequest(request)
  if (!user) return NextResponse.json({ message: '请先登录后再投稿' }, { status: 401 })

  const permission = await payload.find({ collection: 'skill-submission-permissions', where: { user: { equals: user.id } }, limit: 1, depth: 0, overrideAccess: true })
  if (!hasActiveSkillSubmissionPermission(permission.docs[0])) {
    return NextResponse.json({ message: '当前账户尚无有效的 Skill 投稿资格，请先申请并等待审核。' }, { status: 403 })
  }

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

  const extension = skillFileExtension(file.name)
  if (!extension || file.size === 0 || file.size > MAX_SKILL_FILE_BYTES) {
    return NextResponse.json({ message: `仅支持不超过 ${MAX_SKILL_FILE_LABEL} 的 ZIP 或 RAR 压缩包` }, { status: 413 })
  }

  try {
    const data = Buffer.from(await file.arrayBuffer())
    await inspectUpload(data, file.name)
    const submission = await payload.create({
      collection: 'skill-submissions',
      data: { owner: user.id, name, slug, summary, description, category, version, changelog, tags, reviewStatus: 'pending' },
      file: { data, name: `${slug}-v${version}${extension}`, mimetype: skillFileTypes[extension], size: data.length },
      user,
      overrideAccess: true,
    })
    return NextResponse.json({ id: submission.id, message: '文件已保存到本地，等待管理员审核。' }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : '投稿提交失败，请稍后重试'
    return NextResponse.json({ message }, { status: 400 })
  }
}
