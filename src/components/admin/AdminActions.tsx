'use client'

import { useState } from 'react'
import { csrfHeaders } from '@/lib/client/csrf'

const buttonStyle = {
  alignItems: 'center',
  background: 'var(--theme-elevation-100)',
  border: '1px solid var(--theme-elevation-250)',
  borderRadius: '4px',
  color: 'var(--theme-text)',
  display: 'inline-flex',
  fontSize: '13px',
  fontWeight: 600,
  gap: '6px',
  height: '34px',
  padding: '0 12px',
  textDecoration: 'none',
} as const

export function AdminActions() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function logout() {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: csrfHeaders() })
    } finally {
      window.location.assign('/')
    }
  }

  return (
    <div style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
      <a href="/admin/collections/skill-upload-requests" style={buttonStyle}>权限申请</a>
      <a href="/admin/collections/skill-submissions" style={buttonStyle}>Skill 审核</a>
      <a href="/agents" style={buttonStyle}>Agent 广场</a>
      <button type="button" style={{ ...buttonStyle, cursor: isLoggingOut ? 'wait' : 'pointer' }} disabled={isLoggingOut} onClick={logout}>
        {isLoggingOut ? '退出中…' : '退出登录'}
      </button>
    </div>
  )
}
