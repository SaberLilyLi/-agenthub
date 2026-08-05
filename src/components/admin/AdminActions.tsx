'use client'

import { useState } from 'react'
import { useAuth } from '@payloadcms/ui'
import Link from 'next/link'
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
  const { user } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const role = typeof user === 'object' && user ? String(user.role || '') : ''
  const canReview = ['admin', 'superadmin'].includes(role)

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
      {canReview && <Link href="/admin/collections/skill-submissions" style={buttonStyle}>Skill 审核</Link>}
      <Link href="/agents" style={buttonStyle}>Agent 广场</Link>
      <button type="button" style={{ ...buttonStyle, cursor: isLoggingOut ? 'wait' : 'pointer' }} disabled={isLoggingOut} onClick={logout}>
        {isLoggingOut ? '退出中…' : '退出登录'}
      </button>
    </div>
  )
}
