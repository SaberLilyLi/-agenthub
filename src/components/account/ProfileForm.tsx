'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { csrfHeaders } from '@/lib/client/csrf'

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [value, setValue] = useState(name)

  async function save() {
    const response = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...csrfHeaders() },
      body: JSON.stringify({ name: value }),
    })
    if (response.ok) toast.success('资料已保存')
    else toast.error((await response.json()).message)
  }

  return <div className="max-w-lg rounded-[var(--radius)] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow)]"><label className="text-sm font-medium">昵称<Input className="mt-2" value={value} onChange={event => setValue(event.target.value)} /></label><label className="mt-5 block text-sm font-medium">邮箱<Input className="mt-2" value={email} disabled /></label><Button className="mt-6" onClick={save}>保存资料</Button></div>
}
