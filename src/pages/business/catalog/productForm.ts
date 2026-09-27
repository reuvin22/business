// The product form shows the order rules as normal fields, but the API keeps them
// inside `orderRules`. These two helpers move them in and out.
import type { Product } from '../../../api/types'
import type { Values } from '../../../forms/fields'

const RULE_KEYS = [
  'minimumOrderQuantity',
  'maximumOrderQuantity',
  'orderMultiple',
  'minimumOrderValue',
  'leadTimeDays',
  'preorderAllowed',
] as const

export const newProductValues: Values = {
  unit: 'pcs',
  status: 'ACTIVE',
  visibility: 'PUBLIC',
  minimumOrderQuantity: 1,
  orderMultiple: 1,
  images: [],
  specifications: [],
}

/** Product from the API -> form values */
export function productToForm(product: Product): Values {
  return { ...product, ...product.orderRules }
}

/** Form values -> request body */
export function formToProduct(values: Values, start: Values): Values {
  const body: Values = { ...start, ...values }
  const orderRules: Values = {}
  for (const key of RULE_KEYS) {
    orderRules[key] = body[key]
    delete body[key]
  }
  return { ...body, orderRules }
}
