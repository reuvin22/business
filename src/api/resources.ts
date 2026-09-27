// Simple business resources that all work the same way:
//   list, create, update, remove   (lists, e.g. contacts)
//   load, save                     (one per business, e.g. legal info)
import { del, get, post, put } from './client'
import type {
  Brand,
  BusinessDocument,
  Certification,
  Contact,
  CustomerPrice,
  DeliverySettings,
  DeliveryZone,
  Legal,
  Location,
  PaymentMethod,
  PaymentTerms,
  ReturnPolicy,
  SocialLink,
  SupplierProfile,
  VerificationRequest,
} from './types'

export type ListResource<T> = {
  list: (businessId: string) => Promise<T[]>
  create: (businessId: string, body: unknown) => Promise<T>
  update: (businessId: string, id: string, body: unknown) => Promise<T>
  remove: (businessId: string, id: string) => Promise<void>
}

/** A list under /businesses/{id}/{path}, e.g. listResource<Contact>('contacts'). */
function listResource<T>(path: string): ListResource<T> {
  return {
    list: (businessId) => get<T[]>(`/businesses/${businessId}/${path}`),
    create: (businessId, body) => post<T>(`/businesses/${businessId}/${path}`, body),
    update: (businessId, id, body) => put<T>(`/businesses/${businessId}/${path}/${id}`, body),
    remove: (businessId, id) => del(`/businesses/${businessId}/${path}/${id}`),
  }
}

export type SingleResource<T> = {
  load: (businessId: string) => Promise<T>
  save: (businessId: string, body: unknown) => Promise<T>
}

/** One document per business at /businesses/{id}/{path}, e.g. singleResource<Legal>('legal'). */
function singleResource<T>(path: string): SingleResource<T> {
  return {
    load: (businessId) => get<T>(`/businesses/${businessId}/${path}`),
    save: (businessId, body) => put<T>(`/businesses/${businessId}/${path}`, body),
  }
}

// ---- Profile ----
export const contactsApi = listResource<Contact>('contacts')
export const locationsApi = listResource<Location>('locations')
export const socialLinksApi = listResource<SocialLink>('social-links')
export const certificationsApi = listResource<Certification>('certifications')
export const documentsApi = listResource<BusinessDocument>('documents')
export const legalApi = singleResource<Legal>('legal')

export const listVerificationRequests = (businessId: string) =>
  get<VerificationRequest[]>(`/businesses/${businessId}/verifications`)
export const submitVerificationRequest = (
  businessId: string,
  body: { verificationType: string; documentIds: string[]; notes: string },
) => post<VerificationRequest>(`/businesses/${businessId}/verifications`, body)

// ---- Catalog ----
export const brandsApi = listResource<Brand>('brands')
export const customerPricesApi = listResource<CustomerPrice>('customer-prices')

// ---- Commerce ----
export const deliveryApi = singleResource<DeliverySettings>('delivery')
export const deliveryZonesApi = listResource<DeliveryZone>('delivery-zones')
export const paymentMethodsApi = listResource<PaymentMethod>('payment-methods')
export const paymentTermsApi = singleResource<PaymentTerms>('payment-terms')
export const returnPolicyApi = singleResource<ReturnPolicy>('return-policy')
export const supplierProfileApi = singleResource<SupplierProfile>('supplier-profile')
