// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'

import { deleteLocalSkillSubmission } from '@/jobs/deleteRejectedSkillArchive'
import { isLocalSkillSubmissionUrl, localSkillSubmissionUrl } from '@/lib/skillSubmission'

let temporaryDirectory: string | undefined

afterEach(async () => {
  delete process.env.NEXT_PUBLIC_SERVER_URL
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true })
  temporaryDirectory = undefined
})

describe('local Skill submission storage', () => {
  it('builds and recognizes same-origin Payload file URLs', () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://agenthub.test'
    const value = localSkillSubmissionUrl('/api/skill-submissions/file/demo.zip')

    expect(value).toBe('https://agenthub.test/api/skill-submissions/file/demo.zip')
    expect(isLocalSkillSubmissionUrl(new URL(value))).toBe(true)
    expect(isLocalSkillSubmissionUrl(new URL('https://attacker.example/api/skill-submissions/file/demo.zip'))).toBe(false)
  })

  it('deletes a rejected archive while preserving files outside the storage root', async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'agenthub-local-skills-'))
    const storageDirectory = path.join(temporaryDirectory, 'storage')
    const archive = path.join(storageDirectory, 'rejected.zip')
    const outside = path.join(temporaryDirectory, 'outside.zip')
    await mkdir(storageDirectory)
    await writeFile(archive, 'archive')
    await writeFile(outside, 'outside')

    await deleteLocalSkillSubmission('rejected.zip', storageDirectory)
    await expect(readFile(archive)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(deleteLocalSkillSubmission('../outside.zip', storageDirectory)).rejects.toThrow('路径无效')
    await expect(readFile(outside, 'utf8')).resolves.toBe('outside')
  })
})
