/**
 * Only identities from the public `users` collection are platform users.
 * Payload can authenticate more than one auth collection, so role checks must
 * never rely on a role string alone.
 */
export type ActivePlatformUser = {
  collection: 'users'
  disabled?: boolean | null
  id: number | string
  role?: string | null
}

export const isDisabledUser = (user: unknown): boolean =>
  Boolean(user && typeof user === 'object' && 'disabled' in user && user.disabled === true)

export const isActivePlatformUser = (user: unknown): user is ActivePlatformUser =>
  Boolean(
    user &&
      typeof user === 'object' &&
      'collection' in user &&
      user.collection === 'users' &&
      !isDisabledUser(user) &&
      'id' in user,
  )
