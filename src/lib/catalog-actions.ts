import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import { assetCategories, assetIndustries, assetTypes, auditEvents, financeProducts, siteContent } from '../../db/schema'
import { getAuthorizationSnapshot } from './auth'
import type { PermissionKey } from './access-control'

async function requireOffice(permission?: PermissionKey) {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked || session.user.accountType !== 'office') {
    throw new Error('An active Oxford office account is required.')
  }
  if (permission && !session.isSuperAdmin && !session.permissions.includes(permission)) {
    throw new Error(`Your account does not have the ${permission} permission.`)
  }
  return session
}

async function requireSuperAdmin() {
  const session = await getAuthorizationSnapshot()
  if (!session.authenticated || !session.provisioned || session.blocked ||
      session.user.accountType !== 'office' || !session.isSuperAdmin) {
    throw new Error('Only an active Oxford Super Admin may manage the industry and asset catalogue.')
  }
  return session
}

/** Public application dropdown data. Only active rows are exposed. */
export const getPublicAssetCatalogue = createServerFn({ method: 'GET' }).handler(async () => {
  const [industries, categories, types] = await Promise.all([
    db.select({
      id: assetIndustries.id,
      name: assetIndustries.name,
      description: assetIndustries.description,
      sortOrder: assetIndustries.sortOrder,
    }).from(assetIndustries).where(eq(assetIndustries.isActive, true)).orderBy(asc(assetIndustries.sortOrder), asc(assetIndustries.name)),
    db.select({
      id: assetCategories.id,
      industryId: assetCategories.industryId,
      financeCategory: assetCategories.financeCategory,
      name: assetCategories.name,
      description: assetCategories.description,
      sortOrder: assetCategories.sortOrder,
    }).from(assetCategories).where(eq(assetCategories.isActive, true)).orderBy(asc(assetCategories.sortOrder), asc(assetCategories.name)),
    db.select({
      id: assetTypes.id,
      categoryId: assetTypes.categoryId,
      name: assetTypes.name,
      description: assetTypes.description,
      sortOrder: assetTypes.sortOrder,
    }).from(assetTypes).where(eq(assetTypes.isActive, true)).orderBy(asc(assetTypes.sortOrder), asc(assetTypes.name)),
  ])
  return { industries, categories, types }
})

/** Super Admin catalogue workspace includes inactive rows for maintenance. */
export const getAssetCatalogueWorkspaceData = createServerFn({ method: 'GET' }).handler(async () => {
  await requireSuperAdmin()
  const [industries, categories, types] = await Promise.all([
    db.select().from(assetIndustries).orderBy(asc(assetIndustries.sortOrder), asc(assetIndustries.name)),
    db.select().from(assetCategories).orderBy(asc(assetCategories.sortOrder), asc(assetCategories.name)),
    db.select().from(assetTypes).orderBy(asc(assetTypes.sortOrder), asc(assetTypes.name)),
  ])
  return { industries, categories, types }
})

const industryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).default(''),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(10000),
})

export const saveAssetIndustry = createServerFn({ method: 'POST' })
  .validator((input: unknown) => industryInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireSuperAdmin()
    const [existing] = data.id
      ? await db.select().from(assetIndustries).where(eq(assetIndustries.id, data.id)).limit(1)
      : []
    if (data.id && !existing) throw new Error('The selected industry no longer exists.')
    const now = new Date()
    const [saved] = existing
      ? await db.update(assetIndustries).set({ name: data.name, description: data.description, isActive: data.isActive, sortOrder: data.sortOrder, updatedAt: now }).where(eq(assetIndustries.id, existing.id)).returning({ id: assetIndustries.id })
      : await db.insert(assetIndustries).values({ name: data.name, description: data.description, isActive: data.isActive, sortOrder: data.sortOrder }).returning({ id: assetIndustries.id })
    await db.insert(auditEvents).values({
      actorUserId: session.user.id,
      event: existing ? 'catalogue.asset_industry_updated' : 'catalogue.asset_industry_created',
      resource: 'asset_industry',
      resourceId: saved.id,
      details: { name: data.name, isActive: data.isActive },
    })
    return { success: true, id: saved.id }
  })

const assetCategoryInput = z.object({
  id: z.string().uuid().optional(),
  industryId: z.string().uuid(),
  financeCategory: z.enum(['vehicle', 'equipment', 'commercial-asset', 'other']),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).default(''),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(10000),
})

