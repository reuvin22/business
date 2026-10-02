import { get, post } from './client'
import type { Conversation, Message, RelationshipView, Review } from './types'

// ---- Relationships ----
/** Pass { fresh: true } to skip the browser cache (e.g. to see that the other side just accepted). */
export const listRelationships = (businessId: string, options: { fresh?: boolean } = {}) =>
  get<RelationshipView[]>(`/businesses/${businessId}/relationships`, options)
export const requestRelationship = (
  businessId: string,
  body: { relatedBusinessId: string; relationshipType: string; notes: string },
) => post<RelationshipView>(`/businesses/${businessId}/relationships`, body)
export const respondToRelationship = (businessId: string, relationshipId: string, accept: boolean) =>
  post<RelationshipView>(`/businesses/${businessId}/relationships/${relationshipId}/respond`, { accept })
export const endRelationship = (businessId: string, relationshipId: string) =>
  post<RelationshipView>(`/businesses/${businessId}/relationships/${relationshipId}/end`)

// ---- Conversations ----
// Messages are checked every few seconds, so they always skip the browser cache
export const listConversations = (businessId: string) =>
  get<Conversation[]>(`/businesses/${businessId}/conversations`, { fresh: true })
export const startConversation = (
  businessId: string,
  body: { participantBusinessId: string; message: string; attachments?: string[]; orderId?: string | null },
) =>
  post<Conversation>(`/businesses/${businessId}/conversations`, body)
export const openConversation = (businessId: string, conversationId: string) =>
  get<{ conversation: Conversation; messages: Message[] }>(`/businesses/${businessId}/conversations/${conversationId}`, {
    fresh: true,
  })
/** attachments: photo links (uploaded with kind 'chat'); orderId: an order between the two businesses, sent as a card */
export const sendMessage = (
  businessId: string,
  conversationId: string,
  body: { message: string; attachments?: string[]; orderId?: string | null },
) => post<Message>(`/businesses/${businessId}/conversations/${conversationId}/messages`, { attachments: [], orderId: null, ...body })

// ---- Reviews about this business ----
export const listMyReviews = (businessId: string) => get<Review[]>(`/businesses/${businessId}/reviews`)
export const respondToReview = (businessId: string, reviewId: string, response: string) =>
  post<Review>(`/businesses/${businessId}/reviews/${reviewId}/response`, { response })
