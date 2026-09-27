import { del, get, post, put } from './client'
import type { Business, BusinessIn, Member, MyRole } from './types'

export const listMyBusinesses = () => get<Business[]>('/businesses')
export const getBusiness = (businessId: string) => get<Business>(`/businesses/${businessId}`)
export const getMyRole = (businessId: string) => get<MyRole>(`/businesses/${businessId}/my-role`)
export const createBusiness = (body: BusinessIn) => post<Business>('/businesses', body)
export const updateBusiness = (businessId: string, body: BusinessIn) => put<Business>(`/businesses/${businessId}`, body)
export const deleteBusiness = (businessId: string) => del(`/businesses/${businessId}`)

// ---- Team members ----
export const listMembers = (businessId: string) => get<Member[]>(`/businesses/${businessId}/members`)
export const addMember = (businessId: string, body: { email: string; role: string; permissions?: string[] | null }) =>
  post<Member>(`/businesses/${businessId}/members`, body)
export const updateMember = (
  businessId: string,
  userId: string,
  body: { role: string; permissions: string[]; status: string },
) => put<Member>(`/businesses/${businessId}/members/${userId}`, body)
export const removeMember = (businessId: string, userId: string) => del(`/businesses/${businessId}/members/${userId}`)
