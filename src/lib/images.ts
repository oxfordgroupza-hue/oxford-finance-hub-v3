/**
 * Image sources for the Oxford Finance Hub category carousels.
 * Supplied direct image URLs are used where available.
 */
const imageSources: Record<string, string> = {
  'hero.png': '/images/oxford-hero.jpg',
  'vehicle-g63.jpg': 'https://i.pinimg.com/736x/95/ea/d5/95ead5e194e218445342d91e103be04b.jpg',
  // Free-to-use Unsplash source: https://unsplash.com/photos/orange-mclaren-sports-car-parked-with-cityscape-background-ioUcNuE7RLk
  'vehicle-mclaren.jpg': 'https://images.unsplash.com/photo-1615394695852-da39a8df9bf1?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE3fHx8ZW58MHx8fHx8&ixlib=rb-4.1.0&q=60&w=3000',
  'equipment-solar.jpg': 'https://assets.infineon.com/is/image/infineon/solar-panels-windmills.jpeg',
  'equipment-dialysis.jpg': 'https://catalogs.bbraun.ie/_next/image?q=75&url=https%3A%2F%2Fecatalog.bbraun.com%2FeDoc%2FQlBHMDAwMDAwMDAwMDAwMDAwMTAwMDIyMzM3ODAwMDAw&w=828',
  'equipment-dental.jpg': 'https://www.vitaldental.com.au/retina-images/practice-gallery/img23-big.jpg',
  // Free-to-use Pexels source: https://www.pexels.com/photo/yellow-heavy-equipment-grading-a-dirt-road-8809464/
  'equipment-grader.jpg': 'https://images.pexels.com/photos/8809464/pexels-photo-8809464.jpeg?cs=srgb&dl=pexels-construccion-total-2464540-8809464.jpg&fm=jpg',
  'equipment-excavator.jpg': 'https://commons.wikimedia.org/wiki/Special:FilePath/Excavator%20in%20Work.jpg',
  'commercial.png': 'https://images.pexels.com/photos/5410923/pexels-photo-5410923.jpeg',
  'solutions-hero.jpg': 'https://smesouthafrica.co.za/wp-content/uploads/2026/09/6-Best-Funding-Options-for-Transport-and-Logistics-Businesses-in-South-Africa-1024x538.jpg',
  'commercial-asset-added.jpg': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYlmJ9VaS0lnNKQ8AOWbKHS34RREGCDgCfbI20bNPBBQ&s=10',
  'about.png': '/images/oxford-hero.jpg',
  'other-villa.jpg': 'https://www.capeconcierge.co.za/wp-content/uploads/2024/10/family-friendly-constantia-villa-818x540.jpg',
  'other-private-asset.jpg': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTORoeeXWTZ6F5GhqNHvE15fggSfwqa1v3LTxqTLCyYa_djveC3YquRCwDe&s=10',
  'other-yacht.jpg': 'https://www.galatiyachts.com/wp-content/uploads/Main-Blog-Photo-1630x928-2025-06-16T135104.534-825x470.jpg',
  'other-helicopter.jpg': 'https://www.hillhelicopters.com/_next/image?url=%2Fimages%2Fexterior2%2Fskids-01-mobile.jpg&w=3840&q=75',
}

/** Return the selected direct image URL. Width and quality are retained for API compatibility. */
export const img = (file: string, width: number, quality = 75) => {
  void width
  void quality
  return imageSources[file] ?? '/img/' + file
}

/** All category slides use one fixed image URL each; no generated srcset is needed. */
export const imgSrcSet = (file: string, widths: number[]) => {
  void widths
  return img(file, 1920)
}
