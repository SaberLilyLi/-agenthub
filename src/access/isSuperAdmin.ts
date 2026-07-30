import type { Access } from 'payload'
import { isActivePlatformUser } from './isActivePlatformUser'

export const hasSuperAdminRole = (user: unknown): boolean =>
  isActivePlatformUser(user) && user.role === 'superadmin'

export const isSuperAdmin: Access = ({ req }) => hasSuperAdminRole(req.user)
