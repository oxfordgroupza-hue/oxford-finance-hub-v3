export const MAX_DOCUMENT_UPLOAD_BYTES = 4 * 1024 * 1024
const OPTIMISE_FROM_BYTES = 1.5 * 1024 * 1024
const TARGET_IMAGE_BYTES = 2.5 * 1024 * 1024
const MAX_IMAGE_EDGE = 2400

export type DocumentOptimisationResult = {
  file: File
  originalSize: number
  finalSize: number
  optimised: boolean
}

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The selected image could not be prepared safely. Please try another file.'))
    }, type, quality)
  })
}

/**
 * Optimise large image scans in the browser before sending them to the private
 * document API. PDFs are never rasterised or rewritten: doing so can damage
 * searchable text, signatures and document legibility.
 */
export async function optimiseDocumentForUpload(file: File): Promise<DocumentOptimisationResult> {
  const unchanged = (): DocumentOptimisationResult => ({
    file,
    originalSize: file.size,
    finalSize: file.size,
    optimised: false,
  })

  if (file.type === 'application/pdf') {
    if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
      throw new Error(`This PDF is ${formatSize(file.size)}. The secure limit is 4 MB. Please export a smaller PDF or split it into separate documents; PDFs are kept intact to protect text and signatures.`)
    }
    return unchanged()
  }

  if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
    throw new Error('Only PDF, JPEG and PNG documents are accepted.')
  }
  if (file.size <= OPTIMISE_FROM_BYTES) {
    if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
      throw new Error('This image exceeds the 4 MB secure upload limit and could not be optimised.')
    }
    return unchanged()
  }

  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    if (file.size <= MAX_DOCUMENT_UPLOAD_BYTES) return unchanged()
    throw new Error('Automatic image optimisation is unavailable in this browser. Please use a supported browser or a smaller image.')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    if (file.size <= MAX_DOCUMENT_UPLOAD_BYTES) return unchanged()
    throw new Error('This image could not be opened for optimisation. Please save it as a JPEG or PNG and try again.')
  }

  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) {
      if (file.size <= MAX_DOCUMENT_UPLOAD_BYTES) return unchanged()
      throw new Error('This browser could not prepare the image for secure upload.')
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    // Preserve PNG transparency and format. JPEG scans use progressively lower
    // quality only as needed, with a conservative floor for readable documents.
    const type = file.type
    const qualities = type === 'image/jpeg' ? [0.86, 0.78, 0.68, 0.58] : [undefined]
    let best: Blob | null = null
    for (const quality of qualities) {
      const candidate = await canvasBlob(canvas, type, quality)
      if (!best || candidate.size < best.size) best = candidate
      if (candidate.size <= TARGET_IMAGE_BYTES) {
        best = candidate
        break
      }
    }

    if (!best || best.size >= file.size) {
      if (file.size <= MAX_DOCUMENT_UPLOAD_BYTES) return unchanged()
      throw new Error(`This image remains larger than 4 MB after optimisation. Please use a clearer, smaller scan or split the document.`)
    }
    if (best.size > MAX_DOCUMENT_UPLOAD_BYTES) {
      throw new Error(`This image is still ${formatSize(best.size)} after optimisation. The secure limit is 4 MB; please use a smaller scan.`)
    }

    const name = type === 'image/jpeg'
      ? file.name.replace(/\.(png|jpe?g)$/i, '.jpg')
      : file.name.replace(/\.(png|jpe?g)$/i, '.png')
    const optimisedFile = new File([best], name, {
      type,
      lastModified: file.lastModified,
    })
    return {
      file: optimisedFile,
      originalSize: file.size,
      finalSize: optimisedFile.size,
      optimised: true,
    }
  } finally {
    bitmap.close()
  }
}
