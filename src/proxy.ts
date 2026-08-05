import { jwtVerify } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'
import { MAX_SKILL_FILE_LABEL, MAX_SKILL_UPLOAD_REQUEST_BYTES } from './lib/uploadLimits'
import { requiredSecret } from './lib/serverEnv'

type Session = {
  collection?: unknown
  role?: unknown
}

const userCookie = 'agenthub-user-token'
const adminCookie = 'agenthub-admin-token'
const csrfCookie = 'agenthub-csrf-token'
const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const rateLimitState = new Map<string, { count: number; resetAt: number }>()
const MAX_RATE_LIMIT_KEYS = 10_000
let lastRateLimitPrune = 0

const userRoutes = ['/me', '/api/account', '/api/favorites', '/api/skills']
const adminRoutes = ['/admin', '/api/admin']
const csrfRoutes = ['/api/auth', '/api/account', '/api/favorites', '/api/skills', '/api/admin', '/api/download']
const uploadRoutes = ['/api/skills/submit', '/api/admin/skills/upload', '/api/admin/cos/upload']

type AbuseRule = { bucket: string; limit: number; windowMs: number; humanVerification: boolean }

const abuseRules: Record<string, AbuseRule> = {
  '/api/auth/login': { bucket: 'login', limit: 5, windowMs: 15 * 60_000, humanVerification: true },
  '/api/users/login': { bucket: 'payload-login', limit: 5, windowMs: 15 * 60_000, humanVerification: true },
  '/api/skills/request-upload-permission': { bucket: 'skill-permission-request', limit: 5, windowMs: 60 * 60_000, humanVerification: true },
  '/api/skills/submit': { bucket: 'skill-submit', limit: 3, windowMs: 60 * 60_000, humanVerification: true },
  '/api/admin/skills/upload': { bucket: 'admin-skill-upload', limit: 10, windowMs: 60 * 60_000, humanVerification: true },
  '/api/admin/cos/upload': { bucket: 'admin-skill-upload-legacy', limit: 10, windowMs: 60 * 60_000, humanVerification: true },
}

