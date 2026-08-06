#!/usr/bin/env node
/**
 * Start AgentHub (Next.js :3102) and OneManCompany (:8001) together.
 * Browse AgentHub at http://localhost:3102
 * Browse OMC via   http://localhost:3102/oneManCompany  (or :8001/oneManCompany)
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const isWin = process.platform === 'win32'

const children = []

function start(label, command, args, cwd) {
  console.log(`▸ starting ${label}: ${command} ${args.join(' ')}`)
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      OMC_ORIGIN: process.env.OMC_ORIGIN || 'http://127.0.0.1:8001',
      OMC_ROOT_PATH: process.env.OMC_ROOT_PATH || '/oneManCompany',
      PYTHONUTF8: '1',
    },
    shell: isWin,
  })
  child.on('exit', (code, signal) => {
    console.log(`✖ ${label} exited (code=${code}, signal=${signal})`)
    shutdown(code ?? 1)
  })
  children.push(child)
  return child
}

let shuttingDown = false
function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) {
      try {
        child.kill('SIGTERM')
      } catch {
        /* ignore */
      }
    }
  }
  setTimeout(() => process.exit(code), 500)
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => shutdown(0))
}

start('OneManCompany', 'node', [path.join(__dirname, 'dev-omc.mjs')], repoRoot)
start(
  'AgentHub',
  isWin ? 'pnpm.cmd' : 'pnpm',
  ['dev'],
  repoRoot,
)

console.log('')
console.log('  AgentHub:      http://localhost:3102')
console.log('  OneManCompany: http://localhost:3102/oneManCompany')
console.log('  OMC direct:    http://localhost:8001/oneManCompany')
console.log('')
