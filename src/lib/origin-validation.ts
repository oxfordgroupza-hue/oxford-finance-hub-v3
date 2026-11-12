export function isSameOriginRequest(origin: string | null, requestUrl: string): boolean {
  if (!origin) return true

  try {
    return new URL(origin).origin === new URL(requestUrl).origin
  } catch {
    return false
  }
}
