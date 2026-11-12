import { PDFDocument, StandardFonts } from 'pdf-lib'

export type SupportingPdfDocument = {
  name: string
  mimeType: string
  category?: string
  bytes: Uint8Array
}

const MAX_SUPPORTING_BYTES = 40 * 1024 * 1024
const MAX_PACK_PAGES = 200
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89

export async function mergeSupportingDocumentsIntoPdf(
  summaryPdf: Uint8Array,
  documents: SupportingPdfDocument[],
): Promise<Uint8Array> {
  const totalBytes = documents.reduce((total, document) => total + document.bytes.byteLength, 0)
  if (totalBytes > MAX_SUPPORTING_BYTES) {
    throw new Error('The supporting documents exceed the safe combined processing limit. Please ask Office to review the originals.')
  }

  const output = await PDFDocument.load(summaryPdf)
  const sectionFont = await output.embedFont(StandardFonts.HelveticaBold)
  let previousCategory = ''
  for (const document of documents) {
    try {
      const category = document.category ?? 'Supporting documents'
      if (category !== previousCategory) {
        if (output.getPageCount() + 1 > MAX_PACK_PAGES) throw new Error('The combined pack would exceed the 200-page safety limit.')
        const sectionPage = output.addPage([PAGE_WIDTH, PAGE_HEIGHT])
        sectionPage.drawText(category.replace(/-/g, ' ').toUpperCase(), { x: 48, y: 760, size: 18, font: sectionFont })
        previousCategory = category
      }
      if (document.mimeType === 'application/pdf') {
        const source = await PDFDocument.load(document.bytes)
        const pages = await output.copyPages(source, source.getPageIndices())
        if (output.getPageCount() + pages.length > MAX_PACK_PAGES) {
          throw new Error('The combined pack would exceed the 200-page safety limit.')
        }
        for (const page of pages) output.addPage(page)
        continue
      }

      if (document.mimeType === 'image/jpeg' || document.mimeType === 'image/png') {
        if (output.getPageCount() + 1 > MAX_PACK_PAGES) {
          throw new Error('The combined pack would exceed the 200-page safety limit.')
        }
        const image = document.mimeType === 'image/jpeg'
          ? await output.embedJpg(document.bytes)
          : await output.embedPng(document.bytes)
        const scale = Math.min(500 / image.width, 720 / image.height, 1)
        const width = image.width * scale
        const height = image.height * scale
        const page = output.addPage([PAGE_WIDTH, PAGE_HEIGHT])
        page.drawImage(image, {
          x: (PAGE_WIDTH - width) / 2,
          y: (PAGE_HEIGHT - height) / 2,
          width,
          height,
        })
        continue
      }

      throw new Error('Unsupported supporting document format.')
    } catch (error) {
      if (error instanceof Error && (error.message.includes('200-page') || error.message.includes('combined processing'))) throw error
      throw new Error(`The supporting file "${document.name}" could not be added to the PDF pack. Office must review this original file before the pack can be marked complete.`, { cause: error })
    }
  }

  return output.save({ useObjectStreams: false })
}
