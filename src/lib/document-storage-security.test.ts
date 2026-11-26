import { describe, expect, it } from 'vitest'
import {
  ALLOWED_DOCUMENT_STORAGE_TYPES,
  EXPECTED_DOCUMENT_BUCKET,
  isApprovedCloudflarePreviewRequest,
  isApprovedCloudflareProductionRequest,
  isApprovedCloudflareRuntimeRequest,
  isStorageBucketVerified,
  MAX_BUCKET_FILE_BYTES,
} from './document-storage-security'

const validBucket = {
  id: EXPECTED_DOCUMENT_BUCKET,
  public: false,
  file_size_limit: MAX_BUCKET_FILE_BYTES,
  allowed_mime_types: [...ALLOWED_DOCUMENT_STORAGE_TYPES],
}

describe('Cloudflare Worker preview storage gate', () => {
  const cloudflarePreviewUrl = 'https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api/oxford'

  it('accepts only the explicitly named stable branch Preview hostnames', () => {
    expect(isApprovedCloudflarePreviewRequest(cloudflarePreviewUrl)).toBe(true)
    expect(isApprovedCloudflarePreviewRequest('https://recovery-import-verified-baseline-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/')).toBe(true)
    expect(isApprovedCloudflarePreviewRequest('https://release-v3-production-2026-11-25-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/')).toBe(true)
  })

  it('rejects the previous stale preview hostname', async () => {
    const { isApprovedCloudflarePreviewRequest } = await import('./document-storage-security')
    expect(isApprovedCloudflarePreviewRequest('https://oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api/oxford')).toBe(false)
  })

  it('rejects production, HTTP, credentials and nonstandard ports', async () => {
    const { isApprovedCloudflarePreviewRequest } = await import('./document-storage-security')
    expect(isApprovedCloudflarePreviewRequest('https://finance.oxfordbusinessgroup.co.za/api/oxford')).toBe(false)
    expect(isApprovedCloudflarePreviewRequest(cloudflarePreviewUrl.replace('https://','http://'))).toBe(false)
    expect(isApprovedCloudflarePreviewRequest(cloudflarePreviewUrl.replace('://','://user:pass@'))).toBe(false)
    expect(isApprovedCloudflarePreviewRequest(cloudflarePreviewUrl.replace('.workers.dev/','.workers.dev:8443/'))).toBe(false)
  })
})


describe('Cloudflare production host gate', () => {
  const cloudflarePreviewUrl = 'https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api/oxford'

  it('accepts the launch reconciliation Preview host', () => {
    expect(isApprovedCloudflarePreviewRequest('https://launch-v3-reconciled-2026-11-26-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev')).toBe(true)
  })

  it('accepts only the canonical HTTPS Finance Hub hostname', () => {
    expect(isApprovedCloudflareProductionRequest('https://finance.oxfordbusinessgroup.co.za/')).toBe(true)
  })

  it('maps each deployment context only to its matching canonical host', () => {
    expect(isApprovedCloudflareRuntimeRequest(cloudflarePreviewUrl, 'cloudflare-preview')).toBe(true)
    expect(isApprovedCloudflareRuntimeRequest('https://finance.oxfordbusinessgroup.co.za/', 'cloudflare-production')).toBe(true)
    expect(isApprovedCloudflareRuntimeRequest('https://finance.oxfordbusinessgroup.co.za/', 'cloudflare-preview')).toBe(false)
    expect(isApprovedCloudflareRuntimeRequest(cloudflarePreviewUrl, 'cloudflare-production')).toBe(false)
    expect(isApprovedCloudflareRuntimeRequest('https://finance.oxfordbusinessgroup.co.za/', 'deploy-preview')).toBe(false)
  })

  it('rejects other hosts, HTTP, credentials and nonstandard ports', () => {
    expect(isApprovedCloudflareProductionRequest('https://www.oxfordbusinessgroup.co.za/')).toBe(false)
    expect(isApprovedCloudflareProductionRequest('https://finance.oxfordbusinessgroup.co.za.evil.example/')).toBe(false)
    expect(isApprovedCloudflareProductionRequest('http://finance.oxfordbusinessgroup.co.za/')).toBe(false)
    expect(isApprovedCloudflareProductionRequest('https://user:pass@finance.oxfordbusinessgroup.co.za/')).toBe(false)
    expect(isApprovedCloudflareProductionRequest('https://finance.oxfordbusinessgroup.co.za:8443/')).toBe(false)
  })
})
