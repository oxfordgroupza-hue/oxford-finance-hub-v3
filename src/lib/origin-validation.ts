export function isSameOriginRequest(origin: string | null, requestUrl: string, requireOrigin = false, secFetchSite: string | null = null): boolean {
  if (secFetchSite?.toLowerCase() === 'cross-site') return false
  if (!origin) return !requireOrigin

  try {
    return new URL(origin).origin === new URL(requestUrl).origin
  } catch {
    return false
  }
}
