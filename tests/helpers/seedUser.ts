import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const testUser = {
  email: 'e2e-system-admin@agenthub.test',
  password: 'e2e-only-password-2026',
  name: 'E2E 系统管理员',
  role: 'admin' as const,
  disabled: false,
}

export const ordinaryTestUser = {
  email: 'e2e-ordinary-user@agenthub.test',
  password: 'e2e-only-password-2026',
  name: 'E2E 普通用户',
  role: 'user' as const,
  disabled: false,
}

async function seedUser(user: typeof testUser | typeof ordinaryTestUser) {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { equals: user.email } } })
  await payload.create({ collection: 'users', data: user, overrideAccess: true })
  const login = await payload.login({ collection: 'users', data: { email: user.email, password: user.password } })
  if (!login.token) throw new Error('无法为 E2E 用户创建测试会话')
  return login.token
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<string> {
  return seedUser(testUser)
}

export const seedOrdinaryTestUser = () => seedUser(ordinaryTestUser)

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'users', where: { email: { in: [testUser.email, ordinaryTestUser.email] } } })
}
