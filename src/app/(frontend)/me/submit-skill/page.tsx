import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { SkillSubmissionForm } from '@/components/account/SkillSubmissionForm'
import { payloadForHeaders } from '@/lib/auth'

export default async function SubmitSkillPage() {
  const { payload, user } = await payloadForHeaders(await headers())
  if (!user || user.collection !== 'users') redirect('/login?next=/me/submit-skill')
  const categories = await payload.find({ collection: 'categories', limit: 100, sort: 'name', depth: 0 })

  return <section className="max-w-2xl"><p className="text-sm font-medium text-[var(--brand)]">创作者投稿</p><h1 className="mt-2 text-3xl font-bold">发布你的 Skill</h1><p className="mt-3 text-slate-600">文件会保存到服务器本地并进入待审核区。审核通过后才在 Agent 广场公开展示；拒绝后将删除本地压缩包。</p><SkillSubmissionForm categories={categories.docs.map((category) => ({ id: category.id, name: category.name }))} /></section>
}
