import config from '@payload-config'
import { getPayload } from 'payload'
import { AgentCard } from './AgentCard'
type Cover = number | null | { url?: string | null; alt: string }
type Agent = { id:number; slug:string; name:string; summary:string; downloadCount?:number|null; cover?:Cover }

export async function AgentGrid({ agents }: { agents: Agent[] }) {
  const agentIds = agents.map((agent) => agent.id)
  const latestVersionByAgent = new Map<number, string>()

  if (agentIds.length) {
    const payload = await getPayload({ config })
    const versions = await payload.find({
      collection: 'agent-versions',
      where: { and: [{ agent: { in: agentIds } }, { status: { equals: 'published' } }] },
      sort: '-publishedAt',
      limit: agentIds.length * 10,
      depth: 0,
    })
    for (const version of versions.docs) {
      const agentId = typeof version.agent === 'number' ? version.agent : version.agent.id
      if (!latestVersionByAgent.has(agentId)) latestVersionByAgent.set(agentId, version.version)
    }
  }

  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{agents.map(agent => <AgentCard key={agent.id} agent={{ ...agent, latestVersion: latestVersionByAgent.get(agent.id) }}/>)}</div>
}
