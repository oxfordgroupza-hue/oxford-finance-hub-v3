import { describe, expect, it } from 'vitest'
import {
  ALLOWED_DOCUMENT_STORAGE_TYPES,
  EXPECTED_DOCUMENT_BUCKET,
  isApprovedDeployPreviewRequest,
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
