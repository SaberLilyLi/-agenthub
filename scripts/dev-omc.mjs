#!/usr/bin/env node
/**
 * Start OneManCompany (FastAPI) from agent/OneManCompany using its local venv.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const omcRoot = path.join(repoRoot, 'agent', 'OneManCompany')

const isWin = process.platform === 'win32'
const exe = path.join(omcRoot, '.venv', isWin ? 'Scripts/onemancompany.exe' : 'bin/onemancompany')

if (!fs.existsSync(exe)) {
  console.error(`✖ OneManCompany executable not found: ${exe}`)
  console.error('  Run: cd agent/OneManCompany && uv pip install -e .')
  process.exit(1)
}

const child = spawn(exe, process.argv.slice(2), {
  cwd: omcRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    OMC_ROOT_PATH: process.env.OMC_ROOT_PATH || '/oneManCompany',
    PYTHONUTF8: '1',
  },
  shell: false,
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig)
  })
}
