import { del, get, post } from './client'
import type { ChatAccess, ChatMessage } from './types'

// The team and market channels. Messages are read live from the Realtime Database (hooks/useRealtime.ts)
// and sent through the API, which checks who may send.

/** Lets you read this business's chats live, and says where they are. Call it before listening. */
export const getChatAccess = (businessId: string) => get<ChatAccess>(`/businesses/${businessId}/chat`, { fresh: true })
export const sendTeamMessage = (businessId: string, message: string) =>
  post<ChatMessage>(`/businesses/${businessId}/chat/team/messages`, { message })
export const sendMarketMessage = (businessId: string, message: string) =>
  post<ChatMessage>(`/businesses/${businessId}/chat/market/messages`, { message })
export const deleteMarketMessage = (businessId: string, messageId: string) =>
  del(`/businesses/${businessId}/chat/market/messages/${messageId}`)
