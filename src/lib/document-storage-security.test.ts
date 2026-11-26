import { describe, expect, it } from 'vitest'
import {
  ALLOWED_DOCUMENT_STORAGE_TYPES,
  EXPECTED_DOCUMENT_BUCKET,
  EXPECTED_PREVIEW_DOCUMENT_BUCKET,
  getDocumentStoragePolicy,
  isApprovedDeployPreviewRequest,
  isApprovedCloudflarePreviewRequest,
  isApprovedCloudflareProductionRequest,
  isApprovedCloudflareRuntimeRequest,
  isStorageBucketVerified,
  MAX_BUCKET_FILE_BYTES,
  MAX_PREVIEW_BUCKET_FILE_BYTES,
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
  it('accepts the isolated Preview bucket with its smaller upload limit', () => {
    const policy = getDocumentStoragePolicy('cloudflare-preview')
    expect(policy).toEqual({ bucket: EXPECTED_PREVIEW_DOCUMENT_BUCKET, maxFileBytes: MAX_PREVIEW_BUCKET_FILE_BYTES })
    expect(isStorageBucketVerified({
      id: EXPECTED_PREVIEW_DOCUMENT_BUCKET,
      public: false,
      file_size_limit: MAX_PREVIEW_BUCKET_FILE_BYTES,
      allowed_mime_types: [...ALLOWED_DOCUMENT_STORAGE_TYPES],
    }, policy!.bucket, policy!.maxFileBytes)).toBe(true)
    expect(isStorageBucketVerified(validBucket, policy!.bucket, policy!.maxFileBytes)).toBe(false)
  })

  it('keeps the production bucket and limit separate from Preview', () => {
    expect(getDocumentStoragePolicy('cloudflare-production')).toEqual({ bucket: EXPECTED_DOCUMENT_BUCKET, maxFileBytes: MAX_BUCKET_FILE_BYTES })
    expect(getDocumentStoragePolicy('unknown')).toBeNull()
  })

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
  const cloudflarePreviewUrl = 'https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api/oxford'

  it('accepts only the explicitly named stable branch Preview hostnames', () => {
    expect(isApprovedCloudflarePreviewRequest(cloudflarePreviewUrl)).toBe(true)
    expect(isApprovedCloudflarePreviewRequest('https://recovery-import-verified-baseline-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/')).toBe(true)
    expect(isApprovedCloudflarePreviewRequest('https://release-v3-production-2026-11-25-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/')).toBe(true)
  })

  it('accepts the dedicated Preview Worker hostname and rejects unrelated workers.dev hosts', async () => {
    const { isApprovedCloudflarePreviewRequest } = await import('./document-storage-security')
    expect(isApprovedCloudflarePreviewRequest('https://oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api/oxford')).toBe(true)
    expect(isApprovedCloudflarePreviewRequest('https://unrelated-preview.oxfordbusinessgroup.workers.dev/api/oxford')).toBe(false)
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
