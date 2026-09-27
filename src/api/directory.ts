import { del, get, post, put, query } from './client'
import type {
  Business,
  BusinessDocument,
  BusinessSummary,
  Category,
  Certification,
  CurrentUser,
  PublicProduct,
  PublicProfile,
  Review,
  VerificationRequest,
} from './types'

export const getMe = () => get<CurrentUser>('/me')
export const listCategories = () => get<Category[]>('/categories')

// ---- Directory (any logged-in user) ----
export type DirectoryFilters = {
  q?: string
  type?: string
  capability?: string
  category_id?: string
  city?: string
  verified_only?: boolean
}

export const searchBusinesses = (filters: DirectoryFilters) =>
  get<BusinessSummary[]>(`/directory/businesses${query(filters)}`)
export const getPublicProfile = (businessId: string) => get<PublicProfile>(`/directory/businesses/${businessId}`)
/** Pass one of your businesses as buyerBusinessId to also see its private customer prices. */
export const listPublicProducts = (businessId: string, buyerBusinessId?: string) =>
  get<PublicProduct[]>(`/directory/businesses/${businessId}/products${query({ buyer_business_id: buyerBusinessId })}`)
export const listPublicReviews = (businessId: string) => get<Review[]>(`/directory/businesses/${businessId}/reviews`)

// ---- Platform admin ----
export const adminListVerifications = (status?: string) =>
  get<VerificationRequest[]>(`/admin/verifications${query({ status })}`)
export const adminReviewVerification = (requestId: string, body: { status: string; rejectionReason: string }) =>
  post<VerificationRequest>(`/admin/verifications/${requestId}/review`, body)
export const adminListBusinesses = () => get<Business[]>('/admin/businesses')
export const adminListDocuments = (businessId: string) =>
  get<BusinessDocument[]>(`/admin/businesses/${businessId}/documents`)
export const adminListCertifications = (businessId: string) =>
  get<Certification[]>(`/admin/businesses/${businessId}/certifications`)
export const adminSetCertificationStatus = (businessId: string, certId: string, status: string) =>
  post<Certification>(`/admin/businesses/${businessId}/certifications/${certId}/status`, { status })
export const adminCreateCategory = (body: { categoryName: string; parentCategoryId: string | null; status: string }) =>
  post<Category>('/admin/categories', body)
export const adminUpdateCategory = (
  categoryId: string,
  body: { categoryName: string; parentCategoryId: string | null; status: string },
) => put<Category>(`/admin/categories/${categoryId}`, body)
export const adminDeleteCategory = (categoryId: string) => del(`/admin/categories/${categoryId}`)
export const adminLoadDefaultCategories = () => post<Category[]>('/admin/categories/defaults')
