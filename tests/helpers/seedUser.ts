import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const testUser = {
  email: 'e2e-system-admin@agenthub.test',
  password: 'e2e-only-password-2026',
  name: 'E2E 系统管理员',
  role: 'system_admin' as const,
  disabled: false,
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<string> {
  const payload = await getPayload({ config })

  // Delete existing test user if any
  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })

  // Create fresh test user
  await payload.create({
    collection: 'users',
    data: testUser,
    overrideAccess: true,
  })

  const login = await payload.login({
    collection: 'users',
    data: { email: testUser.email, password: testUser.password },
  })
  if (!login.token) throw new Error('无法为 E2E 管理员创建测试会话')
  return login.token
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })
}
