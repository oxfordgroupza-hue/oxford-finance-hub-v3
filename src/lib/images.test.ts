import { describe, expect, it } from 'vitest'
import { img } from './images'

describe('finance category images', () => {
  it('returns root-relative bundled URLs for every finance category image', () => {
    for (const file of ['vehicle.png', 'equipment.png', 'commercial.png', 'about.png', 'hero.png']) {
      const source = img(file, 960)
      expect(source).toBeTruthy()
      expect(source.startsWith('/')).toBe(true)
      expect(source).not.toMatch(/^https?:\/\//)
    }
  })

  it('returns root-relative URLs for the hero and asset detail images', () => {
    for (const file of [
      'solutions-hero.jpg',
      'vehicle-g63.jpg',
      'vehicle-mclaren.jpg',
      'equipment-solar.jpg',
      'equipment-dialysis.jpg',
      'equipment-dental.jpg',
      'equipment-grader.jpg',
      'equipment-excavator.jpg',
      'commercial-asset-added.jpg',
      'other-villa.jpg',
      'other-private-asset.jpg',
      'other-yacht.jpg',
      'other-helicopter.jpg',
    ]) {
      expect(img(file, 960).startsWith('/')).toBe(true)
    }
  })

  it('uses a local fallback for unknown image names', () => {
    expect(img('missing-image.png', 960)).toBe(img('about.png', 960))
  })
})
