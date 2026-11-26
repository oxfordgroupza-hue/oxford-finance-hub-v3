import { useState } from 'react'
import { FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDocumentChecklist } from '@/lib/finance-config'
import { optimiseDocumentFile } from '@/lib/document-optimisation'

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
  const [busyLabel, setBusyLabel] = useState('')

  const upload = async () => {
    if (!file || busy) return
    setBusy(true)
    setBusyLabel('Optimising…')
    setMessage('')
    try {
      const prepared = await optimiseDocumentForUpload(file)
      setBusyLabel('Uploading…')
      const form = new FormData()
      form.set('applicationId', applicationId)
      form.set('documentKey', documentType)
      form.set('file', prepared.file)
      const response = await fetch('/api/oxford-api?action=upload-document', {
        method: 'POST',
        body: form,
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'The document could not be uploaded.')
      setFile(null)
      setMessage(prepared.reduced
        ? `Document optimised from ${(prepared.originalBytes / (1024 * 1024)).toFixed(2)} MB to ${(prepared.finalBytes / (1024 * 1024)).toFixed(2)} MB and uploaded successfully.`
        : 'Document uploaded successfully; original file quality was preserved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The document could not be uploaded.')
    } finally {
      setBusy(false)
      setBusyLabel('')
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
        <label className="space-y-1 text-xs text-white/60"><span className="block">PDF max 4 MB · large JPG/PNG images are optimised automatically</span>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-xs text-white/60" />
        </label>
        <Button type="button" size="sm" variant="gold" onClick={() => void upload()} disabled={!file || busy}><FileUp className="mr-2 size-4" />{busy ? busyLabel || 'Working…' : 'Upload'}</Button>
      </div>
      {message && <p role="status" className="mt-2 text-xs text-[#d8bd7c]">{message}</p>}
    </div>
  )
}
