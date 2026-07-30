import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { payloadForHeaders } from '@/lib/auth'
import { AgentGrid } from '@/components/agent/AgentGrid'
import { EmptyState } from '@/components/common/EmptyState'
export default async function Favorites(){const {payload,user}=await payloadForHeaders(await headers());if(!user||user.collection!=='users')redirect('/login?next=/me/favorites');const result=await payload.find({collection:'favorites',where:{user:{equals:user.id}},depth:1,overrideAccess:false});const agents=result.docs.flatMap(f=>typeof f.agent==='number'?[]:[f.agent]);return <><h1 className="mb-8 text-3xl font-bold">我的收藏</h1>{agents.length?<AgentGrid agents={agents}/>:<EmptyState title="还没有收藏 Agent" description="前往 Agent 广场发现实用工具。"/>}</>}
