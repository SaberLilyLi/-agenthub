type SkillPermission = { status?: unknown; expiresAt?: unknown }

export const skillSubmissionPermissionDays = 180

export function hasActiveSkillSubmissionPermission(permission: unknown, now = Date.now()): boolean {
  if (!permission || typeof permission !== 'object' || (permission as SkillPermission).status !== 'active') return false
  const expiresAt = (permission as SkillPermission).expiresAt
  if (typeof expiresAt !== 'string') return false

  const expiresAtMs = Date.parse(expiresAt)
  return Number.isFinite(expiresAtMs) && expiresAtMs > now
}

export const skillSubmissionPermissionExpiry = (now = new Date()) =>
  new Date(now.getTime() + skillSubmissionPermissionDays * 24 * 60 * 60 * 1000).toISOString()
