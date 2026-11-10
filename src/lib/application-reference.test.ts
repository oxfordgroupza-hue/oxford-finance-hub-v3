import { describe, expect, it } from 'vitest'
import { createApplicationReference } from './application-reference'

describe('application reference generator', () => {
  it('uses the OBG-APP prefix, UTC year and an uppercase hexadecimal suffix', () => {
    const reference = createApplicationReference(new Date('2026-11-07T23:59:59.000Z'))
    expect(reference).toMatch(/^OBG-APP-2026-[A-F0-9]{8}$/)
  })

  it('generates distinct references for repeated calls', () => {
    const references = new Set(Array.from({ length: 20 }, () => createApplicationReference()))
    expect(references.size).toBe(20)
  })
})
