import 'dotenv/config'

import fs from 'node:fs/promises'
import path from 'node:path'

import COS from 'cos-nodejs-sdk-v5'
import { getPayload } from 'payload'

import config from '../src/payload.config'

const [filePath, slug, version, name, categorySlug, summary, changelog] = process.argv.slice(2)

if (!filePath || !slug || !version || !name || !categorySlug || !summary || !changelog) {
  throw new Error('Usage: publish-skill <zip> <slug> <version> <name> <category-slug> <summary> <changelog>')
}

const required = (key: string) => {
  const value = process.env[key]
  if (!value) throw new Error('Missing ' + key)
  return value
}

const body = await fs.readFile(filePath)
const bucket = required('TENCENT_COS_BUCKET')
const region = required('TENCENT_COS_REGION')
const key = 'skills/' + slug + '/v' + version + '/' + slug + '-v' + version + path.extname(filePath).toLowerCase()
const downloadUrl = 'https://' + bucket + '.cos.' + region + '.myqcloud.com/' + key
const allowedHosts = (process.env.DOWNLOAD_ALLOWED_HOSTS || '').split(',').map((item) => item.trim()).filter(Boolean)
if (!allowedHosts.includes(new URL(downloadUrl).host)) throw new Error('COS host is not allowlisted in DOWNLOAD_ALLOWED_HOSTS')

const payload = await getPayload({ config })
const categoryResult = await payload.find({ collection: 'categories', where: { slug: { equals: categorySlug } }, limit: 1, overrideAccess: true })
const category = categoryResult.docs[0]
if (!category) throw new Error('Category not found: ' + categorySlug)

const now = new Date().toISOString()
const agentResult = await payload.find({ collection: 'agents', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })
const agent = agentResult.docs[0] || await payload.create({
  collection: 'agents',
  data: { name, slug, summary, description: summary, category: category.id, status: 'published', publishedAt: now },
  overrideAccess: true,
})

const cos = new COS({ SecretId: required('TENCENT_SECRET_ID'), SecretKey: required('TENCENT_SECRET_KEY') })
await new Promise<void>((resolve, reject) => cos.putObject(
  { Bucket: bucket, Region: region, Key: key, Body: body, ContentType: 'application/zip' },
  (error) => error ? reject(error) : resolve(),
))

const versionResult = await payload.find({
  collection: 'agent-versions',
  where: { and: [{ agent: { equals: agent.id } }, { version: { equals: version } }] },
  limit: 1,
  overrideAccess: true,
})
const versionData = { agent: agent.id, version, fileSize: String(body.byteLength) + ' B', changelog, downloadUrl, channel: 'stable' as const, status: 'published' as const, publishedAt: now }
const agentVersion = versionResult.docs[0]
  ? await payload.update({ collection: 'agent-versions', id: versionResult.docs[0].id, data: versionData, overrideAccess: true })
  : await payload.create({ collection: 'agent-versions', data: versionData, overrideAccess: true })

console.log(JSON.stringify({ agentId: agent.id, versionId: agentVersion.id, key, downloadUrl, fileSize: body.byteLength }, null, 2))
