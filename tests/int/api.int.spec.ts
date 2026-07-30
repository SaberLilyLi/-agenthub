import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload

describe('API', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  afterAll(async () => {
    await payload?.db.destroy?.()
  })

  it('queries a database created exclusively from migrations', async () => {
    const users = await payload.find({
      collection: 'users',
      overrideAccess: true,
    })
    expect(users).toBeDefined()
    expect(users.totalDocs).toBe(0)
  })
})
