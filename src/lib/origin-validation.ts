export function isSameOriginRequest(origin: string | null, requestUrl: string, requireOrigin = false, secFetchSite: string | null = null): boolean {
  let isReadOnlyHealthCheck = false
  try {
    const url = new URL(requestUrl)
    isReadOnlyHealthCheck = !requireOrigin && url.searchParams.get('action') === 'health'
  } catch {
    return false
  }

  // Permit cross-site top-level navigation only for the unauthenticated,
  // read-only health endpoint. All other cross-site API requests stay blocked.
  if (secFetchSite?.toLowerCase() === 'cross-site' && !isReadOnlyHealthCheck) return false
  if (!origin) return !requireOrigin || isReadOnlyHealthCheck

  try {
    return new URL(origin).origin === new URL(requestUrl).origin
  } catch {
    return false
  }
}
