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

describe('Cloudflare Worker preview storage gate', () => {
  const preview = 'https://release-v3-production-2026-11-25-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api/oxford'
  const cleanupPreview = 'https://cleanup-cloudflare-only-platform-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/api/oxford'
  it('accepts explicitly approved Preview Worker hostnames', () => {
    expect(isApprovedCloudflarePreviewRequest(preview)).toBe(true)
    expect(isApprovedCloudflarePreviewRequest(cleanupPreview)).toBe(true)
  })
  it('rejects unknown preview hosts and non-HTTPS URLs', () => {
    expect(isApprovedCloudflarePreviewRequest('https://unknown-branch-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/')).toBe(false)
    expect(isApprovedCloudflarePreviewRequest(preview.replace('https://', 'http://'))).toBe(false)
  })
  it('rejects the production host as a preview', () => {
    expect(isApprovedCloudflarePreviewRequest('https://finance.oxfordbusinessgroup.co.za/')).toBe(false)
  })
})

describe('Cloudflare Worker production storage gate', () => {
  it('accepts only the canonical production hostname', () => {
    expect(isApprovedCloudflareProductionRequest('https://finance.oxfordbusinessgroup.co.za/')).toBe(true)
    expect(isApprovedCloudflareProductionRequest('https://finance.oxfordbusinessgroup.co.za:8443/')).toBe(false)
    expect(isApprovedCloudflareProductionRequest('http://finance.oxfordbusinessgroup.co.za/')).toBe(false)
    expect(isApprovedCloudflareProductionRequest('https://another.example/')).toBe(false)
  })
  it('selects a runtime host only when its context and hostname both match', () => {
    expect(isApprovedCloudflareRuntimeRequest('https://finance.oxfordbusinessgroup.co.za/', 'cloudflare-production')).toBe(true)
    expect(isApprovedCloudflareRuntimeRequest('https://finance.oxfordbusinessgroup.co.za/', 'cloudflare-preview')).toBe(false)
    expect(isApprovedCloudflareRuntimeRequest('https://unknown.example/', 'cloudflare-production')).toBe(false)
    expect(isApprovedCloudflareRuntimeRequest('https://release-v3-production-2026-11-25-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/', 'cloudflare-preview')).toBe(true)
    expect(isApprovedCloudflareRuntimeRequest('https://finance.oxfordbusinessgroup.co.za/', 'production')).toBe(false)
  })
})
