import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { UserCenterDashboard } from '@/components/account/UserCenterDashboard'
import { payloadForHeaders } from '@/lib/auth'
import { getUserCenterData } from '@/lib/userCenter'

export default async function Me() {
  const { payload, user } = await payloadForHeaders(await headers())
  if (!user || user.collection !== 'users') redirect('/login?next=/me')

  const dashboard = await getUserCenterData(payload, user.id)
  return <UserCenterDashboard name={user.name} dashboard={dashboard} />
}
