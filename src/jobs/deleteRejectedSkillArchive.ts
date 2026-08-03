import path from 'path'
import { unlink } from 'fs/promises'

import type { TaskConfig } from 'payload'

export async function deleteLocalSkillSubmission(filenameValue: string, storageRoot = path.resolve(process.cwd(), 'skill-submissions')) {
  const storageDirectory = path.resolve(storageRoot)
  const filename = path.basename(filenameValue)
  const target = path.resolve(storageDirectory, filename)
  const relative = path.relative(storageDirectory, target)

  if (!filename || filename !== filenameValue || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('拒绝投稿的本地文件路径无效')
  }

  await unlink(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error
  })
}

export const deleteRejectedSkillArchiveTask: TaskConfig<'deleteRejectedSkillArchive'> = {
  slug: 'deleteRejectedSkillArchive',
  label: '清理已拒绝的 Skill 压缩包',
  inputSchema: [
    { name: 'filename', type: 'text' },
    // Kept only so queued jobs created by the retired COS flow can finish safely.
    { name: 'storageKey', type: 'text' },
  ],
  retries: {
    attempts: 5,
    backoff: { delay: 60_000, type: 'exponential' },
  },
  handler: async ({ input }) => {
    if (input.filename) await deleteLocalSkillSubmission(String(input.filename))
    return { output: {} }
  },
}
