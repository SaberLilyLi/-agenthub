/**
 * Resolve an agent demo URL for links.
 * - Absolute http(s) URLs are returned as-is (external / production demos).
 * - Relative paths (e.g. `/oneManCompany`) stay relative so the browser
 *   opens them on the current host (localhost in dev, production domain online).
 */
export function resolveDemoUrl(demoUrl: string | null | undefined): string | null {
  const raw = demoUrl?.trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  return raw.startsWith('/') ? raw : `/${raw}`
}

export function isExternalDemoUrl(demoUrl: string | null | undefined): boolean {
  const resolved = resolveDemoUrl(demoUrl)
  return Boolean(resolved && /^https?:\/\//i.test(resolved))
}
