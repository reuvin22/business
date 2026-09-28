import { del, get, post, put, query } from './client'
import type { InventoryItem, Price, Product, ProductFull, Sale, StockMovement, Variant } from './types'

const products = (businessId: string) => `/businesses/${businessId}/products`

// ---- Products ----
export const listProducts = (businessId: string) => get<Product[]>(products(businessId))
export const deleteProduct = (businessId: string, productId: string) => del(`${products(businessId)}/${productId}`)

// ---- The product form: product + variants + price tiers in one request ----
export const getProductFull = (businessId: string, productId: string) =>
  get<ProductFull>(`${products(businessId)}/${productId}/full`)
export const createProductFull = (businessId: string, body: unknown) => post<ProductFull>(`${products(businessId)}/full`, body)
export const updateProductFull = (businessId: string, productId: string, body: unknown) =>
  put<ProductFull>(`${products(businessId)}/${productId}/full`, body)
/** Every price tier of every product, in one request. */
export const listAllPrices = (businessId: string) => get<Price[]>(`/businesses/${businessId}/prices`)

// ---- Variants ----
/** Every variant of every product, in one request. */
export const listAllVariants = (businessId: string) => get<Variant[]>(`/businesses/${businessId}/variants`)

// ---- Inventory ----
const inventory = (businessId: string) => `/businesses/${businessId}/inventory`

export const listInventory = (businessId: string, options: { fresh?: boolean } = {}) =>
  get<InventoryItem[]>(inventory(businessId), options)
export const createInventory = (businessId: string, body: unknown) => post<InventoryItem>(inventory(businessId), body)
export const updateInventory = (businessId: string, inventoryId: string, body: { quantity: number; reorderLevel: number | null }) =>
  put<InventoryItem>(`${inventory(businessId)}/${inventoryId}`, body)
export const adjustInventory = (businessId: string, inventoryId: string, body: { change: number; note: string }) =>
  post<InventoryItem>(`${inventory(businessId)}/${inventoryId}/adjust`, body)
export const deleteInventory = (businessId: string, inventoryId: string) => del(`${inventory(businessId)}/${inventoryId}`)

// ---- Stock history ----
export const listStockMovements = (
  businessId: string,
  filters: { product_id?: string; location_id?: string } = {},
  options: { fresh?: boolean } = {},
) => get<StockMovement[]>(`/businesses/${businessId}/stock-movements${query(filters)}`, options)

// ---- Walk-in sales ----
export const listSales = (businessId: string) => get<Sale[]>(`/businesses/${businessId}/sales`)
export const recordSale = (businessId: string, body: unknown) => post<Sale>(`/businesses/${businessId}/sales`, body)
export const deleteSale = (businessId: string, saleId: string) => del(`/businesses/${businessId}/sales/${saleId}`)
