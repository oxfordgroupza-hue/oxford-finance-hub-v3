import { describe, expect, it } from 'vitest'
import { img } from './images'

describe('finance category images', () => {
  it('uses verified, browser-decodable sources for vehicle and equipment cards', () => {
    expect(img('vehicle.png', 960)).toContain('images.unsplash.com/photo-1615394695852')
    expect(img('equipment.png', 960)).toContain('images.pexels.com/photos/8809464')
  })

  it('retains the local Oxford hero image', () => {
    expect(img('hero.png', 1920)).toBe('/images/oxford-hero.jpg')
  })
})
