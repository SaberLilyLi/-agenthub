import path from 'path'
import { randomUUID } from 'crypto'

import { cosClient, cosConfig, cosPublicUrl } from './cos'

export const skillFileTypes = {
  '.rar': 'application/vnd.rar',
  '.zip': 'application/zip',
} as const

export function skillFileExtension(filename: string) {
  const extension = path.extname(filename).toLowerCase()
  return extension in skillFileTypes ? (extension as keyof typeof skillFileTypes) : null
}

export function assertCosDownloadHost(downloadUrl: string) {
  const allowedHosts = (process.env.DOWNLOAD_ALLOWED_HOSTS || '').split(',').map(value => value.trim()).filter(Boolean)
  if (!allowedHosts.includes(new URL(downloadUrl).host)) throw new Error('COS 下载域名未配置到 DOWNLOAD_ALLOWED_HOSTS 白名单')
}

/** Stores a reviewed submission in COS immediately; no local file is retained. */
export async function uploadSubmissionToCos(input: { data: Buffer; filename: string; slug: string; version: string }) {
  const extension = skillFileExtension(input.filename)
  if (!extension) throw new Error('仅支持 ZIP 或 RAR 压缩包')
  const key = `skills/submissions/${randomUUID()}/${input.slug}-v${input.version}${extension}`
  const downloadUrl = cosPublicUrl(key)
  assertCosDownloadHost(downloadUrl)
  await new Promise<void>((resolve, reject) => cosClient().putObject(
    { ...cosConfig(), Key: key, Body: input.data, ContentType: skillFileTypes[extension] },
    error => error ? reject(error) : resolve(),
  ))
  return { key, fileSize: input.data.length }
}

export async function deleteSubmissionFromCos(key?: string | null) {
  if (!key) return
  await new Promise<void>((resolve, reject) => cosClient().deleteObject(
    { ...cosConfig(), Key: key },
    error => error ? reject(error) : resolve(),
  ))
}
