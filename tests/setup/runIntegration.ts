import 'dotenv/config'

import { spawn } from 'node:child_process'

import { prepareTestDatabase } from './testDatabase'

const database = await prepareTestDatabase(`vitest_${process.pid}`)
const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

try {
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(command, ['exec', 'vitest', 'run', '--config', './vitest.config.mts'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URI: database.databaseUri,
        DATABASE_URL: database.databaseUri,
        NODE_ENV: 'test',
      },
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', code => resolve(code ?? 1))
  })
  process.exitCode = exitCode
} finally {
  await database.dispose()
}
