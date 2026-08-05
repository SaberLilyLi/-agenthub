import { describe, expect, it } from 'vitest'

import { hasAdminRole, hasContentAdminRole, hasReviewerRole, hasUserAdminRole } from '@/access/isAdmin'
import { hasSuperAdminRole } from '@/access/isSuperAdmin'
import { isActivePlatformUser, isDisabledUser } from '@/access/isActivePlatformUser'
import { publicVersionWhere } from '@/collections/AgentVersions'
import { hasActiveSkillSubmissionPermission } from '@/access/skillSubmissionPermission'

describe('platform identity boundaries', () => {
  it('accepts an active user from the users collection', () => {
    const user = { id: 1, collection: 'users' as const, role: 'admin', disabled: false }

    expect(isActivePlatformUser(user)).toBe(true)
    expect(hasAdminRole(user)).toBe(true)
  })

  it('does not trust a role from a different auth collection', () => {
    const legacyAdmin = { id: 1, collection: 'admins', role: 'superadmin', disabled: false }

    expect(isActivePlatformUser(legacyAdmin)).toBe(false)
    expect(hasAdminRole(legacyAdmin)).toBe(false)
    expect(hasSuperAdminRole(legacyAdmin)).toBe(false)
  })

  it('does not grant permissions to a disabled administrator', () => {
    const disabledAdmin = { id: 1, collection: 'users' as const, role: 'superadmin', disabled: true }

    expect(isActivePlatformUser(disabledAdmin)).toBe(false)
    expect(isDisabledUser(disabledAdmin)).toBe(true)
    expect(hasAdminRole(disabledAdmin)).toBe(false)
    expect(hasSuperAdminRole(disabledAdmin)).toBe(false)
  })
})

describe('unified administrator role', () => {
  it('grants platform management capabilities only to the admin role', () => {
    const admin = { id: 1, collection: 'users' as const, role: 'admin', disabled: false }
    const user = { id: 2, collection: 'users' as const, role: 'user', disabled: false }

    expect(hasAdminRole(admin)).toBe(true)
    expect(hasContentAdminRole(admin)).toBe(true)
    expect(hasReviewerRole(admin)).toBe(true)
    expect(hasUserAdminRole(admin)).toBe(true)

    expect(hasAdminRole(user)).toBe(false)
    expect(hasContentAdminRole(user)).toBe(false)
    expect(hasReviewerRole(user)).toBe(false)
    expect(hasUserAdminRole(user)).toBe(false)
  })
})

describe('Skill submission permission expiry', () => {
  it('requires an enabled account, an entitlement, and a future expiry', () => {
    const now = Date.parse('2026-07-28T00:00:00.000Z')
    const active = {
      id: 1,
      collection: 'users' as const,
      disabled: false,
      canSubmitSkills: true,
      skillSubmissionPermissionExpiresAt: '2026-07-29T00:00:00.000Z',
    }

    expect(hasActiveSkillSubmissionPermission(active, now)).toBe(true)
    expect(hasActiveSkillSubmissionPermission({ ...active, skillSubmissionPermissionExpiresAt: '2026-07-27T00:00:00.000Z' }, now)).toBe(false)
    expect(hasActiveSkillSubmissionPermission({ ...active, disabled: true }, now)).toBe(false)
  })
})

describe('published Agent version visibility', () => {
  it('requires a published version and a published parent Agent', () => {
    expect(publicVersionWhere([])).toBe(false)
    expect(publicVersionWhere([3, 7])).toEqual({
      and: [
        { status: { equals: 'published' } },
        { agent: { in: [3, 7] } },
      ],
    })
  })
})
