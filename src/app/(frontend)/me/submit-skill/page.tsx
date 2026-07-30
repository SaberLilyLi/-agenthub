import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { SkillSubmissionForm } from '@/components/account/SkillSubmissionForm'
import { SkillUploadPermissionRequest } from '@/components/account/SkillUploadPermissionRequest'
import { payloadForHeaders } from '@/lib/auth'
import { hasActiveSkillSubmissionPermission } from '@/access/skillSubmissionPermission'

export default async function SubmitSkillPage() {
  const { payload, user } = await payloadForHeaders(await headers())
  if (!user || user.collection !== 'users') redirect('/login?next=/me/submit-skill')
  if (!hasActiveSkillSubmissionPermission(user)) return <section className="max-w-2xl"><p className="text-sm font-medium text-[var(--brand)]">创作者投稿</p><h1 className="mt-2 text-3xl font-bold">申请 Skill 上传权限</h1><SkillUploadPermissionRequest /></section>
  const categories = await payload.find({ collection: 'categories', limit: 100, sort: 'name', depth: 0 })

  return <section className="max-w-2xl"><p className="text-sm font-medium text-[var(--brand)]">创作者投稿</p><h1 className="mt-2 text-3xl font-bold">发布你的 Skill</h1><p className="mt-3 text-slate-600">文件会先进入待审核区。审核通过后才上传至 COS，并在 Agent 广场公开展示；拒绝的投稿将被删除。</p><SkillSubmissionForm categories={categories.docs.map((category) => ({ id: category.id, name: category.name }))} /></section>
}
