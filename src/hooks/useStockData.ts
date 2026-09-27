import { listProducts, listVariants } from '../api/catalog'
import { locationsApi } from '../api/resources'
import type { Location, Product, Variant } from '../api/types'
import { useLoad } from './useLoad'

export type StockData = {
  products: Product[]
  locations: Location[]
  variantsByProduct: Record<string, Variant[]>
}

/** Products (with their variants) and locations: what you need to pick "what" and "where" for stock. */
export function useStockData(businessId: string) {
  return useLoad(async (): Promise<StockData> => {
    const [products, locations] = await Promise.all([listProducts(businessId), locationsApi.list(businessId)])
    const variantLists = await Promise.all(products.map((p) => listVariants(businessId, p.id)))
    const variantsByProduct = Object.fromEntries(products.map((p, i) => [p.id, variantLists[i]]))
    return { products, locations, variantsByProduct }
  }, [businessId])
}
