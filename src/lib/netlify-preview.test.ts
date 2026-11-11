import { describe, expect, it } from 'vitest'
import { isApprovedV3DeployPreview, isInitialSuperAdminBootstrapEnabled, isPreviewEmailDeliveryEnabled } from './netlify-preview'

const approvedContext = 'deploy-preview'
const approvedUrl = 'https://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app/'

describe('V3 Deploy Preview isolation', () => {
  it('recognises only this V3 site Deploy Preview', () => {
    expect(isApprovedV3DeployPreview(approvedContext, approvedUrl)).toBe(true)
    expect(isApprovedV3DeployPreview('production', approvedUrl)).toBe(false)
    expect(isApprovedV3DeployPreview(approvedContext, 'https://deploy-preview-2--oxford-finance-hub-v2.netlify.app/')).toBe(false)
    expect(isApprovedV3DeployPreview(approvedContext, 'https://deploy-preview-2--another-site.netlify.app/')).toBe(false)
    expect(isApprovedV3DeployPreview(approvedContext, 'http://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app/')).toBe(false)
    expect(isApprovedV3DeployPreview(approvedContext, undefined)).toBe(false)
    expect(isApprovedV3DeployPreview(approvedContext, 'not-a-url')).toBe(false)
  })

  it('requires the explicit bootstrap flag as well as the approved preview context', () => {
    expect(isInitialSuperAdminBootstrapEnabled(approvedContext, approvedUrl, 'true')).toBe(true)
    expect(isInitialSuperAdminBootstrapEnabled(approvedContext, approvedUrl, 'false')).toBe(false)
    expect(isInitialSuperAdminBootstrapEnabled(approvedContext, approvedUrl, undefined)).toBe(false)
    expect(isInitialSuperAdminBootstrapEnabled('production', approvedUrl, 'true')).toBe(false)
  })

  it('requires the exact V3 preview and explicit flag before email delivery can be enabled', () => {
    expect(isPreviewEmailDeliveryEnabled(approvedContext, approvedUrl, 'true')).toBe(true)
    expect(isPreviewEmailDeliveryEnabled(approvedContext, approvedUrl, 'false')).toBe(false)
    expect(isPreviewEmailDeliveryEnabled('production', approvedUrl, 'true')).toBe(false)
    expect(isPreviewEmailDeliveryEnabled(approvedContext, 'https://deploy-preview-2--oxford-finance-hub-v2.netlify.app/', 'true')).toBe(false)
  })
})
