// @vitest-environment node

import { SignJWT } from 'jose'
import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { proxy } from '@/proxy'

const secret = 'proxy-test-secret-that-is-long-enough-to-be-safe'
let temporarySecretDirectory: string | undefined

async function token(payload: Record<string, unknown>) {
  const payloadSecret = createHash('sha256').update(secret).digest('hex').slice(0, 32)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(payloadSecret))
}

function request(path: string, cookies = '', init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (cookies) headers.set('cookie', cookies)
  return new NextRequest(`https://agenthub.test${path}`, { ...init, headers })
}

describe('route proxy authorization', () => {
  afterEach(async () => {
    delete process.env.PAYLOAD_SECRET
    delete process.env.PAYLOAD_SECRET_FILE
    delete process.env.NEXT_PUBLIC_SERVER_URL
    delete process.env.CSRF_TRUSTED_ORIGINS
    if (temporarySecretDirectory) {
      await rm(temporarySecretDirectory, { recursive: true, force: true })
      temporarySecretDirectory = undefined
    }
  })

  it('redirects unauthenticated account routes to login', async () => {
    process.env.PAYLOAD_SECRET = secret

    const response = await proxy(request('/me/downloads'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login?next=%2Fme%2Fdownloads')
  })

  it('rejects non-administrators before they reach admin routes', async () => {
    process.env.PAYLOAD_SECRET = secret
    const userToken = await token({ id: 1, collection: 'users', role: 'user' })

    const response = await proxy(request('/admin', `agenthub-admin-token=${userToken}`))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://agenthub.test/')
  })

  it('allows a signed administrator session through the route gate', async () => {
    process.env.PAYLOAD_SECRET = secret
    const adminToken = await token({ id: 1, collection: 'users', role: 'admin' })

    const response = await proxy(request('/admin', `agenthub-admin-token=${adminToken}`))

    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('verifies sessions with the same PAYLOAD_SECRET_FILE used by Payload', async () => {
    temporarySecretDirectory = await mkdtemp(join(tmpdir(), 'agenthub-proxy-secret-'))
    const secretFile = join(temporarySecretDirectory, 'payload_secret')
    await writeFile(secretFile, secret, 'utf8')
    process.env.PAYLOAD_SECRET_FILE = secretFile
    const adminToken = await token({ id: 1, collection: 'users', role: 'system_admin' })

    const response = await proxy(request('/admin', `agenthub-admin-token=${adminToken}`))

    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('rejects cross-origin API writes before authentication reaches the route handler', async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://agenthub.test'

    const response = await proxy(request('/api/auth/login', '', {
      method: 'POST',
      headers: { origin: 'https://attacker.example' },
    }))

    expect(response.status).toBe(403)
  })

  it('requires a matching CSRF token for same-origin custom API writes', async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://agenthub.test'

    const response = await proxy(request('/api/auth/login', 'agenthub-csrf-token=expected-token', {
      method: 'POST',
      headers: { origin: 'https://agenthub.test', 'x-csrf-token': 'wrong-token' },
    }))

    expect(response.status).toBe(403)
  })

  it('allows a same-origin custom API write with a matching CSRF token', async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://agenthub.test'

    const response = await proxy(request('/api/auth/login', 'agenthub-csrf-token=expected-token', {
      method: 'POST',
      headers: { origin: 'https://agenthub.test', 'x-csrf-token': 'expected-token' },
    }))

    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('rate-limits Payload native login attempts', async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://agenthub.test'
    let response: Response | undefined

    for (let attempt = 0; attempt < 6; attempt += 1) {
      response = await proxy(request('/api/users/login', '', {
        method: 'POST',
        headers: { origin: 'https://agenthub.test', 'x-real-ip': 'native-login-rate-test' },
      }))
    }

    expect(response?.status).toBe(429)
    expect(response?.headers.get('retry-after')).toBeTruthy()
  })

  it('rejects oversized uploads before route body parsing', async () => {
    const response = await proxy(request('/api/skills/submit', '', {
      method: 'POST',
      headers: { 'content-length': String(21 * 1024 * 1024 + 1) },
    }))

    expect(response.status).toBe(413)
  })

  it('rejects upload requests without a declared length', async () => {
    const response = await proxy(request('/api/admin/cos/upload', '', { method: 'POST' }))

    expect(response.status).toBe(411)
  })
})
