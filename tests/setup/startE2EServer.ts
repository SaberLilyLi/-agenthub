import { cpSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const workspace = process.cwd()
const distDir = process.env.NEXT_DIST_DIR || '.next-e2e'
const output = path.resolve(workspace, distDir)
const standalone = path.join(output, 'standalone')

if (!output.startsWith(`${workspace}${path.sep}`) || !standalone.startsWith(`${output}${path.sep}`)) {
  throw new Error('E2E 构建目录必须位于项目工作区内')
}

const standaloneStatic = path.join(standalone, distDir, 'static')
const standalonePublic = path.join(standalone, 'public')
mkdirSync(standaloneStatic, { recursive: true })
mkdirSync(standalonePublic, { recursive: true })
cpSync(path.join(output, 'static'), standaloneStatic, { recursive: true, force: true })
cpSync(path.join(workspace, 'public'), standalonePublic, { recursive: true, force: true })

process.env.PORT = '3103'
process.env.HOSTNAME = '127.0.0.1'
await import(pathToFileURL(path.join(standalone, 'server.js')).href)
