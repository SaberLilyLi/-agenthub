import 'dotenv/config'

import { spawn } from 'node:child_process'
import { Client } from 'pg'

type PreparedTestDatabase = {
  databaseUri: string
  dispose: () => Promise<void>
}

function databaseNameFor(runID: string) {
  const safeRunID = runID.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32)
  return `agenthub_test_${safeRunID}`
}

function connectionUris(databaseName: string) {
  const configured = process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim()
  if (!configured) throw new Error('测试需要配置 DATABASE_URI 或 DATABASE_URL')

  const test = new URL(configured)
  if (!['postgres:', 'postgresql:'].includes(test.protocol)) {
    throw new Error('测试数据库必须使用 PostgreSQL')
  }

  const maintenance = new URL(test)
  maintenance.pathname = '/postgres'
  test.pathname = `/${databaseName}`
  return { maintenance: maintenance.toString(), test: test.toString() }
}

async function dropDatabase(client: Client, databaseName: string) {
  if (!/^agenthub_test_[a-zA-Z0-9_]+$/.test(databaseName)) {
    throw new Error(`拒绝删除非测试数据库：${databaseName}`)
  }

  await client.query(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
    [databaseName],
  )
  await client.query(`DROP DATABASE IF EXISTS "${databaseName}"`)
}

export async function prepareTestDatabase(runID: string): Promise<PreparedTestDatabase> {
  const databaseName = databaseNameFor(runID)
  const uris = connectionUris(databaseName)
  const maintenance = new Client({ connectionString: uris.maintenance })

  await maintenance.connect()
  await dropDatabase(maintenance, databaseName)
  await maintenance.query(`CREATE DATABASE "${databaseName}"`)
  await maintenance.end()

  try {
    const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
    const exitCode = await new Promise<number>((resolve, reject) => {
      const migration = spawn(command, ['payload', 'migrate'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URI: uris.test,
          DATABASE_URL: uris.test,
          NODE_ENV: 'test',
        },
        shell: process.platform === 'win32',
        stdio: 'inherit',
      })
      migration.once('error', reject)
      migration.once('exit', code => resolve(code ?? 1))
    })
    if (exitCode !== 0) throw new Error(`测试数据库迁移失败，退出码：${exitCode}`)
  } catch (error) {
    const cleanup = new Client({ connectionString: uris.maintenance })
    await cleanup.connect()
    await dropDatabase(cleanup, databaseName)
    await cleanup.end()
    throw error
  }

  return {
    databaseUri: uris.test,
    dispose: async () => {
      const cleanup = new Client({ connectionString: uris.maintenance })
      await cleanup.connect()
      await dropDatabase(cleanup, databaseName)
      await cleanup.end()
    },
  }
}
