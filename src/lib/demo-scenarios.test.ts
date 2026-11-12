import { describe, expect, it } from 'vitest'
import { demoApplications, demoTimeline, getDemoVisibleApplications, getDemoVisibleEvents } from './demo-scenarios'

describe('role-play demo visibility boundaries', () => {
  it('limits a partner to applications linked to that partner', () => {
    const visible = getDemoVisibleApplications('Partner', 'demo-partner')
    expect(visible.map((item) => item.reference)).toEqual(['OBG-DEMO-2026-001'])
    expect(visible.length).toBeLessThan(demoApplications.length)
  })

  it('limits customer support to support tickets and no application records', () => {
    expect(getDemoVisibleApplications('Customer support', 'demo-support')).toEqual([])
    expect(getDemoVisibleEvents('Customer support', 'demo-support', demoTimeline).map((event) => event.record)).toEqual(['SUP-DEMO-004'])
  })

  it('shows partners only their supplier-upload event, not applicant or internal assessment history', () => {
    expect(getDemoVisibleEvents('Partner', 'demo-partner', demoTimeline).map((event) => event.id)).toEqual(['demo-event-03'])
  })

  it('hides internal assessment and reviewer assignment events from customers', () => {
    const visibleIds = getDemoVisibleEvents('Customer', 'demo-customer', demoTimeline).map((event) => event.id)
    expect(visibleIds).toEqual(['demo-event-01', 'demo-event-02', 'demo-event-05'])
  })

  it('limits Office staff to applications they created', () => {
    expect(getDemoVisibleApplications('Office staff', 'demo-office').map((item) => item.reference)).toEqual([
      'OBG-DEMO-2026-001',
      'OBG-DEMO-2026-002',
    ])
  })

  it('limits reviewers to applications assigned to them', () => {
    expect(getDemoVisibleApplications('Application reviewer', 'demo-reviewer')).toHaveLength(3)
  })

  it('limits customers to their own applications', () => {
    expect(getDemoVisibleApplications('Customer', 'demo-customer')).toHaveLength(3)
  })

  it('preserves full oversight for Administrator and Super Administrator demo roles', () => {
    expect(getDemoVisibleApplications('Administrator', 'demo-admin')).toEqual(demoApplications)
    expect(getDemoVisibleApplications('Super Administrator', 'demo-super-admin')).toEqual(demoApplications)
  })
})
