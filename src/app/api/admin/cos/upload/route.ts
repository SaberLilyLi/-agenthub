import { NextRequest, NextResponse } from 'next/server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { hasContentAdminRole } from '@/access/isAdmin'
import { cosClient, cosConfig, cosPublicUrl } from '@/lib/cos'
import { inspectUpload, UploadSecurityError } from '@/lib/uploadSecurity'
import { MAX_SKILL_FILE_BYTES, MAX_SKILL_FILE_LABEL } from '@/lib/uploadLimits'

export const runtime = 'nodejs'

const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const validVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const allowedFiles = {
  '.rar': 'application/vnd.rar',
  '.zip': 'application/zip',
} as const

function extensionOf(fileName: string) {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
  return extension in allowedFiles ? (extension as keyof typeof allowedFiles) : null
}

export async function POST(request: NextRequest) {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: request.headers })
  const currentUser = auth.user

  if (!hasContentAdminRole(currentUser)) {
    return NextResponse.json({ message: '仅管理员可以上传和发布 Agent 文件' }, { status: 403 })
  }

  const form = await request.formData()
  const file = form.get('file')
  const agentSlug = String(form.get('agentSlug') || '')
  const version = String(form.get('version') || '')
  const changelog = String(form.get('changelog') || '').trim()

  if (!(file instanceof File) || !validSlug.test(agentSlug) || !validVersion.test(version)) {
    return NextResponse.json({ message: '请提供文件、规范的 Agent slug 和版本号' }, { status: 400 })
  }

  const extension = extensionOf(file.name)
  if (!extension || file.size === 0 || file.size > MAX_SKILL_FILE_BYTES) {
    return NextResponse.json({ message: `仅支持不超过 ${MAX_SKILL_FILE_LABEL} 的 ZIP 或 RAR 压缩包` }, { status: 413 })
  }

  const key = `skills/${agentSlug}/v${version}/${agentSlug}-v${version}${extension}`
  const downloadUrl = cosPublicUrl(key)
  const allowedHosts = (process.env.DOWNLOAD_ALLOWED_HOSTS || '').split(',').map((value) => value.trim()).filter(Boolean)
  if (!allowedHosts.includes(new URL(downloadUrl).host)) {
    return NextResponse.json({ message: 'COS 下载域名未配置到 DOWNLOAD_ALLOWED_HOSTS 白名单' }, { status: 500 })
  }

  try {
    const body = Buffer.from(await file.arrayBuffer())
    await inspectUpload(body, file.name)
    await new Promise<void>((resolve, reject) =>
      cosClient().putObject(
        { ...cosConfig(), Key: key, Body: body, ContentType: allowedFiles[extension] },
        (error) => (error ? reject(error) : resolve()),
      ),
    )
  } catch (error) {
    if (error instanceof UploadSecurityError) return NextResponse.json({ message: error.message }, { status: 400 })
    return NextResponse.json({ message: '上传 COS 失败，请检查 CAM 权限、存储桶与网络配置' }, { status: 502 })
  }

  try {
    const agents = await payload.find({
      collection: 'agents',
      where: { slug: { equals: agentSlug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const agent = agents.docs[0]
    if (!agent) {
      return NextResponse.json({ message: `未找到 slug 为 ${agentSlug} 的 Agent；文件已上传至 COS，可修正 slug 后重试` }, { status: 404 })
    }

    const existingVersions = await payload.find({
      collection: 'agent-versions',
      where: { and: [{ agent: { equals: agent.id } }, { version: { equals: version } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const versionData = {
      agent: agent.id,
      version,
      fileSize: `${file.size} B`,
      changelog: changelog || '通过后台上传自动发布。',
      downloadUrl,
      channel: 'stable' as const,
      status: 'published' as const,
      publishedAt: new Date().toISOString(),
    }
    const agentVersion = existingVersions.docs[0]
      ? await payload.update({ collection: 'agent-versions', id: existingVersions.docs[0].id, data: versionData, overrideAccess: true })
      : await payload.create({ collection: 'agent-versions', data: versionData, overrideAccess: true })

    await payload.update({
      collection: 'agents',
      id: agent.id,
      data: {
        status: 'published',
        publishedAt: agent.publishedAt || new Date().toISOString(),
      },
      overrideAccess: true,
    })

    return NextResponse.json({ key, downloadUrl, fileSize: file.size, versionId: agentVersion.id, published: true })
  } catch {
    return NextResponse.json({ message: '文件已上传至 COS，但自动发布版本失败；请检查 Agent 数据后重试' }, { status: 500 })
  }
}
