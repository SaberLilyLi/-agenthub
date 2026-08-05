import type { Access } from 'payload'
import { isActivePlatformUser } from './isActivePlatformUser'

const hasRole = (user: unknown, roles: string[]) =>
  isActivePlatformUser(user) && roles.includes(String(user.role))

export const hasAdminRole = (user: unknown): boolean =>
  hasRole(user, ['superadmin', 'admin'])

export const hasSystemAdminRole = (user: unknown): boolean =>
  hasAdminRole(user)

export const hasContentAdminRole = (user: unknown): boolean =>
  hasAdminRole(user)

export const hasReviewerRole = (user: unknown): boolean =>
  hasAdminRole(user)

export const hasUserAdminRole = (user: unknown): boolean =>
  hasAdminRole(user)

export const isAdmin: Access = ({ req }) => hasAdminRole(req.user)
export const isSystemAdmin: Access = ({ req }) => hasSystemAdminRole(req.user)
export const isContentAdmin: Access = ({ req }) => hasContentAdminRole(req.user)
export const isReviewer: Access = ({ req }) => hasReviewerRole(req.user)
export const isUserAdmin: Access = ({ req }) => hasUserAdminRole(req.user)
