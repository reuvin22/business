// Turn loaded data into dropdown options.
import type { Option } from '../constants/options'
import type { Category, Product, Variant } from '../api/types'

/** Categories as "Food › Beverages", parents first. */
export function categoryOptions(categories: Category[]): Option[] {
  const active = categories.filter((c) => c.status === 'ACTIVE')
  const byId = new Map(active.map((c) => [c.id, c]))
  const fullName = (c: Category): string => {
    const parent = c.parentCategoryId ? byId.get(c.parentCategoryId) : undefined
    return parent ? `${fullName(parent)} › ${c.categoryName}` : c.categoryName
  }
  return active.map((c) => ({ value: c.id, label: fullName(c) })).sort((a, b) => a.label.localeCompare(b.label))
}

export function categoryName(categories: Category[], id: string | null) {
  return categoryOptions(categories).find((o) => o.value === id)?.label ?? ''
}

/**
 * One option per product without variants, or per variant, e.g. "Cola (1.5L)".
 * The value is "productId|variantId" (variantId is empty for the product itself).
 */
export function stockItemOptions(products: Product[], variantsByProduct: Record<string, Variant[]>): Option[] {
  const result: Option[] = []
  for (const product of products) {
    const variants = variantsByProduct[product.id] ?? []
    if (variants.length === 0) result.push({ value: `${product.id}|`, label: product.productName })
    for (const variant of variants) {
      result.push({ value: `${product.id}|${variant.id}`, label: `${product.productName} (${variant.variantName})` })
    }
  }
  return result
}

/** "productId|variantId" -> { productId, variantId } */
export function splitStockItem(value: unknown) {
  const [productId, variantId] = String(value ?? '').split('|')
  return { productId, variantId: variantId || null }
}

export function stockItemName(products: Product[], variantsByProduct: Record<string, Variant[]>, productId: string, variantId: string | null) {
  const product = products.find((p) => p.id === productId)
  const variant = variantId ? variantsByProduct[productId]?.find((v) => v.id === variantId) : undefined
  if (!product) return 'Deleted product'
  return variant ? `${product.productName} (${variant.variantName})` : product.productName
}
