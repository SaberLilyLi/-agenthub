import { afterEach, describe, expect, it } from 'vitest'

import { auditIpHash, downloadAuditMetadata, trustedClientIp } from '@/lib/downloadAudit'

afterEach(() => {
  delete process.env.TRUST_PROXY
  delete process.env.AUDIT_IP_HASH_SECRET
  delete process.env.AUDIT_IP_HASH_KEY_VERSION
})

describe('download audit metadata', () => {
  it('does not trust forwarded IP headers unless explicitly configured', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.10' })
    expect(trustedClientIp(headers)).toBeUndefined()
  })

  it('records a keyed, stable IP hash only behind a trusted proxy', () => {
    process.env.TRUST_PROXY = 'true'
    process.env.AUDIT_IP_HASH_SECRET = 'audit-test-secret-that-is-long-enough-for-hmac'
    process.env.AUDIT_IP_HASH_KEY_VERSION = 'test-v1'
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.10, 10.0.0.1', 'user-agent': 'audit-test' })

    const metadata = downloadAuditMetadata(headers, true)
    expect(metadata.actorType).toBe('authenticated')
    expect(metadata.ipHash).toBe(auditIpHash('203.0.113.10'))
    expect(metadata.ipHashKeyVersion).toBe('test-v1')
    expect(metadata.userAgent).toBe('audit-test')
  })
})
