import { del, get, post, put } from './client'
import type { ChatAccess, ChatMessage } from './types'

// The team and market channels. Messages are read live from the Realtime Database (hooks/useRealtime.ts)
// and sent through the API, which checks who may send.

/** Lets you read this business's chats live, and says where they are. Call it before listening. */
export const getChatAccess = (businessId: string) => get<ChatAccess>(`/businesses/${businessId}/chat`, { fresh: true })
/** attachments: photo links (uploaded with kind 'chat') */
export const sendTeamMessage = (businessId: string, message: string, attachments: string[] = []) =>
  post<ChatMessage>(`/businesses/${businessId}/chat/team/messages`, { message, attachments })
export const sendMarketMessage = (businessId: string, message: string, attachments: string[] = []) =>
  post<ChatMessage>(`/businesses/${businessId}/chat/market/messages`, { message, attachments })
/** Only the sender may change their message; the sender or their business may delete a market post */
export const editTeamMessage = (businessId: string, messageId: string, message: string) =>
  put<ChatMessage>(`/businesses/${businessId}/chat/team/messages/${messageId}`, { message })
export const deleteTeamMessage = (businessId: string, messageId: string) => del(`/businesses/${businessId}/chat/team/messages/${messageId}`)
export const editMarketMessage = (businessId: string, messageId: string, message: string) =>
  put<ChatMessage>(`/businesses/${businessId}/chat/market/messages/${messageId}`, { message })
export const deleteMarketMessage = (businessId: string, messageId: string) =>
  del(`/businesses/${businessId}/chat/market/messages/${messageId}`)
