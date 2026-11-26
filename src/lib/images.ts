import heroImage from '../assets/oxford-hero.jpg'
import aboutImage from '../assets/about-office.webp'
import vehicleG63Image from '../assets/vehicle-g63.jpg'
import vehicleMcLarenImage from '../assets/vehicle-mclaren.jpg'
import equipmentExcavatorImage from '../assets/equipment-excavator.webp'
import equipmentGraderImage from '../assets/equipment-grader.jpg'
import equipmentSolarImage from '../assets/equipment-solar.webp'
import equipmentDialysisImage from '../assets/equipment-dialysis.jpg'
import equipmentDentalImage from '../assets/equipment-dental.jpg'
import commercialTruckImage from '../assets/commercial-truck.jpg'
import yachtImage from '../assets/other-yacht.jpg'
import privateJetImage from '../assets/other-private-jet.jpg'
import villaImage from '../assets/other-villa.jpg'

/**
 * Locally bundled, verified image assets for the Oxford Finance Hub.
 * The original PNG files were invalid image data despite returning HTTP 200.
 * These assets are imported so Vite includes them in the Cloudflare asset manifest.
 */
const rootAsset = (url: string) => (url.startsWith('/') ? url : '/' + (url.startsWith('./') ? url.slice(2) : url))

const imageSources: Record<string, string> = {
  'hero.png': heroImage,
  'vehicle.png': vehicleG63Image,
  'equipment.png': equipmentExcavatorImage,
  'commercial.png': commercialTruckImage,
  'about.png': aboutImage,
  'vehicle-g63.jpg': vehicleG63Image,
  'vehicle-mclaren.jpg': vehicleMcLarenImage,
  'equipment-solar.jpg': equipmentSolarImage,
  'equipment-dialysis.jpg': equipmentDialysisImage,
  'equipment-dental.jpg': equipmentDentalImage,
  'equipment-grader.jpg': equipmentGraderImage,
  'equipment-excavator.jpg': equipmentExcavatorImage,
  'commercial-asset-added.jpg': commercialTruckImage,
  'solutions-hero.jpg': heroImage,
  'other-villa.jpg': villaImage,
  'other-private-asset.jpg': privateJetImage,
  'other-yacht.jpg': yachtImage,
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
