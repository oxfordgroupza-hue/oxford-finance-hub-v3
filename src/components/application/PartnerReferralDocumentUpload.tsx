import { useState } from 'react'
import { getUser } from '@netlify/identity'
import { FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDocumentChecklist } from '@/lib/finance-config'

async function identityToken() {
  const user = await getUser()
  if (!user) throw new Error('Please sign in again to upload documents.')
  const tokenUser = user as unknown as { token?: string | { access_token?: string }; jwt?: () => Promise<string> }
  const token = typeof tokenUser.jwt === 'function'
    ? await tokenUser.jwt()
    : typeof tokenUser.token === 'string' ? tokenUser.token : tokenUser.token?.access_token
  if (!token) throw new Error('Your secure sign-in token is unavailable. Please sign in again.')
  return token
}

export function PartnerReferralDocumentUpload({ applicationId, applicantType, category, canUploadSupportingDocuments }: {
  applicationId: string
  applicantType: 'individual' | 'business'
  category: 'vehicle' | 'equipment' | 'commercial-asset' | 'other'
  canUploadSupportingDocuments: boolean
}) {
  const checklist = getDocumentChecklist(applicantType, category)
  const partnerChecklist = [
    { id: 'quote', label: checklist.find((item) => item.id === 'quote')?.label ?? 'Supplier quotation / pro-forma invoice' },
    ...(canUploadSupportingDocuments ? [
      { id: 'contracts', label: 'Supplier contracts or work orders' },
      { id: 'motivation', label: 'Supplier supporting motivation' },
    ] : []),
  ]
  const [documentType, setDocumentType] = useState('quote')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const upload = async () => {
    if (!file || busy) return
    if (file.size > 4 * 1024 * 1024) {
      setMessage('Files must be no larger than 4 MB.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const token = await identityToken()
      const form = new FormData()
      form.set('applicationId', applicationId)
      form.set('documentKey', documentType)
      form.set('file', file)
      const response = await fetch('/.netlify/functions/oxford-api?action=upload-document', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: form,
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'The document could not be uploaded.')
      setFile(null)
      setMessage('Document uploaded successfully.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The document could not be uploaded.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 rounded-sm border border-white/10 bg-black/20 p-3">
      <p className="text-xs font-medium text-white/75">Upload supporting document</p>
      <p className="mt-1 text-xs text-white/45">You may always upload the supplier quotation. If Super Admin enables supporting uploads, you may also add supplier contracts or a written motivation. Applicant identity, address and bank documents remain private.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.3fr_auto] sm:items-end">
        <label className="space-y-1 text-xs text-white/60"><span className="block">Document type</span>
          <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="w-full rounded-sm border border-white/15 bg-[#171717] px-3 py-2 text-white">
            {partnerChecklist.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs text-white/60"><span className="block">PDF, JPG or PNG · max 4 MB</span>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-xs text-white/60" />
        </label>
        <Button type="button" size="sm" variant="gold" onClick={() => void upload()} disabled={!file || busy}><FileUp className="mr-2 size-4" />{busy ? 'Uploading…' : 'Upload'}</Button>
      </div>
      {message && <p role="status" className="mt-2 text-xs text-[#d8bd7c]">{message}</p>}
    </div>
  )
}
