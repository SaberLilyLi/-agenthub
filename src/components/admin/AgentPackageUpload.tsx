'use client'

import { useRef, useState } from 'react'
import { toast, useAuth, useDocumentInfo } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'

import { csrfHeaders } from '@/lib/client/csrf'
import { MAX_SKILL_FILE_BYTES, MAX_SKILL_FILE_LABEL } from '@/lib/uploadLimits'

const validVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

type UploadResponse = {
  downloadUrl?: string
  message?: string
  versionId?: number | string
}

export const AgentPackageUpload: UIFieldClientComponent = () => {
  const { data, id } = useDocumentInfo()
  const { user } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)
  const [changelog, setChangelog] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [version, setVersion] = useState('')

  const savedSlug = typeof data?.slug === 'string' ? data.slug : ''
  const owner = data?.owner
  const ownerId = typeof owner === 'object' && owner && 'id' in owner ? owner.id : owner
  const role = typeof user === 'object' && user ? String(user.role || '') : ''
  const canManageAll = ['admin', 'superadmin'].includes(role)
  const canUpload = Boolean(id && savedSlug && (canManageAll || ownerId === user?.id))

  async function upload() {
    setMessage('')

    if (!canUpload) {
      setMessage('请先保存智能体，再上传文件。')
      return
    }
    if (!validVersion.test(version)) {
      setMessage('版本号格式应为 1.0.0 或 1.0.0-beta.1。')
      return
    }
    if (!file) {
      setMessage('请选择 ZIP 或 RAR 压缩包。')
      return
    }
    if (file.size === 0 || file.size > MAX_SKILL_FILE_BYTES) {
      setMessage(`文件大小不能超过 ${MAX_SKILL_FILE_LABEL}。`)
      return
    }

    const form = new FormData()
    form.set('agentId', String(id))
    form.set('version', version)
    form.set('changelog', changelog)
    form.set('file', file)

    setIsUploading(true)
    try {
      const response = await fetch('/api/admin/skills/upload', {
        body: form,
        headers: csrfHeaders(),
        method: 'POST',
      })
      const body = await response.json().catch(() => ({})) as UploadResponse

      if (!response.ok) {
        const errorMessage = body.message || '上传失败，请稍后重试。'
        setMessage(errorMessage)
        toast.error(errorMessage)
        return
      }

      const successMessage = `版本 ${version} 已保存到本地并提交审核。`
      setMessage(successMessage)
      toast.success(successMessage)
      setChangelog('')
      setFile(null)
      setVersion('')
      if (fileInput.current) fileInput.current.value = ''
    } catch {
      const errorMessage = '网络异常，上传失败，请稍后重试。'
      setMessage(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="agent-package-upload" aria-label="Skill 文件投稿">
      <h3>上传 Skill 文件</h3>
      <p className="agent-package-upload__description">
        ZIP/RAR 文件将保存到服务器本地，管理员审核通过后才发布版本。包内可含 Windows 程序（.exe / .dll / .msi），请勿包含脚本类文件。
      </p>

      {canUpload ? (
        <p className="agent-package-upload__target">目标：{savedSlug}</p>
      ) : id && savedSlug ? (
        <p className="agent-package-upload__notice">只能为自己创建的智能体投稿版本。</p>
      ) : (
        <p className="agent-package-upload__notice">请先填写左侧必填信息并保存一次，再上传文件。</p>
      )}

      <label>
        <span>版本号</span>
        <input
          disabled={!canUpload || isUploading}
          onChange={(event) => setVersion(event.target.value.trim())}
          placeholder="1.0.0"
          type="text"
          value={version}
        />
      </label>

      <label>
        <span>更新说明</span>
        <textarea
          disabled={!canUpload || isUploading}
          onChange={(event) => setChangelog(event.target.value)}
          placeholder="本次版本更新内容"
          rows={3}
          value={changelog}
        />
      </label>

      <label>
        <span>压缩包（最大 {MAX_SKILL_FILE_LABEL}）</span>
        <input
          accept=".zip,application/zip,.rar,application/vnd.rar"
          disabled={!canUpload || isUploading}
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          ref={fileInput}
          type="file"
        />
      </label>

      <button disabled={!canUpload || isUploading} onClick={upload} type="button">
        {isUploading ? '正在上传…' : '保存到本地并提交审核'}
      </button>

      {message && <p className="agent-package-upload__message" role="status">{message}</p>}
    </section>
  )
}
