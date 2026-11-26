import { MAX_FUNCTION_UPLOAD_BYTES } from './document-validation'

export type OptimisedDocument = {
  file: File
  originalBytes: number
  finalBytes: number
  reduced: boolean
}

function fileWithBlob(source: File, blob: Blob, extension: string, mimeType: string): File {
  const name = source.name.replace(/\\.[^.]+$/, '') || 'document'
  return new File([blob], `${name}.${extension}`, {
    type: mimeType,
    lastModified: source.lastModified,
  })
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('The image could not be optimised in this browser.'))
      },
      'image/jpeg',
      quality,
    )
  })
}

async function optimiseImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function') {
    if (file.size <= MAX_FUNCTION_UPLOAD_BYTES) return file
    throw new Error('This browser cannot safely optimise this image. Please use a smaller JPG or PNG.')
  }

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image optimisation is unavailable in this browser.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    let best: File | null = null
    for (const quality of [0.88, 0.82, 0.76, 0.7]) {
      const blob = await canvasBlob(canvas, quality)
      const candidate = fileWithBlob(file, blob, 'jpg', 'image/jpeg')
      if (!best || candidate.size < best.size) best = candidate
      if (candidate.size <= MAX_FUNCTION_UPLOAD_BYTES) return candidate
    }
    if (file.size <= MAX_FUNCTION_UPLOAD_BYTES && best && best.size >= file.size) return file
    if (best && best.size <= MAX_FUNCTION_UPLOAD_BYTES) return best
    throw new Error(
      'This image is still larger than 4 MB after optimisation. Please use a clearer, smaller scan or split the document.',
    )
  } finally {
    bitmap.close()
  }
}

/**
 * Optimises selected images only after the applicant presses Submit.
 * PDFs are deliberately preserved byte-for-byte: rewriting a PDF can invalidate
 * digital signatures or alter embedded files, annotations and document metadata.
 * Oversized PDFs must be exported smaller or split by the applicant.
 */
export async function optimiseDocumentFile(file: File): Promise<OptimisedDocument> {
  let optimised: File
  if (file.type === 'image/jpeg' || file.type === 'image/png') {
    optimised = await optimiseImage(file)
  } else if (file.type === 'application/pdf') {
    optimised = file
  } else {
    throw new Error('Only PDF, JPG and PNG files can be uploaded.')
  }

  if (optimised.size > MAX_FUNCTION_UPLOAD_BYTES) {
    throw new Error(
      file.type === 'application/pdf'
        ? 'This PDF is larger than 4 MB. Please export it as a smaller PDF or split it into separate documents.'
        : 'This file is still larger than 4 MB after optimisation. Please split it into smaller documents.',
    )
  }
  return {
    file: optimised,
    originalBytes: file.size,
    finalBytes: optimised.size,
    reduced: optimised.size < file.size,
  }
}
