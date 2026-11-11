export function maskIdentityNumber(value: string): string {
  const normalized = value.replace(/[\s-]/g, '')
  return normalized.length > 4 ? `********${normalized.slice(-4)}` : '********'
}

export function isSupportDirectoryOnly(permissions: readonly string[]): boolean {
  return permissions.includes('support.view') && !permissions.includes('applications.view')
}

export function canSearchInternalDirectoryUsers(permissions: readonly string[], isSuperAdmin: boolean): boolean {
  return isSuperAdmin || permissions.includes('support.view') && !permissions.includes('applications.view') ||
    permissions.includes('users.view') || permissions.includes('applications.assign')
}

export function identityNumberFromQuery(value: string): string | null {
  const match = value.match(/^(?:ID|PASSPORT):\s*([A-Za-z0-9 -]{4,32})$/i)
  return match?.[1]?.trim() || null
}
