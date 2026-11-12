import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { mergeSupportingDocumentsIntoPdf } from './application-pack-pdf'

describe('complete application PDF pack assembly', () => {
  it('appends every page from supporting PDF files to the application summary', async () => {
    const summary = await PDFDocument.create()
    summary.addPage()
    const supporting = await PDFDocument.create()
    supporting.addPage()
    supporting.addPage()
    const merged = await mergeSupportingDocumentsIntoPdf(await summary.save(), [{
      name: 'bank-statements.pdf', mimeType: 'application/pdf', bytes: await supporting.save(),
    }])
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(4)
  })

  it('converts a JPEG supporting image into a PDF page', async () => {
    const summary = await PDFDocument.create()
    summary.addPage()
    const png = new Uint8Array(Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVVVVWVpZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3/9oADAMBAAIRAxEAPwD9U6KKKAP/2Q==', 'base64'))
    const merged = await mergeSupportingDocumentsIntoPdf(await summary.save(), [{
      name: 'identity.jpg', mimeType: 'image/jpeg', bytes: png,
    }])
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(3)
  })

  it('converts a PNG supporting image into a PDF page', async () => {
    const summary = await PDFDocument.create()
    summary.addPage()
    const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC', 'base64'))
    const merged = await mergeSupportingDocumentsIntoPdf(await summary.save(), [{
      name: 'proof-of-address.png', mimeType: 'image/png', category: 'proof-of-address', bytes: png,
    }])
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(3)
  })
  it('fails the pack rather than silently omitting a corrupt supporting PDF', async () => {
    const summary = await PDFDocument.create()
    summary.addPage()
    await expect(mergeSupportingDocumentsIntoPdf(await summary.save(), [{
      name: 'corrupt.pdf', mimeType: 'application/pdf', bytes: new Uint8Array([1, 2, 3]),
    }])).rejects.toThrow('corrupt.pdf')
  })
})
