import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { getAuthorizationSnapshot } from '@/lib/auth'
import { WorkspaceSignOutButton } from '@/components/site/WorkspaceSignOutButton'
import { getPartnerDocumentPermissionSettings, setPartnerSupportingDocumentPermission } from '@/lib/partner-actions'

export const Route = createFileRoute('/admin/partner-permissions')({
  beforeLoad: async () => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked || !session.isSuperAdmin) {
      throw redirect({ to: '/login' })
    }
  },
  loader: () => getPartnerDocumentPermissionSettings(),
  head: () => ({ meta: [{ title: 'Partner document permissions | Oxford Finance Hub' }, { name: 'robots', content: 'noindex' }] }),
  component: PartnerDocumentPermissions,
})

function PartnerDocumentPermissions() {
  const initial = Route.useLoaderData()
  const [partners, setPartners] = useState(initial)
  const [busyId, setBusyId] = useState<string | null>(null)

  const changePermission = async (registrationId: string, enabled: boolean) => {
    if (busyId) return
    setBusyId(registrationId)
    try {
      const result = await setPartnerSupportingDocumentPermission({ data: { registrationId, enabled } })
      setPartners((rows) => rows.map((row) => row.id === registrationId
        ? { ...row, canUploadSupportingDocuments: result.enabled }
        : row))
      toast.success(enabled ? 'Supporting-document uploads enabled for this partner.' : 'Supporting-document uploads disabled for this partner.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The permission could not be updated.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c7a45a]">Super Admin control</p>
            <h1 className="mt-2 font-serif text-4xl">Partner document permissions</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">Choose which approved merchant partners may upload supporting documents to applications referred to them. This permission does not grant access to applicant documents or unrelated applications.</p>
          </div>
          <WorkspaceSignOutButton />
        </header>
        <section className="rounded-lg border border-white/10 bg-[#121212] p-5">
          <p className="mb-4 text-xs text-white/45">New and existing partners are disabled by default. Quotation uploads remain a separate permission.</p>
          {partners.length === 0 ? <p className="text-sm text-white/60">There are no approved partner registrations yet.</p> : (
            <div className="divide-y divide-white/10">
              {partners.map((partner) => (
                <div key={partner.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="font-medium">{partner.businessName}</p>
                    <p className="mt-1 text-xs text-white/50">{partner.contactName} · {partner.email}</p>
                  </div>
                  <label className="flex items-center gap-3 text-sm">
                    <span className="text-white/65">Supporting uploads</span>
                    <input
                      type="checkbox"
                      checked={partner.canUploadSupportingDocuments}
                      disabled={busyId !== null}
                      onChange={(event) => void changePermission(partner.id, event.target.checked)}
                      className="size-5 accent-[#c7a45a]"
                      aria-label={`Allow supporting-document uploads for ${partner.businessName}`}
                    />
                    <span className="min-w-16 text-xs text-[#d8bd7c]">{partner.canUploadSupportingDocuments ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
