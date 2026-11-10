import { useEffect, useState } from 'react'
import { getUser } from '@netlify/identity'
import { Download, FileUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDocumentChecklist } from '@/lib/finance-config'

type DocumentRow = {
  id: string
  documentType: string
  filename: string
  contentType: string
  size: number
  status: string
  uploadedAt: string | null
}

async function fetchDocuments(applicationId: string): Promise<DocumentRow[]> {
  const token = await identityToken()
  const response = await fetch(`/.netlify/functions/oxford-api?action=list-documents&applicationId=${encodeURIComponent(applicationId)}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const result = await response.json() as { documents?: DocumentRow[]; error?: string }
  if (!response.ok) throw new Error(result.error || 'Could not load application documents.')
  return result.documents ?? []
}

async function identityToken() {
  const user = await getUser()
  if (!user) throw new Error('Please sign in again to manage documents.')
  const tokenUser = user as unknown as {
    token?: string | { access_token?: string }
    jwt?: () => Promise<string>
  }
  const token = typeof tokenUser.jwt === 'function'
    ? await tokenUser.jwt()
    : typeof tokenUser.token === 'string'
      ? tokenUser.token
      : tokenUser.token?.access_token
  if (!token) throw new Error('Your secure sign-in token is unavailable. Please sign in again.')
  return token
}

export function DocumentUploadPanel({ applicationId, applicantType, category }: {
  applicationId: string
  applicantType: 'individual' | 'business'
  category: 'vehicle' | 'equipment' | 'commercial-asset' | 'other'
}) {
  const checklist = getDocumentChecklist(applicantType, category)
  const [uploadEnabled, setUploadEnabled] = useState(false)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [documentType, setDocumentType] = useState(checklist[0]?.id ?? 'id')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const [healthResponse, rows] = await Promise.all([
          fetch('/.netlify/functions/oxford-api?action=health', { cache: 'no-store' }),
          fetchDocuments(applicationId),
        ])
        const health = await healthResponse.json() as { documentUploadsEnabled?: boolean }
        if (active) {
          setUploadEnabled(health.documentUploadsEnabled === true)
          setDocuments(rows)
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Document status could not be loaded.')
      }
    })()
    return () => { active = false }
  }, [applicationId])

  const upload = async () => {
    if (!uploadEnabled || !file || busy) return
    if (file.size > 4 * 1024 * 1024) {
      setError('Files must be no larger than 4 MB. Larger documents can be split into separate files.')
      return
    }
    setBusy(true)
    setError('')
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
      setDocuments(await fetchDocuments(applicationId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The document could not be uploaded.')
    } finally {
      setBusy(false)
    }
  }

  const download = async (documentId: string) => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const token = await identityToken()
      const response = await fetch('/.netlify/functions/oxford-api?action=download-document', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })
      const result = await response.json() as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error || 'The document could not be downloaded.')
      window.location.assign(result.url)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The document could not be downloaded.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 rounded-sm border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Supporting documents</p>
          <p className="mt-1 text-sm text-muted-foreground">Private files are accessible only to you and authorised application staff.</p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => void fetchDocuments(applicationId).then(setDocuments).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not refresh documents.'))} disabled={busy}><RefreshCw className="mr-2 size-4" />Refresh</Button>
      </div>
      {documents.length > 0 ? (
        <ul className="mt-4 divide-y divide-border">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="text-sm font-medium">{document.filename}</p><p className="mt-1 text-xs text-muted-foreground">{document.documentType} · {Math.ceil(document.size / 1024)} KB · {document.status}</p></div>
              <Button type="button" size="sm" variant="outlineGold" className="rounded-sm" onClick={() => void download(document.id)} disabled={busy}><Download className="mr-2 size-4" />Download</Button>
            </li>
          ))}
        </ul>
      ) : <p className="mt-4 text-sm text-muted-foreground">No supporting documents have been uploaded for this application.</p>}

      {uploadEnabled ? (
        <div className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-[1fr_1.3fr_auto] sm:items-end">
          <label className="space-y-2 text-sm"><span className="block text-muted-foreground">Document type</span>
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="w-full rounded-sm border border-border bg-card px-3 py-2.5">
              {checklist.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm"><span className="block text-muted-foreground">Choose file (PDF, JPG or PNG; max 4 MB)</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-sm file:border file:border-border file:bg-card file:px-3 file:py-2" />
          </label>
          <Button type="button" variant="gold" className="rounded-sm" onClick={() => void upload()} disabled={!file || busy}><FileUp className="mr-2 size-4" />{busy ? 'Working…' : 'Upload'}</Button>
        </div>
      ) : (
        <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">Secure uploads are currently disabled while the preview security and isolation tests are completed. Please do not email identity documents or bank statements.</p>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
    </div>
  )
}
