export function isSameOriginRequest(origin: string | null, requestUrl: string, requireOrigin = false, secFetchSite: string | null = null): boolean {
  let url: URL
  try {
    url = new URL(requestUrl)
  } catch {
    return false
  }

  const isReadOnlyHealthCheck = !requireOrigin && url.searchParams.get('action') === 'health'

  // Permit cross-site top-level navigation only for the unauthenticated,
  // read-only health endpoint. All other cross-site API requests stay blocked.
  if (secFetchSite?.toLowerCase() === 'cross-site' && !isReadOnlyHealthCheck) return false
  if (!origin) return !requireOrigin || isReadOnlyHealthCheck

  try {
    return new URL(origin).origin === url.origin
  } catch {
    return false
  }
}
