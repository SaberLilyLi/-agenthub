import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'

import { payloadForRequest } from '@/lib/auth'
import { downloadAuditMetadata } from '@/lib/downloadAudit'
import { isLocalSkillSubmissionUrl } from '@/lib/skillSubmission'

export async function POST(request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params
  const { payload, user } = await payloadForRequest(request)
  const version = await payload.findByID({ collection: 'agent-versions', id: versionId, overrideAccess: false })
  if (!version.downloadUrl) return new Response('当前版本暂时无法下载', { status: 404 })
  let url: URL
  try { url = new URL(version.downloadUrl) } catch { return new Response('下载地址无效', { status: 400 }) }
  const allowed = (process.env.DOWNLOAD_ALLOWED_HOSTS || '').split(',').map(value => value.trim()).filter(Boolean)
  const allowedExternalURL = url.protocol === 'https:' && allowed.includes(url.host)
  if (!isLocalSkillSubmissionUrl(url) && !allowedExternalURL) return new Response('下载地址不在允许白名单中', { status: 403 })
  const agentId = typeof version.agent === 'number' ? version.agent : version.agent.id
  const agent = await payload.findByID({ collection: 'agents', id: agentId, overrideAccess: true })
  if (agent.status !== 'published') return new Response('当前 Agent 未发布，无法下载', { status: 404 })
  const audit = downloadAuditMetadata(request.headers, Boolean(user))
  // The publication check, counter increment, and audit insert commit as one
  // PostgreSQL statement. A unique/audit failure rolls the increment back.
  const result = await (payload.db as unknown as PostgresAdapter).drizzle.execute(sql`
    WITH incremented AS (
      UPDATE "agents"
      SET "download_count" = COALESCE("download_count", 0) + 1
      WHERE "id" = ${agentId} AND "status" = 'published'
      RETURNING "id"
    )
    INSERT INTO "download_records" (
      "user_id", "agent_id", "version_id", "actor_type", "request_id",
      "ip_hash", "ip_hash_key_version", "user_agent", "updated_at", "created_at"
    )
    SELECT
      ${user?.id ?? null}, ${agentId}, ${version.id}, ${audit.actorType}, ${audit.requestId},
      ${audit.ipHash ?? null}, ${audit.ipHashKeyVersion ?? null}, ${audit.userAgent ?? null}, now(), now()
    FROM incremented
    RETURNING "id"
  `)
  if (!result.rows.length) return new Response('当前 Agent 未发布，无法下载', { status: 404 })
  return Response.json({ downloadUrl: url.toString() })
}
