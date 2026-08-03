import path from 'path'

export const skillFileTypes = {
  '.rar': 'application/vnd.rar',
  '.zip': 'application/zip',
} as const

export function skillFileExtension(filename: string) {
  const extension = path.extname(filename).toLowerCase()
  return extension in skillFileTypes ? (extension as keyof typeof skillFileTypes) : null
}

/** Builds a same-origin absolute URL for a file served by Payload local storage. */
export function localSkillSubmissionUrl(pathname?: null | string) {
  if (!pathname) throw new Error('本地投稿文件缺失，无法发布')

  const configured = process.env.NEXT_PUBLIC_SERVER_URL?.trim()
  if (!configured) throw new Error('NEXT_PUBLIC_SERVER_URL 未配置，无法生成本地下载地址')

  const serverURL = new URL(configured)
  const fileURL = new URL(pathname, serverURL)
  if (!['http:', 'https:'].includes(serverURL.protocol) || fileURL.origin !== serverURL.origin) {
    throw new Error('本地投稿文件地址无效')
  }

  return fileURL.toString()
}

export function isLocalSkillSubmissionUrl(value: URL) {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL?.trim()
  if (!configured) return false

  try {
    const serverURL = new URL(configured)
    return value.origin === serverURL.origin && value.pathname.startsWith('/api/skill-submissions/file/')
  } catch {
    return false
  }
}
