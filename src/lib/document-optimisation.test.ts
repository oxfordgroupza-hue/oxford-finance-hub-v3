// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { MAX_DOCUMENT_UPLOAD_BYTES, optimiseDocumentForUpload } from './document-optimisation'

function file(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe('optimiseDocumentForUpload', () => {
  it('keeps small documents unchanged', async () => {
    const input = file('id.pdf', 'application/pdf', 1024)
    const result = await optimiseDocumentForUpload(input)
    expect(result.file).toBe(input)
    expect(result.optimised).toBe(false)
    expect(result.finalSize).toBe(1024)
  })

  it('never rewrites PDFs and gives an actionable message for oversized PDFs', async () => {
    const input = file('bank-statement.pdf', 'application/pdf', MAX_DOCUMENT_UPLOAD_BYTES + 1)
    await expect(optimiseDocumentForUpload(input)).rejects.toThrow(/PDFs are kept intact/)
  })

  it('rejects unsupported file types', async () => {
    await expect(optimiseDocumentForUpload(file('archive.zip', 'application/zip', 1024)))
      .rejects.toThrow(/Only PDF, JPEG and PNG/)
  })

  it('does not silently accept oversized images when browser image APIs are unavailable', async () => {
    const input = file('scan.jpg', 'image/jpeg', MAX_DOCUMENT_UPLOAD_BYTES + 1)
    await expect(optimiseDocumentForUpload(input)).rejects.toThrow(/Automatic image optimisation is unavailable/)
  })
})
