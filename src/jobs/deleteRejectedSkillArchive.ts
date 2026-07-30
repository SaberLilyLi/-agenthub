import type { TaskConfig } from 'payload'

import { deleteSubmissionFromCos } from '../lib/skillSubmission'

export const deleteRejectedSkillArchiveTask: TaskConfig<'deleteRejectedSkillArchive'> = {
  slug: 'deleteRejectedSkillArchive',
  label: '清理已拒绝的 Skill 压缩包',
  inputSchema: [
    { name: 'storageKey', type: 'text', required: true },
  ],
  retries: {
    attempts: 5,
    backoff: { delay: 60_000, type: 'exponential' },
  },
  handler: async ({ input }) => {
    await deleteSubmissionFromCos(String(input.storageKey))
    return { output: {} }
  },
}
