const csrfCookieName = 'agenthub-csrf-token'

/** Returns the same-site CSRF token issued by the route proxy for browser API writes. */
export function csrfHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {}

  const token = document.cookie
    .split('; ')
    .find((value) => value.startsWith(`${csrfCookieName}=`))
    ?.slice(csrfCookieName.length + 1)

  return token ? { 'x-csrf-token': decodeURIComponent(token) } : {}
}
