import { useState, type FormEvent } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { getAuthorizationSnapshot } from '@/lib/auth'
import { financeCategories } from '@/lib/finance-config'
import type { FinanceCategoryId } from '@/lib/domain'
import { getCatalogWorkspaceData, saveFinanceProduct, saveSiteContent } from '@/lib/catalog-actions'
import { WorkspaceSignOutButton } from '@/components/site/WorkspaceSignOutButton'

export const Route = createFileRoute('/office/catalogue')({
  beforeLoad: async () => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked) throw redirect({ to: '/login' })
    if (session.user.accountType !== 'office' ||
        (!session.isSuperAdmin && !session.permissions.includes('products.view') && !session.permissions.includes('content.view'))) {
      throw redirect({ to: '/office' })
    }
  },
  loader: () => getCatalogWorkspaceData(),
  head: () => ({ meta: [{ title: 'Catalogue & content | Oxford Finance Hub' }, { name: 'robots', content: 'noindex' }] }),
  component: CataloguePage,
})

function CataloguePage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const can = (permission: string) => data.isSuperAdmin || data.permissions.some((granted) => granted === permission)
  const canProducts = can('products.view')
  const canContent = can('content.view')
  const [section, setSection] = useState<'products' | 'content'>(canProducts ? 'products' : 'content')
  const [category, setCategory] = useState<FinanceCategoryId>(data.products[0]?.category ?? 'vehicle')
  const [productForm, setProductForm] = useState(() => {
    const product = data.products.find((item) => item.category === (data.products[0]?.category ?? 'vehicle'))
    return product
      ? { name: product.name, description: product.description, isActive: product.isActive, sortOrder: product.sortOrder }
      : { name: financeCategories.find((item) => item.id === (data.products[0]?.category ?? 'vehicle'))?.name ?? '', description: '', isActive: true, sortOrder: 0 }
  })
  const [contentId, setContentId] = useState<string | null>(null)
  const [contentForm, setContentForm] = useState({ key: '', title: '', body: '', status: 'draft' as 'draft' | 'published' })
  const [busy, setBusy] = useState(false)

  const selectedProduct = data.products.find((item) => item.category === category)
  const selectedContent = data.content.find((item) => item.id === contentId)
  const canEditSelectedContent = can('content.edit') && (!selectedContent || selectedContent.status !== 'published' || can('content.approve'))


  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await saveFinanceProduct({ data: { category, ...productForm, sortOrder: Number(productForm.sortOrder) } })
      toast.success('Finance product settings saved.')
      await router.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Finance product settings could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  const saveContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const result = await saveSiteContent({ data: { ...(contentId ? { id: contentId } : {}), ...contentForm } })
      setContentId(result.id)
      toast.success(contentForm.status === 'published' ? 'Site content published.' : 'Draft content saved.')
      await router.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Site content could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div><p className="eyebrow">Oxford Business Group</p><h1 className="mt-1 font-display text-3xl">Finance products & site content</h1><p className="mt-1 text-xs text-muted-foreground">Manage broad finance product descriptions and approved public website copy. Equipment and asset dropdown options are managed separately by Super Admin.</p></div>
          <div className="flex flex-wrap items-center gap-3">
            {data.isSuperAdmin && <Button asChild variant="outlineGold" className="rounded-sm"><a href="/admin/asset-catalogue">Industry & asset catalogue</a></Button>}
            <Button asChild variant="outlineGold" className="rounded-sm"><a href="/office">Back to office</a></Button>
            <WorkspaceSignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8">
        <div className="flex flex-wrap gap-2">
          {canProducts && <Button variant={section === 'products' ? 'gold' : 'outlineGold'} onClick={() => setSection('products')}>Finance products</Button>}
          {canContent && <Button variant={section === 'content' ? 'gold' : 'outlineGold'} onClick={() => setSection('content')}>Site content</Button>}
        </div>

        {section === 'products' && canProducts && (
          <section className="grid gap-5 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.4fr)]">
            <div className="rounded-sm border border-border bg-card p-5">
              <h2 className="text-xl">Finance categories</h2>
              <div className="mt-4 divide-y divide-border">
                {financeCategories.map((item) => {
                  const product = data.products.find((entry) => entry.category === item.id)
                  return <button key={item.id} type="button" onClick={() => {
                    setCategory(item.id)
                    const nextProduct = data.products.find((entry) => entry.category === item.id)
                    setProductForm(nextProduct
                      ? { name: nextProduct.name, description: nextProduct.description, isActive: nextProduct.isActive, sortOrder: nextProduct.sortOrder }
                      : { name: item.name, description: '', isActive: true, sortOrder: 0 })
                  }} className={`w-full rounded-sm py-3 text-left ${category === item.id ? 'bg-gold/10 px-3 text-gold' : 'text-foreground'}`}>
                    <span className="block font-medium">{product?.name ?? item.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{product ? (product.isActive ? 'Active' : 'Hidden from public pages') : 'Using built-in defaults'}</span>
                  </button>
                })}
              </div>
            </div>
            <form onSubmit={saveProduct} className="space-y-5 rounded-sm border border-border bg-card p-6">
              <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Category key</p><h2 className="mt-1 text-2xl">{category}</h2></div>
              <div className="space-y-2"><Label htmlFor="product-name">Public product name</Label><Input id="product-name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required maxLength={100} disabled={!can('products.edit') && !can('products.create')} /></div>
              <div className="space-y-2"><Label htmlFor="product-description">Description</Label><Textarea id="product-description" rows={5} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} maxLength={1200} disabled={!can('products.edit') && !can('products.create')} /></div>
              <div className="space-y-2"><Label htmlFor="product-order">Display order</Label><Input id="product-order" type="number" min={0} max={1000} value={productForm.sortOrder} onChange={(e) => setProductForm({ ...productForm, sortOrder: Number(e.target.value) })} disabled={!can('products.edit') && !can('products.create')} /></div>
              <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                <div><Label htmlFor="product-active">Show on public finance pages</Label><p className="mt-1 text-xs text-muted-foreground">Deactivating a category prevents new applications for it.</p></div>
                <Switch id="product-active" checked={productForm.isActive} onCheckedChange={(v) => setProductForm({ ...productForm, isActive: v })} disabled={!can('products.manage')} />
              </div>
              <Button type="submit" variant="gold" className="rounded-sm" disabled={busy || (selectedProduct ? !can('products.edit') : !can('products.create'))}>{busy ? 'Saving…' : 'Save finance product'}</Button>
            </form>
          </section>
        )}

        {section === 'content' && canContent && (
          <section className="grid gap-5 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.4fr)]">
            <div className="rounded-sm border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="text-xl">Content records</h2><Button type="button" size="sm" variant="outlineGold" onClick={() => {
                  setContentId(null)
                  setContentForm({ key: '', title: '', body: '', status: 'draft' })
                }} disabled={!can('content.create')}>New</Button></div>
              <div className="mt-4 divide-y divide-border">
                {data.content.map((item) => <button key={item.id} type="button" onClick={() => {
                  setContentId(item.id)
                  setContentForm({ key: item.key, title: item.title, body: item.body, status: item.status === 'published' ? 'published' : 'draft' })
                }} className={`w-full rounded-sm py-3 text-left ${contentId === item.id ? 'bg-gold/10 px-3' : ''}`}>
                  <span className="block text-sm font-medium">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.key} · {item.status}</span>
                </button>)}
                {data.content.length === 0 && <p className="py-4 text-sm text-muted-foreground">No site content records are available.</p>}
              </div>
            </div>
            <form onSubmit={saveContent} className="space-y-5 rounded-sm border border-border bg-card p-6">
              <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Public copy</p><h2 className="mt-1 text-2xl">{contentId ? 'Edit content' : 'Create content'}</h2></div>
              <div className="space-y-2"><Label htmlFor="content-key">Content key</Label><Input id="content-key" value={contentForm.key} onChange={(e) => setContentForm({ ...contentForm, key: e.target.value })} placeholder="home.hero.intro" required maxLength={120} disabled={Boolean(contentId) || (!can('content.create') && !can('content.edit'))} /><p className="text-xs text-muted-foreground">Only keys supported by the public website can be published. Existing keys cannot be renamed.</p></div>
              <div className="space-y-2"><Label htmlFor="content-title">Internal title</Label><Input id="content-title" value={contentForm.title} onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })} required maxLength={160} disabled={!canEditSelectedContent && Boolean(contentId) || (!contentId && !can('content.create'))} /></div>
              <div className="space-y-2"><Label htmlFor="content-body">Text</Label><Textarea id="content-body" rows={8} value={contentForm.body} onChange={(e) => setContentForm({ ...contentForm, body: e.target.value })} required maxLength={12000} disabled={!canEditSelectedContent && Boolean(contentId) || (!contentId && !can('content.create'))} /></div>
              <div className="space-y-2"><Label htmlFor="content-status">Publication status</Label><Select value={contentForm.status} onValueChange={(v) => setContentForm({ ...contentForm, status: v as 'draft' | 'published' })} disabled={!canEditSelectedContent && Boolean(contentId)}><SelectTrigger id="content-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published" disabled={!can('content.approve')}>Published</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Only users with content approval permission can publish public changes.</p></div>
              <Button type="submit" variant="gold" className="rounded-sm" disabled={busy || (contentId ? !canEditSelectedContent : !can('content.create'))}>{busy ? 'Saving…' : contentForm.status === 'published' ? 'Publish content' : 'Save draft'}</Button>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}
