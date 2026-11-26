import { describe, expect, it } from 'vitest'
import { img } from './images'

describe('finance category images', () => {
  it('uses locally bundled sources for all finance categories', () => {
    for (const file of ['vehicle.png', 'equipment.png', 'commercial.png', 'about.png', 'hero.png']) {
      const source = img(file, 960)
      expect(source).toBeTruthy()
      expect(source).toMatch(/^\//)
      expect(source).not.toMatch(/^https?:\/\//)
    }
  })

  it('uses a local fallback for unknown image names', () => {
    expect(img('missing-image.png', 960)).toBe(img('about.png', 960))
    expect(img('missing-image.png', 960)).toMatch(/^\//)
  })
})
