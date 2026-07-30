import config from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import { AgentGrid } from '@/components/agent/AgentGrid'
import { EmptyState } from '@/components/common/EmptyState'
export default async function CategoryPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const payload=await getPayload({config});const categories=await payload.find({collection:'categories',where:{slug:{equals:slug}},limit:1});const category=categories.docs[0];if(!category)notFound();const agents=await payload.find({collection:'agents',where:{and:[{status:{equals:'published'}},{category:{equals:category.id}}]},sort:'-publishedAt',limit:24});return <><p className="text-sm font-medium text-[var(--brand)]">分类</p><h1 className="mt-2 text-3xl font-bold">{category.name}</h1><p className="mt-3 text-slate-600">{category.description}</p><div className="mt-8">{agents.docs.length?<AgentGrid agents={agents.docs}/>:<EmptyState title="该分类暂时没有已发布 Agent" description="请浏览其他分类或稍后再来。"/>}</div></>}