export const saveAssetCategory = createServerFn({ method: 'POST' })
  .validator((input: unknown) => assetCategoryInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireSuperAdmin()
    const [industry] = await db.select({ id: assetIndustries.id }).from(assetIndustries)
      .where(and(eq(assetIndustries.id, data.industryId), eq(assetIndustries.isActive, true))).limit(1)
    if (!industry) throw new Error('Choose an active industry before saving this category.')
    const [existing] = data.id
      ? await db.select().from(assetCategories).where(eq(assetCategories.id, data.id)).limit(1)
      : []
    if (data.id && !existing) throw new Error('The selected asset category no longer exists.')
    const now = new Date()
    const [saved] = existing
      ? await db.update(assetCategories).set({ industryId: data.industryId, financeCategory: data.financeCategory, name: data.name, description: data.description, isActive: data.isActive, sortOrder: data.sortOrder, updatedAt: now }).where(eq(assetCategories.id, existing.id)).returning({ id: assetCategories.id })
      : await db.insert(assetCategories).values({ industryId: data.industryId, financeCategory: data.financeCategory, name: data.name, description: data.description, isActive: data.isActive, sortOrder: data.sortOrder }).returning({ id: assetCategories.id })
    await db.insert(auditEvents).values({
      actorUserId: session.user.id,
      event: existing ? 'catalogue.asset_category_updated' : 'catalogue.asset_category_created',
      resource: 'asset_category',
      resourceId: saved.id,
      details: { industryId: data.industryId, name: data.name, isActive: data.isActive },
    })
    return { success: true, id: saved.id }
  })

const assetTypeInput = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).default(''),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(10000),
})

export const saveAssetType = createServerFn({ method: 'POST' })
  .validator((input: unknown) => assetTypeInput.parse(input))
  .handler(async ({ data }) => {
    const session = await requireSuperAdmin()
    const [category] = await db.select({ id: assetCategories.id }).from(assetCategories)
      .where(and(eq(assetCategories.id, data.categoryId), eq(assetCategories.isActive, true))).limit(1)
    if (!category) throw new Error('Choose an active asset category before saving this asset type.')
    const [existing] = data.id
      ? await db.select().from(assetTypes).where(eq(assetTypes.id, data.id)).limit(1)
      : []
    if (data.id && !existing) throw new Error('The selected asset type no longer exists.')
    const now = new Date()
    const [saved] = existing
      ? await db.update(assetTypes).set({ categoryId: data.categoryId, name: data.name, description: data.description, isActive: data.isActive, sortOrder: data.sortOrder, updatedAt: now }).where(eq(assetTypes.id, existing.id)).returning({ id: assetTypes.id })
      : await db.insert(assetTypes).values({ categoryId: data.categoryId, name: data.name, description: data.description, isActive: data.isActive, sortOrder: data.sortOrder }).returning({ id: assetTypes.id })
    await db.insert(auditEvents).values({
      actorUserId: session.user.id,
      event: existing ? 'catalogue.asset_type_updated' : 'catalogue.asset_type_created',
      resource: 'asset_type',
      resourceId: saved.id,
      details: { categoryId: data.categoryId, name: data.name, isActive: data.isActive },
    })
    return { success: true, id: saved.id }
  })


const publicContentKeys = [
  'home.hero.eyebrow',
  'home.hero.intro',
  'home.hero.primary_cta',
  'home.hero.secondary_cta',
  'solutions.hero.title',
  'solutions.hero.intro',
] as const

export const getPublicSiteConfig = createServerFn({ method: 'GET' }).handler(async () => {
  const [products, content] = await Promise.all([
    db.select({
      category: financeProducts.category,
      name: financeProducts.name,
      description: financeProducts.description,
      isActive: financeProducts.isActive,
      sortOrder: financeProducts.sortOrder,
    }).from(financeProducts).orderBy(asc(financeProducts.sortOrder)),
    db.select({ key: siteContent.key, body: siteContent.body })
      .from(siteContent).where(and(eq(siteContent.status, 'published'), inArray(siteContent.key, [...publicContentKeys]))),
  ])
  return { products, content: Object.fromEntries(content.map((item) => [item.key, item.body])) as Record<string, string> }
})

