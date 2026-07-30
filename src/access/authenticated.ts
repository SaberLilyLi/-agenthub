import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'
import { isActivePlatformUser } from './isActivePlatformUser'

type isAuthenticated = (args: AccessArgs<User>) => boolean

export const authenticated: isAuthenticated = ({ req: { user } }) => {
  return isActivePlatformUser(user)
}
