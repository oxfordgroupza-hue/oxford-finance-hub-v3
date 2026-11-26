// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_DOCUMENT_UPLOAD_BYTES, optimiseDocumentForUpload } from './document-optimisation'

function file(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type })
}

afterEach(() => vi.unstubAllGlobals())

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

  it('optimises a large JPEG before upload and releases the decoded bitmap', async () => {
    const input = file('scan.jpg', 'image/jpeg', 2 * 1024 * 1024)
    const bitmap = { width: 4000, height: 3000, close: vi.fn() } as unknown as ImageBitmap
    const drawImage = vi.fn()
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (callback: BlobCallback) => callback(new Blob(['compressed image'], { type: 'image/jpeg' })),
    } as unknown as HTMLCanvasElement
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) })

    const result = await optimiseDocumentForUpload(input)

    expect(result.optimised).toBe(true)
    expect(result.file.type).toBe('image/jpeg')
    expect(result.file.size).toBeLessThan(input.size)
    expect(canvas.width).toBe(2400)
    expect(canvas.height).toBe(1800)
    expect(drawImage).toHaveBeenCalledOnce()
    expect(bitmap.close).toHaveBeenCalledOnce()
  })

  it('does not silently accept oversized images when browser image APIs are unavailable', async () => {
    const input = file('scan.jpg', 'image/jpeg', MAX_DOCUMENT_UPLOAD_BYTES + 1)
    await expect(optimiseDocumentForUpload(input)).rejects.toThrow(/Automatic image optimisation is unavailable/)
  })
})
