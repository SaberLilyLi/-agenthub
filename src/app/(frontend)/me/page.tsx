import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { payloadForHeaders } from '@/lib/auth'
import { ProfileForm } from '@/components/account/ProfileForm'
export default async function Me(){const {user}=await payloadForHeaders(await headers());if(!user||user.collection!=='users')redirect('/login?next=/me');return <><div className="mb-8"><p className="text-sm font-medium text-[var(--brand)]">账户中心</p><h1 className="mt-2 text-3xl font-bold">你好，{user.name}</h1></div><div className="mb-8 flex gap-4 text-sm"><Link href="/me/favorites">我的收藏</Link><Link href="/me/downloads">下载记录</Link><Link href="/admin/collections/agents">Skill 管理台</Link><Link href="/me/submit-skill">投稿 Skill</Link></div><ProfileForm name={user.name} email={user.email}/></>}
