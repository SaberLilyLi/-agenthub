import 'dotenv/config'
import pg from '../node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js'

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URI })
  await client.connect()
  try {
    const result = await client.query<{ id: number; name: string; role: string; disabled: boolean }>(
      'SELECT id, name, role, disabled FROM users ORDER BY id',
    )
    console.log(JSON.stringify(result.rows))
  } finally {
    await client.end()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
