import { describe, expect, it } from 'vitest'
import {
  ALLOWED_DOCUMENT_STORAGE_TYPES,
  EXPECTED_DOCUMENT_BUCKET,
  isApprovedDeployPreviewRequest,
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

const previewContext = {
  site: { id: 'approved-site-id' },
  deploy: { context: 'deploy-preview' },
}

const previewUrl = 'https://deploy-preview-27--oxford-finance-hub-v3.netlify.app/.netlify/functions/oxford-api'

describe('private document bucket verification', () => {
  it('accepts only the exact private bucket configuration', () => {
    expect(isStorageBucketVerified(validBucket)).toBe(true)
  })

  it('rejects a public bucket', () => {
    expect(isStorageBucketVerified({ ...validBucket, public: true })).toBe(false)
  })

  it('rejects a different bucket name', () => {
    expect(isStorageBucketVerified({ ...validBucket, id: 'another-bucket' })).toBe(false)
  })

  it('rejects a file limit that differs from the approved 10 MB', () => {
    expect(isStorageBucketVerified({ ...validBucket, file_size_limit: 4 * 1024 * 1024 })).toBe(false)
    expect(isStorageBucketVerified({ ...validBucket, file_size_limit: null })).toBe(false)
  })

  it('rejects missing, extra or unsupported MIME types', () => {
    expect(isStorageBucketVerified({ ...validBucket, allowed_mime_types: ['application/pdf'] })).toBe(false)
    expect(isStorageBucketVerified({ ...validBucket, allowed_mime_types: [...ALLOWED_DOCUMENT_STORAGE_TYPES, 'text/plain'] })).toBe(false)
    expect(isStorageBucketVerified({ ...validBucket, allowed_mime_types: ['application/pdf', 'image/jpeg', 'image/gif'] })).toBe(false)
  })
})

describe('deploy-preview-only storage gate', () => {
  it('accepts the approved site and deploy-preview context on a Netlify preview hostname', () => {
    expect(isApprovedDeployPreviewRequest(previewUrl, previewContext, 'approved-site-id')).toBe(true)
  })

  it('rejects production context even on the preview hostname', () => {
    expect(isApprovedDeployPreviewRequest(previewUrl, { ...previewContext, deploy: { context: 'production' } }, 'approved-site-id')).toBe(false)
  })

  it('rejects an unapproved site ID', () => {
    expect(isApprovedDeployPreviewRequest(previewUrl, previewContext, 'different-site-id')).toBe(false)
  })

  it('rejects HTTP preview URLs and nonstandard ports', () => {
    expect(isApprovedDeployPreviewRequest(previewUrl.replace('https://', 'http://'), previewContext, 'approved-site-id')).toBe(false)
    expect(isApprovedDeployPreviewRequest(previewUrl.replace('.netlify.app/', '.netlify.app:8443/'), previewContext, 'approved-site-id')).toBe(false)
  })

  it('rejects a production hostname even if runtime context claims preview', () => {
    expect(isApprovedDeployPreviewRequest('https://oxford-finance-hub.netlify.app/.netlify/functions/oxford-api', previewContext, 'approved-site-id')).toBe(false)
  })

  it('rejects malformed URLs and missing site identity', () => {
    expect(isApprovedDeployPreviewRequest('not a URL', previewContext, 'approved-site-id')).toBe(false)
    expect(isApprovedDeployPreviewRequest(previewUrl, previewContext, '')).toBe(false)
  })
})

describe('Cloudflare Worker preview storage gate', () => {
  const branchPreviewUrl = 'https://production-cloudflare-cutover-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api/oxford'
  const releasePreviewUrl = 'https://release-v3-production-2026-11-25-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api/oxford'
  const auditPreviewUrl = 'https://audit-production-cutover-candidate-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api/oxford'
  const uniquePreviewUrl = 'https://dec14df0-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api/oxford'

  it('accepts the production-cutover, release, audit and unique deployment hosts for this Preview Worker service', () => {
    for (const url of [branchPreviewUrl, releasePreviewUrl, auditPreviewUrl, uniquePreviewUrl]) {
      expect(isApprovedCloudflarePreviewRequest(url)).toBe(true)
      expect(isApprovedCloudflareRuntimeRequest(url, 'cloudflare-preview')).toBe(true)
    }
  })

  it('rejects other Worker services and stale unrelated hosts', () => {
    expect(isApprovedCloudflarePreviewRequest('https://other-service.oxfordbusinessgroup.workers.dev/api')).toBe(false)
    expect(isApprovedCloudflarePreviewRequest('https://oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api')).toBe(false)
    expect(isApprovedCloudflarePreviewRequest('https://example.com/api')).toBe(false)
  })

  it('rejects production, HTTP, credentials and nonstandard ports', () => {
    expect(isApprovedCloudflarePreviewRequest('https://finance.oxfordbusinessgroup.co.za/api/oxford')).toBe(false)
    expect(isApprovedCloudflarePreviewRequest(branchPreviewUrl.replace('https://', 'http://'))).toBe(false)
    expect(isApprovedCloudflarePreviewRequest(branchPreviewUrl.replace('://', '://user:pass@'))).toBe(false)
    expect(isApprovedCloudflarePreviewRequest(branchPreviewUrl.replace('.workers.dev/', '.workers.dev:8443/'))).toBe(false)
  })
})

describe('Cloudflare production runtime gate', () => {
  const productionUrl = 'https://finance.oxfordbusinessgroup.co.za/api/oxford'

  it('accepts only the canonical HTTPS production hostname', () => {
    expect(isApprovedCloudflareProductionRequest(productionUrl)).toBe(true)
    expect(isApprovedCloudflareRuntimeRequest(productionUrl, 'cloudflare-production')).toBe(true)
  })

  it('rejects preview hosts, lookalike hosts, HTTP, credentials and nonstandard ports', () => {
    expect(isApprovedCloudflareProductionRequest('https://production-cloudflare-cutover-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev')).toBe(false)
    expect(isApprovedCloudflareProductionRequest('https://finance.oxfordbusinessgroup.co.za.example.com')).toBe(false)
    expect(isApprovedCloudflareProductionRequest(productionUrl.replace('https://', 'http://'))).toBe(false)
    expect(isApprovedCloudflareProductionRequest(productionUrl.replace('://', '://user:pass@'))).toBe(false)
    expect(isApprovedCloudflareProductionRequest(productionUrl.replace('.co.za/', '.co.za:8443/'))).toBe(false)
  })

  it('does not allow a production hostname under a preview context or unknown context', () => {
    expect(isApprovedCloudflareRuntimeRequest(productionUrl, 'cloudflare-preview')).toBe(false)
    expect(isApprovedCloudflareRuntimeRequest(productionUrl, undefined)).toBe(false)
  })
})
