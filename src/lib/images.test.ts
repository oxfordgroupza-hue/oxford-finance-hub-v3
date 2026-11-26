import { describe, expect, it } from 'vitest'
import { img } from './images'

describe('finance category images', () => {
  it('uses root-absolute locally bundled sources for every category', () => {
    for (const file of [
      'vehicle.png',
      'equipment.png',
      'commercial.png',
      'about.png',
      'hero.png',
      'vehicle-g63.jpg',
      'vehicle-mclaren.jpg',
      'equipment-excavator.jpg',
      'equipment-grader.jpg',
      'equipment-solar.jpg',
      'equipment-dialysis.jpg',
      'equipment-dental.jpg',
      'commercial-asset-added.jpg',
      'other-yacht.jpg',
      'other-private-asset.jpg',
      'other-villa.jpg',
    ]) {
      const source = img(file, 960)
      expect(source).toBeTruthy()
      expect(source.startsWith('/')).toBe(true)
      expect(source.startsWith('http://') || source.startsWith('https://')).toBe(false)
    }
  })

  it('uses distinct imagery for the different finance asset types', () => {
    expect(img('vehicle-g63.jpg', 960)).not.toBe(img('vehicle-mclaren.jpg', 960))
    expect(img('equipment-excavator.jpg', 960)).not.toBe(img('equipment-grader.jpg', 960))
    expect(img('equipment-solar.jpg', 960)).not.toBe(img('equipment-dialysis.jpg', 960))
    expect(img('equipment-dialysis.jpg', 960)).not.toBe(img('equipment-dental.jpg', 960))
    expect(img('commercial-asset-added.jpg', 960)).not.toBe(img('vehicle-g63.jpg', 960))
    expect(img('other-yacht.jpg', 960)).not.toBe(img('other-private-asset.jpg', 960))
    expect(img('other-villa.jpg', 960)).not.toBe(img('other-yacht.jpg', 960))
  })

  it('uses a local fallback for unknown image names', () => {
    expect(img('missing-image.png', 960)).toBe(img('about.png', 960))
    expect(img('missing-image.png', 960).startsWith('/')).toBe(true)
  })
})
