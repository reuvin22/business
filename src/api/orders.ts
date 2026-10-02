import { get, post, put, query } from './client'
import type { Order, OrderIn, OrderView, Quote, Ratings, Review } from './types'

const orders = (businessId: string) => `/businesses/${businessId}/orders`

// Always fresh: the other business may have just accepted, declined, or shipped it
export const listOrders = (businessId: string, side?: 'buying' | 'selling') =>
  get<Order[]>(`${orders(businessId)}${query({ side })}`, { fresh: true })
export const getOrder = (businessId: string, orderId: string) => get<OrderView>(`${orders(businessId)}/${orderId}`, { fresh: true })

/** Prices an order without placing it. */
export const quoteOrder = (buyerBusinessId: string, body: OrderIn) => post<Quote>(`${orders(buyerBusinessId)}/quote`, body)
export const placeOrder = (buyerBusinessId: string, body: OrderIn) => post<Order>(orders(buyerBusinessId), body)

export const changeOrderStatus = (
  businessId: string,
  orderId: string,
  body: { status: string; fulfillmentLocationId?: string | null; reason?: string },
) => post<Order>(`${orders(businessId)}/${orderId}/status`, body)
export const changePaymentStatus = (businessId: string, orderId: string, paymentStatus: string) =>
  post<Order>(`${orders(businessId)}/${orderId}/payment-status`, { paymentStatus })
export const changeOrderCharges = (
  businessId: string,
  orderId: string,
  body: { deliveryFee: number; tax: number; discount: number },
) => put<Order>(`${orders(businessId)}/${orderId}/charges`, body)

export const reviewOrder = (buyerBusinessId: string, orderId: string, body: { ratings: Ratings; review: string }) =>
  post<Review>(`${orders(buyerBusinessId)}/${orderId}/review`, body)
