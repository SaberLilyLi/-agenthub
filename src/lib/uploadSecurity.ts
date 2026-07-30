import { connect } from 'node:net'

const ZIP_EOCD = 0x06054b50
const ZIP_CENTRAL_DIRECTORY = 0x02014b50
const MAX_ARCHIVE_ENTRIES = 200
const MAX_UNCOMPRESSED_BYTES = 500 * 1024 * 1024
const MAX_COMPRESSION_RATIO = 100
const blockedExtensions = new Set(['.exe', '.dll', '.bat', '.cmd', '.com', '.ps1', '.sh', '.msi', '.jar', '.js', '.vbs', '.scr'])
const nestedArchiveExtensions = new Set(['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'])

export class UploadSecurityError extends Error {}

function extensionOf(filename: string) { return filename.slice(filename.lastIndexOf('.')).toLowerCase() }
function reject(message: string): never { throw new UploadSecurityError(message) }

function safeEntryName(name: string) {
  if (!name || name.includes('\0') || name.includes('\\') || name.startsWith('/') || name.startsWith('../') || name.includes('/../')) reject('压缩包包含不安全的文件路径')
  const extension = extensionOf(name)
  if (blockedExtensions.has(extension)) reject('压缩包不能包含可执行文件')
  if (nestedArchiveExtensions.has(extension)) reject('压缩包不能包含嵌套压缩包')
}

function inspectZip(data: Buffer) {
  let eocd = -1
  for (let offset = data.length - 22; offset >= Math.max(0, data.length - 65_557); offset -= 1) if (data.readUInt32LE(offset) === ZIP_EOCD) { eocd = offset; break }
  if (eocd < 0) reject('ZIP 文件结构无效')
  const entries = data.readUInt16LE(eocd + 10)
  const directoryOffset = data.readUInt32LE(eocd + 16)
  if (entries > MAX_ARCHIVE_ENTRIES || directoryOffset >= data.length) reject('压缩包文件数量或目录结构超出安全限制')
  let offset = directoryOffset
  let totalUncompressed = 0
  let totalCompressed = 0
  for (let index = 0; index < entries; index += 1) {
    if (offset + 46 > data.length || data.readUInt32LE(offset) !== ZIP_CENTRAL_DIRECTORY) reject('ZIP 中央目录无效')
    const flags = data.readUInt16LE(offset + 8), compressed = data.readUInt32LE(offset + 20), uncompressed = data.readUInt32LE(offset + 24)
    const nameLength = data.readUInt16LE(offset + 28), extraLength = data.readUInt16LE(offset + 30), commentLength = data.readUInt16LE(offset + 32)
    const next = offset + 46 + nameLength + extraLength + commentLength
    if (next > data.length || flags & 0x1 || compressed === 0xffffffff || uncompressed === 0xffffffff) reject('ZIP 含加密或 Zip64 条目，无法安全检查')
    safeEntryName(data.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'))
    if ((data.readUInt32LE(offset + 38) >>> 16 & 0o170000) === 0o120000) reject('压缩包不能包含符号链接')
    if (uncompressed > MAX_UNCOMPRESSED_BYTES || (uncompressed > 0 && (compressed === 0 || uncompressed / compressed > MAX_COMPRESSION_RATIO))) reject('压缩包疑似压缩炸弹')
    totalCompressed += compressed; totalUncompressed += uncompressed
    if (totalUncompressed > MAX_UNCOMPRESSED_BYTES || (totalUncompressed > 0 && (totalCompressed === 0 || totalUncompressed / totalCompressed > MAX_COMPRESSION_RATIO))) reject('压缩包疑似压缩炸弹')
    offset = next
  }
}

async function scanWithClamAV(data: Buffer) {
  const host = process.env.CLAMAV_HOST?.trim()
  const required = process.env.ARCHIVE_SCANNER_REQUIRED === 'true' || process.env.NODE_ENV === 'production'
  if (!host) { if (required) reject('恶意文件扫描服务未配置'); return false }
  const port = Number(process.env.CLAMAV_PORT || 3310)
  await new Promise<void>((resolve, rejectScan) => {
    const socket = connect({ host, port }); let reply = ''
    const timer = setTimeout(() => socket.destroy(new Error('scan timeout')), 15_000)
    socket.once('error', rejectScan); socket.on('data', chunk => { reply += chunk.toString('utf8') })
    socket.once('end', () => reply.includes('stream: OK') ? resolve() : rejectScan(new UploadSecurityError('文件未通过恶意内容扫描')))
    socket.once('close', () => clearTimeout(timer))
    socket.once('connect', () => { socket.write('zINSTREAM\0'); const size = Buffer.alloc(4); size.writeUInt32BE(data.length); socket.write(size); socket.write(data); socket.end(Buffer.alloc(4)) })
  }).catch((error: unknown) => { if (error instanceof UploadSecurityError) throw error; reject('恶意文件扫描服务不可用') })
  return true
}

/** Checks archive structure before any file is persisted or sent to object storage. */
export async function inspectUpload(data: Buffer, filename: string) {
  const extension = extensionOf(filename)
  if (extension === '.zip') {
    if (data.length < 22 || (data.readUInt32LE(0) !== 0x04034b50 && data.readUInt32LE(0) !== ZIP_EOCD)) reject('文件内容不是有效 ZIP')
    inspectZip(data)
  } else if (extension === '.rar') {
    const rar4 = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]), rar5 = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00])
    if (!data.subarray(0, 7).equals(rar4) && !data.subarray(0, 8).equals(rar5)) reject('文件内容不是有效 RAR')
  } else if (extension === '.md' && (data.includes(0) || data.subarray(0, 2).equals(Buffer.from('MZ')))) reject('Markdown 文件内容无效')
  const scanned = await scanWithClamAV(data)
  if (extension === '.rar' && !scanned) reject('RAR 上传需要启用恶意文件扫描服务')
}