const pathMatches = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`)

async function sessionFromCookie(request: NextRequest, cookieName: string): Promise<Session | null> {
  const token = request.cookies.get(cookieName)?.value
  if (!token) return null

  try {
    const configuredSecret = requiredSecret('PAYLOAD_SECRET', 32)
    // Payload hashes the configured secret before signing auth JWTs.
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(configuredSecret))
    const payloadSecret = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 32)
    const { payload } = await jwtVerify(token, new TextEncoder().encode(payloadSecret), { algorithms: ['HS256'] })
    return payload
  } catch {
    return null
  }
}

function unauthenticated(request: NextRequest) {
  if (pathMatches(request.nextUrl.pathname, '/api')) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 })
  }

  const login = new URL('/login', request.url)
  login.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(login)
}

function administratorOnly(request: NextRequest) {
  if (pathMatches(request.nextUrl.pathname, '/api')) {
    return NextResponse.json({ message: '仅管理员可访问此接口' }, { status: 403 })
  }
  return NextResponse.redirect(new URL('/', request.url))
}

function isAdministratorSession(session: Session | null): boolean {
  return session?.collection === 'users' && ['admin', 'superadmin'].includes(String(session.role))
}

function csrfRejected(message: string) {
  return NextResponse.json({ message }, { status: 403 })
}

function trustedOrigins() {
  const configured = [process.env.NEXT_PUBLIC_SERVER_URL, ...(process.env.CSRF_TRUSTED_ORIGINS || '').split(',')]
  return new Set(configured.map((value) => value?.trim()).filter(Boolean).flatMap((value) => {
    try {
      return [new URL(value!).origin]
    } catch {
      return []
    }
  }))
}

function isCsrfRoute(pathname: string) {
  return csrfRoutes.some((route) => pathMatches(pathname, route))
}

function protectApiWrite(request: NextRequest) {
  if (!pathMatches(request.nextUrl.pathname, '/api') || !unsafeMethods.has(request.method)) return null

  const origin = request.headers.get('origin')
  if (!origin || !trustedOrigins().has(origin)) return csrfRejected('跨站写入请求被拒绝')

  if (isCsrfRoute(request.nextUrl.pathname)) {
    const cookie = request.cookies.get(csrfCookie)?.value
    const token = request.headers.get('x-csrf-token')
    if (!cookie || !token || cookie !== token) return csrfRejected('CSRF 校验失败，请刷新页面后重试')
  }

  return null
}

function withCsrfCookie(request: NextRequest, response: NextResponse) {
  if (!unsafeMethods.has(request.method) && !request.cookies.get(csrfCookie)?.value) {
    response.cookies.set(csrfCookie, crypto.randomUUID(), {
      httpOnly: false,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
  }
  return response
}

function protectUploadSize(request: NextRequest) {
  if (request.method !== 'POST' || !uploadRoutes.some(route => pathMatches(request.nextUrl.pathname, route))) return null
  const rawLength = request.headers.get('content-length')
  if (!rawLength) return NextResponse.json({ message: '上传请求必须提供 Content-Length' }, { status: 411 })
  const length = Number(rawLength)
  if (!Number.isSafeInteger(length) || length <= 0 || length > MAX_SKILL_UPLOAD_REQUEST_BYTES) {
    return NextResponse.json({ message: `上传文件不能超过 ${MAX_SKILL_FILE_LABEL}` }, { status: 413 })
  }
  return null
}

function requestClientKey(request: NextRequest) {
  if (process.env.TRUST_PROXY !== 'true') return 'untrusted-proxy-client'
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown-client'
}

function matchingAbuseRule(pathname: string) {
  return Object.entries(abuseRules).find(([route]) => pathMatches(pathname, route))?.[1]
}

function checkRateLimit(request: NextRequest, rule: AbuseRule) {
  const key = `${rule.bucket}:${requestClientKey(request)}`
  const now = Date.now()
  if (now - lastRateLimitPrune >= 60_000) {
    for (const [existingKey, value] of rateLimitState) {
      if (value.resetAt <= now) rateLimitState.delete(existingKey)
    }
    lastRateLimitPrune = now
  }
  const existing = rateLimitState.get(key)
  if (!existing && rateLimitState.size >= MAX_RATE_LIMIT_KEYS) {
    return NextResponse.json({ message: '限流服务繁忙，请稍后再试' }, { status: 429, headers: { 'retry-after': '60' } })
  }
  const entry = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + rule.windowMs } : existing
  entry.count += 1
  rateLimitState.set(key, entry)
  if (entry.count <= rule.limit) return null

  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
  return NextResponse.json({ message: '请求过于频繁，请稍后再试' }, { status: 429, headers: { 'retry-after': String(retryAfter) } })
}

async function verifyHuman(request: NextRequest) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  const configured = process.env.HUMAN_VERIFICATION_REQUIRED?.trim().toLowerCase()
  const required = configured === 'true' || (configured === undefined && process.env.NODE_ENV === 'production')
  if (!required && !secret) return null
  if (!secret) return csrfRejected('人机验证服务未配置')

  const token = request.headers.get('x-turnstile-token')
  if (!token) return csrfRejected('请先完成人机验证')

  try {
    const body = new URLSearchParams({ secret, response: token, ...(requestClientKey(request) !== 'unknown-client' ? { remoteip: requestClientKey(request) } : {}) })
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
    const result = await response.json() as { success?: boolean }
    return result.success ? null : csrfRejected('人机验证失败，请重试')
  } catch {
    return csrfRejected('人机验证暂不可用，请稍后再试')
  }
}

async function protectAbuse(request: NextRequest) {
  const rule = matchingAbuseRule(request.nextUrl.pathname)
  if (!rule || !unsafeMethods.has(request.method)) return null
  const limited = checkRateLimit(request, rule)
  if (limited) return limited
  return rule.humanVerification ? verifyHuman(request) : null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const uploadProtection = protectUploadSize(request)
  if (uploadProtection) return uploadProtection
  const abuseProtection = await protectAbuse(request)
  if (abuseProtection) return abuseProtection
  const writeProtection = protectApiWrite(request)
  if (writeProtection) return writeProtection
  const isAdminRoute = adminRoutes.some((route) => pathMatches(pathname, route))
  const isUserRoute = userRoutes.some((route) => pathMatches(pathname, route))

  // Let Payload render its own login UI. Every other admin route requires a
  // valid active platform session; collection access limits ordinary users.
  if (pathname === '/admin/login') return withCsrfCookie(request, NextResponse.next())

  if (isAdminRoute) {
    const session = await sessionFromCookie(request, adminCookie)
    if (!session || session.collection !== 'users') return unauthenticated(request)
    if (!isAdministratorSession(session)) return administratorOnly(request)
    return withCsrfCookie(request, NextResponse.next())
  }

  if (isUserRoute) {
    const session = await sessionFromCookie(request, userCookie)
    if (!session || session.collection !== 'users') return unauthenticated(request)
  }

  return withCsrfCookie(request, NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
