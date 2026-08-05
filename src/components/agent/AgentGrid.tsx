import config from '@payload-config'
import { getPayload } from 'payload'

import type { Agent } from '@/payload-types'
import { getLatestVersionMap, toCardData } from '@/lib/agentQueries'

import { AgentCard } from './AgentCard'

/** Server grid used by pages that already have Agent docs (e.g. category page). */
export async function AgentGrid({ agents }: { agents: Agent[] }) {
  const payload = await getPayload({ config })
  const versions = await getLatestVersionMap(
    payload,
    agents.map((agent) => agent.id),
  )

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={toCardData(agent, versions)} />
      ))}
    </div>
  )
}
