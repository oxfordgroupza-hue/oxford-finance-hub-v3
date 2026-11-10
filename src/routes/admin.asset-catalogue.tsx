import { useState } from 'react'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Layers3, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAuthorizationSnapshot } from '@/lib/auth'
import {
  getAssetCatalogueWorkspaceData,
  saveAssetIndustry,
  saveAssetCategory,
  saveAssetType,
} from '@/lib/catalog-actions'
import { WorkspaceSignOutButton } from '@/components/site/WorkspaceSignOutButton'

export const Route = createFileRoute('/admin/asset-catalogue')({
  beforeLoad: async () => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked || !session.isSuperAdmin) {
      throw redirect({ to: '/login' })
    }
  },
  loader: () => getAssetCatalogueWorkspaceData(),
  head: () => ({ meta: [{ title: 'Industry & asset catalogue | Oxford Finance Hub' }, { name: 'robots', content: 'noindex' }] }),
  component: AssetCataloguePage,
})

type IndustryRow = { id: string; name: string; description: string; isActive: boolean; sortOrder: number }
type CategoryRow = { id: string; industryId: string; financeCategory: 'vehicle' | 'equipment' | 'commercial-asset' | 'other'; name: string; description: string; isActive: boolean; sortOrder: number }
type AssetTypeRow = { id: string; categoryId: string; name: string; description: string; isActive: boolean; sortOrder: number }

const financeCategories = [
  { value: 'vehicle', label: 'Vehicle Finance' },
  { value: 'equipment', label: 'Equipment Finance' },
  { value: 'commercial-asset', label: 'Commercial Asset Finance' },
  { value: 'other', label: 'Other Finance' },
] as const

