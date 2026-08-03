import { NextRequest, NextResponse } from 'next/server'

import { hasContentAdminRole } from '@/access/isAdmin'
import { payloadForRequest } from '@/lib/auth'
import { skillFileExtension, skillFileTypes } from '@/lib/skillSubmission'
import { inspectUpload, UploadSecurityError } from '@/lib/uploadSecurity'
import { MAX_SKILL_FILE_BYTES, MAX_SKILL_FILE_LABEL } from '@/lib/uploadLimits'

export const runtime = 'nodejs'

const validVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const relationId = (value: number | { id: number }) => typeof value === 'number' ? value : value.id

export async function POST(request: NextRequest) {
  const { payload, user } = await payloadForRequest(request, 'admin')
  if (!user) return NextResponse.json({ message: '请先登录管理台' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file')
  const agentId = Number(form.get('agentId'))
  const version = String(form.get('version') || '').trim()
  const changelog = String(form.get('changelog') || '').trim()

  if (!(file instanceof File) || !Number.isInteger(agentId) || agentId <= 0 || !validVersion.test(version)) {
    return NextResponse.json({ message: '请提供文件、有效的智能体和规范的版本号' }, { status: 400 })
  }

  const extension = skillFileExtension(file.name)
  if (!extension || file.size === 0 || file.size > MAX_SKILL_FILE_BYTES) {
    return NextResponse.json({ message: `仅支持不超过 ${MAX_SKILL_FILE_LABEL} 的 ZIP 或 RAR 压缩包` }, { status: 413 })
  }

  try {
    const agent = await payload.findByID({ collection: 'agents', id: agentId, depth: 0, overrideAccess: true })
    const ownerId = agent.owner ? relationId(agent.owner) : null
    if (!hasContentAdminRole(user) && ownerId !== user.id) {
      return NextResponse.json({ message: '只能为自己创建的智能体投稿版本' }, { status: 403 })
    }

    const data = Buffer.from(await file.arrayBuffer())
    await inspectUpload(data, file.name)
    const submission = await payload.create({
      collection: 'skill-submissions',
      data: {
        owner: user.id,
        agent: agent.id,
        name: agent.name,
        slug: agent.slug,
        summary: agent.summary,
        description: agent.description,
        category: relationId(agent.category),
        tags: agent.tags?.map((item) => ({ tag: item.tag || '' })).filter((item) => item.tag) || [],
        version,
        changelog,
        reviewStatus: 'pending',
      },
      file: { data, name: `${agent.slug}-v${version}${extension}`, mimetype: skillFileTypes[extension], size: data.length },
      user,
      overrideAccess: true,
    })

    return NextResponse.json({ id: submission.id, message: '文件已保存到本地，等待管理员审核。' }, { status: 201 })
  } catch (error) {
    if (error instanceof UploadSecurityError) return NextResponse.json({ message: error.message }, { status: 400 })
    const message = error instanceof Error ? error.message : '本地投稿失败，请稍后重试'
    return NextResponse.json({ message }, { status: 400 })
  }
}
