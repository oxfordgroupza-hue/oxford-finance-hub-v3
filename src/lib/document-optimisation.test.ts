// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { MAX_FUNCTION_UPLOAD_BYTES } from './document-validation'
import { optimiseDocumentFile } from './document-optimisation'

async function createPdfFile(): Promise<File> {
  const document = await PDFDocument.create()
  document.addPage([595, 842]).drawText('Oxford Finance Hub document optimisation test')
  const bytes = await document.save()
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return new File([buffer], 'supporting-document.pdf', {
    type: 'application/pdf',
  })
}

describe('optimiseDocumentFile', () => {
  it('preserves PDF bytes exactly and keeps the original within the upload limit', async () => {
    const original = await createPdfFile()
    const result = await optimiseDocumentFile(original)

    expect(result.file.type).toBe('application/pdf')
    expect(result.file.name).toMatch(/\.pdf$/)
    expect(result.finalBytes).toBe(original.size)
    expect(result.finalBytes).toBeLessThanOrEqual(MAX_FUNCTION_UPLOAD_BYTES)
    expect(result.reduced).toBe(false)
    expect(new Uint8Array(await result.file.arrayBuffer())).toEqual(new Uint8Array(await original.arrayBuffer()))
    expect(new TextDecoder().decode(await result.file.slice(0, 5).arrayBuffer())).toBe('%PDF-')
  })

  it('rejects unsupported file types rather than uploading them unchanged', async () => {
    const file = new File(['not an approved document'], 'document.txt', {
      type: 'text/plain',
    })
    await expect(optimiseDocumentFile(file)).rejects.toThrow('Only PDF, JPG and PNG files can be uploaded.')
  })

  it('rejects an oversized PDF without rewriting or rasterising it', async () => {
    const bytes = new Uint8Array(MAX_FUNCTION_UPLOAD_BYTES + 1)
    const file = new File([bytes], 'oversized.pdf', {
      type: 'application/pdf',
    })
    await expect(optimiseDocumentFile(file)).rejects.toThrow('This PDF is larger than 4 MB.')
  })
})
