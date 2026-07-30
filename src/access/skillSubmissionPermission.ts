import { isActivePlatformUser } from './isActivePlatformUser'

type SkillPermissionUser = {
  canSubmitSkills?: unknown
  skillSubmissionPermissionExpiresAt?: unknown
}

export const skillSubmissionPermissionDays = 180

export function hasActiveSkillSubmissionPermission(user: unknown, now = Date.now()): boolean {
  if (!isActivePlatformUser(user) || !(user as SkillPermissionUser).canSubmitSkills) return false

  const expiresAt = (user as SkillPermissionUser).skillSubmissionPermissionExpiresAt
  if (typeof expiresAt !== 'string') return false

  const expiresAtMs = Date.parse(expiresAt)
  return Number.isFinite(expiresAtMs) && expiresAtMs > now
}

export const skillSubmissionPermissionExpiry = (now = new Date()) =>
  new Date(now.getTime() + skillSubmissionPermissionDays * 24 * 60 * 60 * 1000).toISOString()
