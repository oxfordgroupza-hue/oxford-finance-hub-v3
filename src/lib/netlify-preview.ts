const APPROVED_PREVIEW_HOST = /^deploy-preview-\d+--oxford-finance-hub-v3-c28z\.netlify\.app$/i

export function isApprovedV3DeployPreview(context: string | undefined, deployPrimeUrl: string | undefined): boolean {
  if (context !== 'deploy-preview' || !deployPrimeUrl) return false

  try {
    const url = new URL(deployPrimeUrl)
    return url.protocol === 'https:' && APPROVED_PREVIEW_HOST.test(url.hostname) &&
      url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password
  } catch {
    return false
  }
}

export function isInitialSuperAdminBootstrapEnabled(
  context: string | undefined,
  deployPrimeUrl: string | undefined,
  bootstrapFlag: string | undefined,
): boolean {
  return isApprovedV3DeployPreview(context, deployPrimeUrl) && bootstrapFlag === 'true'
}
