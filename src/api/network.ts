import { get, post } from './client'
import type { Conversation, Message, RelationshipView, Review } from './types'

// ---- Relationships ----
export const listRelationships = (businessId: string) =>
  get<RelationshipView[]>(`/businesses/${businessId}/relationships`)
export const requestRelationship = (
  businessId: string,
  body: { relatedBusinessId: string; relationshipType: string; notes: string },
) => post<RelationshipView>(`/businesses/${businessId}/relationships`, body)
export const respondToRelationship = (businessId: string, relationshipId: string, accept: boolean) =>
  post<RelationshipView>(`/businesses/${businessId}/relationships/${relationshipId}/respond`, { accept })
export const endRelationship = (businessId: string, relationshipId: string) =>
  post<RelationshipView>(`/businesses/${businessId}/relationships/${relationshipId}/end`)

// ---- Conversations ----
export const listConversations = (businessId: string) => get<Conversation[]>(`/businesses/${businessId}/conversations`)
export const startConversation = (businessId: string, body: { participantBusinessId: string; message: string }) =>
  post<Conversation>(`/businesses/${businessId}/conversations`, body)
export const openConversation = (businessId: string, conversationId: string) =>
  get<{ conversation: Conversation; messages: Message[] }>(`/businesses/${businessId}/conversations/${conversationId}`)
export const sendMessage = (businessId: string, conversationId: string, message: string) =>
  post<Message>(`/businesses/${businessId}/conversations/${conversationId}/messages`, { message, attachments: [] })

// ---- Reviews about this business ----
export const listMyReviews = (businessId: string) => get<Review[]>(`/businesses/${businessId}/reviews`)
export const respondToReview = (businessId: string, reviewId: string, response: string) =>
  post<Review>(`/businesses/${businessId}/reviews/${reviewId}/response`, { response })
