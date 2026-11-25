import { describe, expect, it } from 'vitest'
import { isSameOriginRequest } from './origin-validation'

describe('same-origin request validation', () => {
  const requestUrl = 'https://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app/.netlify/functions/oxford-api'

  it('accepts the same preview origin', () => {
    expect(isSameOriginRequest('https://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app', requestUrl)).toBe(true)
  })

  it('rejects a different Netlify Deploy Preview origin', () => {
    expect(isSameOriginRequest('https://deploy-preview-1--another-project.netlify.app', requestUrl)).toBe(false)
  })

  it('rejects a different scheme or port', () => {
    expect(isSameOriginRequest('http://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app', requestUrl)).toBe(false)
    expect(isSameOriginRequest('https://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app:444', requestUrl)).toBe(false)
  })

  it('rejects malformed origins', () => {
    expect(isSameOriginRequest('not-an-origin', requestUrl)).toBe(false)
  })

  it('allows requests without an Origin header for non-browser read-only callers', () => {
    expect(isSameOriginRequest(null, requestUrl)).toBe(true)
  })

  it('rejects state-changing requests without an Origin header', () => {
    expect(isSameOriginRequest(null, requestUrl, true)).toBe(false)
  })

  it('rejects requests explicitly marked as cross-site even with a matching Origin', () => {
    expect(isSameOriginRequest('https://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app', requestUrl, true, 'cross-site')).toBe(false)
    expect(isSameOriginRequest('https://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app', requestUrl, true, 'same-origin')).toBe(true)
  })
})
