import { listAllVariants, listProducts } from '../api/catalog'
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
    // Three requests at the same time (not one request per product)
    const [products, locations, variants] = await Promise.all([
      listProducts(businessId),
      locationsApi.list(businessId),
      listAllVariants(businessId),
    ])
    const variantsByProduct = Object.fromEntries(products.map((p) => [p.id, variants.filter((v) => v.productId === p.id)]))
    return { products, locations, variantsByProduct }
  }, [businessId])
}
