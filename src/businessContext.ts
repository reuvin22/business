import { useOutletContext } from 'react-router-dom'
import type { Business, MyRole } from './api/types'

export type BusinessContext = {
  business: Business
  role: MyRole
  /** True when the logged-in user has this permission, e.g. can('products.manage'). */
  can: (permission: string) => boolean
  /** Re-loads the business (after editing its details). */
  reload: () => void
}

/** Use inside any page under /business/:id to get the current business. */
export const useBusiness = () => useOutletContext<BusinessContext>()