function AssetCataloguePage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [industry, setIndustry] = useState<IndustryRow | null>(null)
  const [category, setCategory] = useState<CategoryRow | null>(null)
  const [assetType, setAssetType] = useState<AssetTypeRow | null>(null)
  const [industryName, setIndustryName] = useState('')
  const [industryDescription, setIndustryDescription] = useState('')
  const [industryActive, setIndustryActive] = useState(true)
  const [industryOrder, setIndustryOrder] = useState('0')
  const [categoryIndustryId, setCategoryIndustryId] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [categoryFinance, setCategoryFinance] = useState<CategoryRow['financeCategory']>('equipment')
  const [categoryActive, setCategoryActive] = useState(true)
  const [categoryOrder, setCategoryOrder] = useState('0')
  const [assetCategoryId, setAssetCategoryId] = useState('')
  const [assetName, setAssetName] = useState('')
  const [assetDescription, setAssetDescription] = useState('')
  const [assetActive, setAssetActive] = useState(true)
  const [assetOrder, setAssetOrder] = useState('0')
  const [busy, setBusy] = useState(false)

  const refresh = async () => { await router.invalidate() }
  const editIndustry = (row: IndustryRow) => {
    setIndustry(row); setIndustryName(row.name); setIndustryDescription(row.description)
    setIndustryActive(row.isActive); setIndustryOrder(String(row.sortOrder))
  }
  const editCategory = (row: CategoryRow) => {
    setCategory(row); setCategoryIndustryId(row.industryId); setCategoryName(row.name)
    setCategoryDescription(row.description); setCategoryFinance(row.financeCategory)
    setCategoryActive(row.isActive); setCategoryOrder(String(row.sortOrder))
  }
  const editAsset = (row: AssetTypeRow) => {
    setAssetType(row); setAssetCategoryId(row.categoryId); setAssetName(row.name)
    setAssetDescription(row.description); setAssetActive(row.isActive); setAssetOrder(String(row.sortOrder))
  }

  const saveIndustry = async () => {
    setBusy(true)
    try {
      await saveAssetIndustry({ data: { id: industry?.id, name: industryName, description: industryDescription, isActive: industryActive, sortOrder: Number(industryOrder) } })
      toast.success(industry ? 'Industry updated.' : 'Industry created.')
      setIndustry(null); setIndustryName(''); setIndustryDescription(''); setIndustryActive(true); setIndustryOrder('0')
      await refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Industry could not be saved.') }
    finally { setBusy(false) }
  }
  const saveCategory = async () => {
    setBusy(true)
    try {
      await saveAssetCategory({ data: { id: category?.id, industryId: categoryIndustryId, financeCategory: categoryFinance, name: categoryName, description: categoryDescription, isActive: categoryActive, sortOrder: Number(categoryOrder) } })
      toast.success(category ? 'Category updated.' : 'Category created.')
      setCategory(null); setCategoryName(''); setCategoryDescription(''); setCategoryActive(true); setCategoryOrder('0')
      await refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Category could not be saved.') }
    finally { setBusy(false) }
  }
  const saveAsset = async () => {
    setBusy(true)
    try {
      await saveAssetType({ data: { id: assetType?.id, categoryId: assetCategoryId, name: assetName, description: assetDescription, isActive: assetActive, sortOrder: Number(assetOrder) } })
      toast.success(assetType ? 'Equipment / asset updated.' : 'Equipment / asset created.')
      setAssetType(null); setAssetName(''); setAssetDescription(''); setAssetActive(true); setAssetOrder('0')
      await refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Equipment / asset could not be saved.') }
    finally { setBusy(false) }
  }

  const fieldClass = 'space-y-2'
  const inputClass = 'border-white/15 bg-black/30 text-white'
  const panelClass = 'rounded-xl border border-white/10 bg-[#121212] p-5 sm:p-6'

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <header className="border-b border-white/10 bg-[#101010]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#c7a45a]">Oxford Business Group</p>
            <h1 className="mt-1 font-serif text-2xl">Industry & asset catalogue</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#d8bd7c]"><ArrowLeft className="size-4" /> Administration</Link>
            <WorkspaceSignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-8 px-5 py-10 sm:px-8">
        <section className="rounded-xl border border-[#c7a45a]/30 bg-[#17140f] p-5">
          <div className="flex items-center gap-3"><Layers3 className="size-5 text-[#d8bd7c]" /><h2 className="font-serif text-2xl">Cascading applicant selection</h2></div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">Maintain the selection hierarchy used in finance applications: industry, category within that industry, then the equipment, vehicle or asset type. Inactive entries remain available here for administration but are hidden from new applications. Historical applications retain their saved labels.</p>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className={panelClass}>
            <div className="mb-5 flex items-center justify-between"><h2 className="font-serif text-xl">1. Industries</h2><span className="text-xs text-white/45">{data.industries.length} records</span></div>
            <div className="space-y-3">
              <div className={fieldClass}><Label className="text-white/70">Industry name</Label><Input className={inputClass} value={industryName} onChange={(e) => setIndustryName(e.target.value)} placeholder="Enter industry" /></div>
              <div className={fieldClass}><Label className="text-white/70">Description</Label><Input className={inputClass} value={industryDescription} onChange={(e) => setIndustryDescription(e.target.value)} placeholder="Optional description" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className={fieldClass}><Label className="text-white/70">Sort order</Label><Input className={inputClass} type="number" min="0" value={industryOrder} onChange={(e) => setIndustryOrder(e.target.value)} /></div>
                <label className="flex items-end gap-2 pb-2 text-sm text-white/70"><input type="checkbox" checked={industryActive} onChange={(e) => setIndustryActive(e.target.checked)} /> Active</label>
              </div>
              <Button className="w-full" variant="gold" disabled={busy || industryName.trim().length < 2} onClick={saveIndustry}><Save className="mr-2 size-4" />{industry ? 'Update industry' : 'Add industry'}</Button>
              {industry && <Button className="w-full" variant="outlineGold" onClick={() => { setIndustry(null); setIndustryName(''); setIndustryDescription(''); setIndustryActive(true); setIndustryOrder('0') }}>Cancel edit</Button>}
            </div>
            <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
              {data.industries.map((row) => <button key={row.id} type="button" onClick={() => editIndustry(row)} className="flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 p-3 text-left hover:border-[#c7a45a]/50"><span className="min-w-0"><span className="block text-sm">{row.name}</span><span className="text-xs text-white/40">{row.description || 'No description'}</span></span><span className={row.isActive ? 'text-xs text-emerald-300' : 'text-xs text-white/35'}>{row.isActive ? 'Active' : 'Inactive'}</span></button>)}
              {data.industries.length === 0 && <p className="text-sm text-white/40">No industries added yet.</p>}
            </div>
          </div>

          <div className={panelClass}>
            <div className="mb-5 flex items-center justify-between"><h2 className="font-serif text-xl">2. Categories</h2><span className="text-xs text-white/45">{data.categories.length} records</span></div>
            <div className="space-y-3">
              <div className={fieldClass}><Label className="text-white/70">Industry</Label><Select value={categoryIndustryId} onValueChange={setCategoryIndustryId}><SelectTrigger className="border-white/15 bg-black/30 text-white"><SelectValue placeholder="Choose industry" /></SelectTrigger><SelectContent>{data.industries.filter((x) => x.isActive).map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></div>
              <div className={fieldClass}><Label className="text-white/70">Category name</Label><Input className={inputClass} value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Enter category" /></div>
              <div className={fieldClass}><Label className="text-white/70">Maps to finance category</Label><Select value={categoryFinance} onValueChange={(v) => setCategoryFinance(v as CategoryRow['financeCategory'])}><SelectTrigger className="border-white/15 bg-black/30 text-white"><SelectValue /></SelectTrigger><SelectContent>{financeCategories.map((x) => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent></Select></div>
              <div className={fieldClass}><Label className="text-white/70">Description</Label><Input className={inputClass} value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} placeholder="Optional description" /></div>
              <div className="grid grid-cols-2 gap-3"><div className={fieldClass}><Label className="text-white/70">Sort order</Label><Input className={inputClass} type="number" min="0" value={categoryOrder} onChange={(e) => setCategoryOrder(e.target.value)} /></div><label className="flex items-end gap-2 pb-2 text-sm text-white/70"><input type="checkbox" checked={categoryActive} onChange={(e) => setCategoryActive(e.target.checked)} /> Active</label></div>
              <Button className="w-full" variant="gold" disabled={busy || !categoryIndustryId || categoryName.trim().length < 2} onClick={saveCategory}><Save className="mr-2 size-4" />{category ? 'Update category' : 'Add category'}</Button>
              {category && <Button className="w-full" variant="outlineGold" onClick={() => { setCategory(null); setCategoryName(''); setCategoryDescription(''); setCategoryActive(true); setCategoryOrder('0') }}>Cancel edit</Button>}
            </div>
            <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
              {data.categories.map((row) => <button key={row.id} type="button" onClick={() => editCategory(row)} className="flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 p-3 text-left hover:border-[#c7a45a]/50"><span className="min-w-0"><span className="block text-sm">{row.name}</span><span className="text-xs text-white/40">{data.industries.find((x) => x.id === row.industryId)?.name ?? 'Unknown industry'} · {row.financeCategory}</span></span><span className={row.isActive ? 'text-xs text-emerald-300' : 'text-xs text-white/35'}>{row.isActive ? 'Active' : 'Inactive'}</span></button>)}
              {data.categories.length === 0 && <p className="text-sm text-white/40">No categories added yet.</p>}
            </div>
          </div>

          <div className={panelClass}>
            <div className="mb-5 flex items-center justify-between"><h2 className="font-serif text-xl">3. Equipment & assets</h2><span className="text-xs text-white/45">{data.types.length} records</span></div>
            <div className="space-y-3">
              <div className={fieldClass}><Label className="text-white/70">Category</Label><Select value={assetCategoryId} onValueChange={setAssetCategoryId}><SelectTrigger className="border-white/15 bg-black/30 text-white"><SelectValue placeholder="Choose category" /></SelectTrigger><SelectContent>{data.categories.filter((x) => x.isActive).map((x) => <SelectItem key={x.id} value={x.id}>{data.industries.find((i) => i.id === x.industryId)?.name} — {x.name}</SelectItem>)}</SelectContent></Select></div>
              <div className={fieldClass}><Label className="text-white/70">Equipment / asset name</Label><Input className={inputClass} value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Enter selectable asset" /></div>
              <div className={fieldClass}><Label className="text-white/70">Description</Label><Input className={inputClass} value={assetDescription} onChange={(e) => setAssetDescription(e.target.value)} placeholder="Optional description" /></div>
              <div className="grid grid-cols-2 gap-3"><div className={fieldClass}><Label className="text-white/70">Sort order</Label><Input className={inputClass} type="number" min="0" value={assetOrder} onChange={(e) => setAssetOrder(e.target.value)} /></div><label className="flex items-end gap-2 pb-2 text-sm text-white/70"><input type="checkbox" checked={assetActive} onChange={(e) => setAssetActive(e.target.checked)} /> Active</label></div>
              <Button className="w-full" variant="gold" disabled={busy || !assetCategoryId || assetName.trim().length < 2} onClick={saveAsset}><Save className="mr-2 size-4" />{assetType ? 'Update asset' : 'Add asset'}</Button>
              {assetType && <Button className="w-full" variant="outlineGold" onClick={() => { setAssetType(null); setAssetName(''); setAssetDescription(''); setAssetActive(true); setAssetOrder('0') }}>Cancel edit</Button>}
            </div>
            <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
              {data.types.map((row) => <button key={row.id} type="button" onClick={() => editAsset(row)} className="flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 p-3 text-left hover:border-[#c7a45a]/50"><span className="min-w-0"><span className="block text-sm">{row.name}</span><span className="text-xs text-white/40">{data.categories.find((x) => x.id === row.categoryId)?.name ?? 'Unknown category'}</span></span><span className={row.isActive ? 'text-xs text-emerald-300' : 'text-xs text-white/35'}>{row.isActive ? 'Active' : 'Inactive'}</span></button>)}
              {data.types.length === 0 && <p className="text-sm text-white/40">No equipment or assets added yet.</p>}
            </div>
          </div>
        </section>
        <footer className="text-xs text-white/35">Changes are recorded in the audit log. Deactivate entries instead of deleting them so existing applications keep their historical selections.</footer>
      </main>
    </div>
  )
}
