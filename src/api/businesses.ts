import { del, get, post, put } from './client'
import type { Business, BusinessIn, Invitation, Member, MyRole, SellerAdded } from './types'

export const listMyBusinesses = () => get<Business[]>('/businesses')
export const getBusiness = (businessId: string) => get<Business>(`/businesses/${businessId}`)
export const getMyRole = (businessId: string) => get<MyRole>(`/businesses/${businessId}/my-role`)
/** The business and your role in it, in one request. */
export const getBusinessContext = (businessId: string) =>
  get<{ business: Business; role: MyRole }>(`/businesses/${businessId}/context`)
export const createBusiness = (body: BusinessIn) => post<Business>('/businesses', body)
export const updateBusiness = (businessId: string, body: BusinessIn) => put<Business>(`/businesses/${businessId}`, body)
export const deleteBusiness = (businessId: string) => del(`/businesses/${businessId}`)

// ---- Team members ----
export const listMembers = (businessId: string) => get<Member[]>(`/businesses/${businessId}/members`)
/** Sends an invitation: they join when they accept it (under My businesses). */
export const addMember = (businessId: string, body: { email: string; role: string; permissions?: string[] | null }) =>
  post<Invitation>(`/businesses/${businessId}/members`, body)
export const listInvitations = (businessId: string) => get<Invitation[]>(`/businesses/${businessId}/invitations`, { fresh: true })
export const cancelInvitation = (businessId: string, invitationId: string) =>
  del(`/businesses/${businessId}/invitations/${invitationId}`)

// ---- Invitations to me ----
export const listMyInvitations = () => get<Invitation[]>('/me/invitations', { fresh: true })
export const acceptInvitation = (invitationId: string) => post<Member>(`/me/invitations/${invitationId}/accept`, {})
export const declineInvitation = (invitationId: string) => post<void>(`/me/invitations/${invitationId}/decline`, {})
export const updateMember = (
  businessId: string,
  userId: string,
  body: { role: string; permissions: string[]; status: string },
) => put<Member>(`/businesses/${businessId}/members/${userId}`, body)
export const removeMember = (businessId: string, userId: string) => del(`/businesses/${businessId}/members/${userId}`)

// ---- Seller accounts (people who only use the selling app) ----
export const listSellers = (businessId: string) => get<Member[]>(`/businesses/${businessId}/sellers`)
export const createSeller = (
  businessId: string,
  body: { displayName: string; email: string; password: string; locationId: string | null },
) => post<SellerAdded>(`/businesses/${businessId}/sellers`, body)
export const updateSeller = (
  businessId: string,
  userId: string,
  body: { displayName: string; locationId: string | null; status: string },
) => put<Member>(`/businesses/${businessId}/sellers/${userId}`, body)
export const setSellerPassword = (businessId: string, userId: string, password: string) =>
  put<void>(`/businesses/${businessId}/sellers/${userId}/password`, { password })
export const removeSeller = (businessId: string, userId: string) => del(`/businesses/${businessId}/sellers/${userId}`)
