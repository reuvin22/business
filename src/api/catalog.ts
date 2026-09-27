import { del, get, post, put } from './client'
import type { InventoryItem, Price, Product, Sale, Variant } from './types'

const products = (businessId: string) => `/businesses/${businessId}/products`

// ---- Products ----
export const listProducts = (businessId: string) => get<Product[]>(products(businessId))
export const getProduct = (businessId: string, productId: string) => get<Product>(`${products(businessId)}/${productId}`)
export const createProduct = (businessId: string, body: unknown) => post<Product>(products(businessId), body)
export const updateProduct = (businessId: string, productId: string, body: unknown) =>
  put<Product>(`${products(businessId)}/${productId}`, body)
export const deleteProduct = (businessId: string, productId: string) => del(`${products(businessId)}/${productId}`)

// ---- Variants ----
export const listVariants = (businessId: string, productId: string) =>
  get<Variant[]>(`${products(businessId)}/${productId}/variants`)
export const createVariant = (businessId: string, productId: string, body: unknown) =>
  post<Variant>(`${products(businessId)}/${productId}/variants`, body)
export const updateVariant = (businessId: string, productId: string, variantId: string, body: unknown) =>
  put<Variant>(`${products(businessId)}/${productId}/variants/${variantId}`, body)
export const deleteVariant = (businessId: string, productId: string, variantId: string) =>
  del(`${products(businessId)}/${productId}/variants/${variantId}`)

// ---- Price tiers ----
export const listPrices = (businessId: string, productId: string) =>
  get<Price[]>(`${products(businessId)}/${productId}/prices`)
export const createPrice = (businessId: string, productId: string, body: unknown) =>
  post<Price>(`${products(businessId)}/${productId}/prices`, body)
export const updatePrice = (businessId: string, productId: string, priceId: string, body: unknown) =>
  put<Price>(`${products(businessId)}/${productId}/prices/${priceId}`, body)
export const deletePrice = (businessId: string, productId: string, priceId: string) =>
  del(`${products(businessId)}/${productId}/prices/${priceId}`)

// ---- Inventory ----
const inventory = (businessId: string) => `/businesses/${businessId}/inventory`

export const listInventory = (businessId: string) => get<InventoryItem[]>(inventory(businessId))
export const createInventory = (businessId: string, body: unknown) => post<InventoryItem>(inventory(businessId), body)
export const updateInventory = (businessId: string, inventoryId: string, body: { quantity: number; reorderLevel: number | null }) =>
  put<InventoryItem>(`${inventory(businessId)}/${inventoryId}`, body)
export const adjustInventory = (businessId: string, inventoryId: string, body: { change: number; note: string }) =>
  post<InventoryItem>(`${inventory(businessId)}/${inventoryId}/adjust`, body)
export const deleteInventory = (businessId: string, inventoryId: string) => del(`${inventory(businessId)}/${inventoryId}`)

// ---- Walk-in sales ----
export const listSales = (businessId: string) => get<Sale[]>(`/businesses/${businessId}/sales`)
export const recordSale = (businessId: string, body: unknown) => post<Sale>(`/businesses/${businessId}/sales`, body)
export const deleteSale = (businessId: string, saleId: string) => del(`/businesses/${businessId}/sales/${saleId}`)