export const getCatalogWorkspaceData = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await requireOffice()
  const canProducts = session.isSuperAdmin || session.permissions.includes('products.view')
  const canContent = session.isSuperAdmin || session.permissions.includes('content.view')
  if (!canProducts && !canContent) throw new Error('You do not have permission to view the catalogue or site content.')

  const [products, content] = await Promise.all([
    canProducts
      ? db.select({
          id: financeProducts.id,
          category: financeProducts.category,
          name: financeProducts.name,
          description: financeProducts.description,
          isActive: financeProducts.isActive,
          sortOrder: financeProducts.sortOrder,
        }).from(financeProducts).orderBy(asc(financeProducts.sortOrder))
      : Promise.resolve([]),
    canContent
      ? db.select({
          id: siteContent.id,
          key: siteContent.key,
          title: siteContent.title,
          body: siteContent.body,
          status: siteContent.status,
        }).from(siteContent).orderBy(asc(siteContent.key))
      : Promise.resolve([]),
  ])
  return {
    products,
    content,
    permissions: session.permissions,
    isSuperAdmin: session.isSuperAdmin,
  }
})

const productInput = z.object({
  category: z.enum(['vehicle', 'equipment', 'commercial-asset', 'other']),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1200),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
})

export const saveFinanceProduct = createServerFn({ method: 'POST' })
  .validator((input: unknown) => productInput.parse(input))
  .handler(async ({ data }) => {
    const [existing] = await db.select().from(financeProducts)
      .where(eq(financeProducts.category, data.category)).limit(1)
    const session = await requireOffice(existing ? 'products.edit' : 'products.create')
    if (existing && existing.isActive !== data.isActive &&
        !session.isSuperAdmin && !session.permissions.includes('products.manage')) {
      throw new Error('Your account cannot activate or deactivate finance products.')
    }

    const now = new Date()
    const [saved] = existing
      ? await db.update(financeProducts).set({
          name: data.name,
          description: data.description,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
          updatedAt: now,
        }).where(eq(financeProducts.id, existing.id)).returning({ id: financeProducts.id })
      : await db.insert(financeProducts).values({
          category: data.category,
          name: data.name,
          description: data.description,
          documentChecklist: [],
          isActive: data.isActive,
          sortOrder: data.sortOrder,
        }).returning({ id: financeProducts.id })

    await db.insert(auditEvents).values({
      actorUserId: session.user.id,
      event: existing ? 'catalogue.finance_product_updated' : 'catalogue.finance_product_created',
      resource: 'finance_product',
      resourceId: saved.id,
      details: { category: data.category, isActive: data.isActive },
    })
    return { success: true, id: saved.id }
  })

const contentInput = z.object({
  id: z.string().uuid().optional(),
  key: z.string().trim().max(120).refine((key) => publicContentKeys.includes(key as typeof publicContentKeys[number]), 'This content key is not supported by the public website.'),
  title: z.string().trim().min(2).max(160),
  body: z.string().trim().min(1).max(12000),
  status: z.enum(['draft', 'published']),
})

export const saveSiteContent = createServerFn({ method: 'POST' })
  .validator((input: unknown) => contentInput.parse(input))
  .handler(async ({ data }) => {
    const [existing] = data.id
      ? await db.select().from(siteContent).where(eq(siteContent.id, data.id)).limit(1)
      : []
    if (data.id && !existing) throw new Error('The selected content record no longer exists.')
    const session = await requireOffice(existing ? 'content.edit' : 'content.create')
    if (data.status === 'published' && !session.isSuperAdmin && !session.permissions.includes('content.approve')) {
      throw new Error('Publishing site content requires content approval permission.')
    }

    const now = new Date()
    const [saved] = existing
      ? await db.update(siteContent).set({
          key: data.key,
          title: data.title,
          body: data.body,
          status: data.status,
          updatedBy: session.user.id,
          updatedAt: now,
        }).where(eq(siteContent.id, existing.id)).returning({ id: siteContent.id })
      : await db.insert(siteContent).values({
          key: data.key,
          title: data.title,
          body: data.body,
          status: data.status,
          updatedBy: session.user.id,
        }).returning({ id: siteContent.id })

    await db.insert(auditEvents).values({
      actorUserId: session.user.id,
      event: data.status === 'published' ? 'catalogue.site_content_published' : 'catalogue.site_content_saved',
      resource: 'site_content',
      resourceId: saved.id,
      details: { key: data.key, status: data.status },
    })
    return { success: true, id: saved.id }
  })
