export function isSameOriginRequest(origin: string | null, requestUrl: string, requireOrigin = false): boolean {
  if (!origin) return !requireOrigin

  try {
    return new URL(origin).origin === new URL(requestUrl).origin
  } catch {
    return false
  }
}
