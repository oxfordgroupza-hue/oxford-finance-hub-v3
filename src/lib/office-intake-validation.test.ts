import { describe, expect, it } from 'vitest'
import { getOfficeIntakePreviewOrigin } from './office-intake-validation'

describe('Office applicant invitation preview origin', () => {
  it('accepts only the approved V3 Deploy Preview host', () => {
    expect(getOfficeIntakePreviewOrigin('deploy-preview', 'https://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app/'))
      .toBe('https://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app')
  })

  it('rejects V2, unrelated previews, production, HTTP and malformed URLs', () => {
    expect(() => getOfficeIntakePreviewOrigin('deploy-preview', 'https://deploy-preview-2--oxford-finance-hub-v2.netlify.app')).toThrow()
    expect(() => getOfficeIntakePreviewOrigin('deploy-preview', 'https://deploy-preview-2--another-site.netlify.app')).toThrow()
    expect(() => getOfficeIntakePreviewOrigin('production', 'https://oxford-finance-hub-v3-c28z.netlify.app')).toThrow()
    expect(() => getOfficeIntakePreviewOrigin('deploy-preview', 'http://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app')).toThrow()
    expect(() => getOfficeIntakePreviewOrigin('deploy-preview', 'not-a-url')).toThrow()
  })
})
