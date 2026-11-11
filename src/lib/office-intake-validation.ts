const APPROVED_PREVIEW_HOST = /^deploy-preview-\d+--oxford-finance-hub-v3-c28z\.netlify\.app$/i

export function getOfficeIntakePreviewOrigin(context: string | undefined, deployPrimeUrl: string | undefined): string {
  if (context !== 'deploy-preview' || !deployPrimeUrl) {
    throw new Error('Office applicant invitations are available only in the approved Deploy Preview environment.')
  }

  try {
    const url = new URL(deployPrimeUrl)
    if (url.protocol !== 'https:' || !APPROVED_PREVIEW_HOST.test(url.hostname) ||
        url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
      throw new Error('Office applicant invitations are available only in the approved Deploy Preview environment.')
    }
    return url.origin
  } catch {
    throw new Error('Office applicant invitations are available only in the approved Deploy Preview environment.')
  }
}
