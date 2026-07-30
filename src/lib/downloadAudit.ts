import { createHmac, randomUUID } from 'node:crypto'

import { requiredSecret } from './serverEnv'

export function trustedClientIp(headers: Headers): string | undefined {
  if (process.env.TRUST_PROXY !== 'true') return undefined

  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = headers.get('x-real-ip')?.trim()
  return forwarded || realIp || undefined
}

export function auditIpHash(ip: string) {
  return createHmac('sha256', requiredSecret('AUDIT_IP_HASH_SECRET', 32)).update(ip).digest('hex')
}

export function downloadAuditMetadata(headers: Headers, authenticated: boolean) {
  const ip = trustedClientIp(headers)
  return {
    actorType: authenticated ? 'authenticated' : 'anonymous',
    requestId: randomUUID(),
    userAgent: headers.get('user-agent')?.slice(0, 512) || undefined,
    ipHash: ip ? auditIpHash(ip) : undefined,
    ipHashKeyVersion: ip ? process.env.AUDIT_IP_HASH_KEY_VERSION?.trim() || 'v1' : undefined,
  }
}
