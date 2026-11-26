import heroImage from '../assets/oxford-hero.jpg'
import vehicleImage from '../assets/vehicle.png'
import equipmentImage from '../assets/equipment.png'
import aboutImage from '../assets/about.png'

/**
 * Locally bundled image assets for the Oxford Finance Hub.
 * Importing these files makes them part of the Cloudflare asset manifest;
 * dynamic strings pointing into public/ are not reliably emitted by the
 * Cloudflare Preview build.
 */
const rootAsset = (url: string) => (url.startsWith('/') ? url : `/${url.replace(/^\.\/+/, '')}`)

const imageSources: Record<string, string> = {
  'hero.png': heroImage,
  'vehicle.png': vehicleImage,
  'equipment.png': equipmentImage,
  'commercial.png': equipmentImage,
  'about.png': aboutImage,
  'vehicle-g63.jpg': vehicleImage,
  'vehicle-mclaren.jpg': vehicleImage,
  'equipment-solar.jpg': equipmentImage,
  'equipment-dialysis.jpg': equipmentImage,
  'equipment-dental.jpg': equipmentImage,
  'equipment-grader.jpg': equipmentImage,
  'equipment-excavator.jpg': equipmentImage,
  'commercial-asset-added.jpg': equipmentImage,
  'solutions-hero.jpg': heroImage,
  'other-villa.jpg': aboutImage,
  'other-private-asset.jpg': aboutImage,
  'other-yacht.jpg': aboutImage,
  'other-helicopter.jpg': aboutImage,
}

/** Return a bundled image URL. Width and quality remain for API compatibility. */
export const img = (file: string, width: number, quality = 75) => {
  void width
  void quality
  return rootAsset(imageSources[file] ?? aboutImage)
}

/** The bundled image is a single responsive asset; no generated srcset is needed. */
export const imgSrcSet = (file: string, widths: number[]) => {
  void widths
  return img(file, 1920)
}
