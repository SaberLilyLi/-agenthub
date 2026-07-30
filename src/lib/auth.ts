import config from '@payload-config'
import { getPayload } from 'payload'
import { isActivePlatformUser } from '@/access/isActivePlatformUser'

type AuthScope = 'admin' | 'user'

function getCookie(headers: Headers, name: string) {
  const value = headers.get('cookie')?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))
  return value?.slice(name.length + 1)
}

export async function payloadForHeaders(headers: Headers, scope: AuthScope = 'user') {
  const payload = await getPayload({ config })
  const authHeaders = new Headers(headers)

  if (scope === 'user') {
    const token = getCookie(headers, 'agenthub-user-token')
    if (token) authHeaders.set('Authorization', `JWT ${token}`)
  }

  const auth = await payload.auth({ headers: authHeaders })
  return { payload, user: isActivePlatformUser(auth.user) ? auth.user : null }
}
export const payloadForRequest = (request: { headers: Headers }, scope: AuthScope = 'user') => payloadForHeaders(request.headers, scope)
