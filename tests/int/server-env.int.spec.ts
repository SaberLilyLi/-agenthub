import { afterEach, describe, expect, it } from 'vitest'

import { requiredSecret } from '@/lib/serverEnv'

const name = 'AGENTHUB_TEST_SECRET'

afterEach(() => {
  delete process.env[name]
  delete process.env[`${name}_FILE`]
})

describe('server secret validation', () => {
  it('accepts a sufficiently long non-placeholder secret', () => {
    process.env[name] = 'a-secure-value-that-is-long-enough-to-test'

    expect(requiredSecret(name, 32)).toBe(process.env[name])
  })

  it('rejects missing, short, and placeholder secrets', () => {
    expect(() => requiredSecret(name, 32)).toThrow(`${name} must be configured`)

    process.env[name] = 'too-short'
    expect(() => requiredSecret(name, 32)).toThrow(`at least 32 characters`)

    process.env[name] = 'replace-with-a-real-production-secret-value'
    expect(() => requiredSecret(name, 32)).toThrow('must not use an example or development placeholder')
  })
})
