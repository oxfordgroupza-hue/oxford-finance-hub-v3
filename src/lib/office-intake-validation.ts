import { isApprovedV3DeployPreview } from './netlify-preview'

export function getOfficeIntakePreviewOrigin(context: string | undefined, deployPrimeUrl: string | undefined): string {
  if (!isApprovedV3DeployPreview(context, deployPrimeUrl)) {
    throw new Error('Office applicant invitations are available only in the approved Deploy Preview environment.')
  }
  return new URL(deployPrimeUrl as string).origin
}
