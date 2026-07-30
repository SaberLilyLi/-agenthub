import 'dotenv/config'

import { spawn } from 'node:child_process'
import path from 'node:path'

import { prepareTestDatabase } from './testDatabase'

const database = await prepareTestDatabase(`playwright_${process.pid}`)
const baseURL = 'http://127.0.0.1:3103'
const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const requestedTests = process.argv.slice(2)
const configuredSecretFile = process.env.PAYLOAD_SECRET_FILE?.trim()
const payloadSecretFile = configuredSecretFile
  ? path.isAbsolute(configuredSecretFile)
    ? configuredSecretFile
    : path.resolve(process.cwd(), configuredSecretFile)
  : undefined

try {
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(command, ['exec', 'playwright', 'test', '--config=playwright.config.ts', ...requestedTests], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URI: database.databaseUri,
        DATABASE_URL: database.databaseUri,
        NEXT_DIST_DIR: '.next-e2e',
        NEXT_PUBLIC_SERVER_URL: baseURL,
        CSRF_TRUSTED_ORIGINS: baseURL,
        HUMAN_VERIFICATION_REQUIRED: 'false',
        NODE_ENV: 'production',
        ...(payloadSecretFile ? { PAYLOAD_SECRET_FILE: payloadSecretFile } : {}),
        PLAYWRIGHT_BASE_URL: baseURL,
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
