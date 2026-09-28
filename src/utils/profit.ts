/** Profit on one unit sold at `price`, and the margin (profit as a % of the price).
 *  null when the cost price is not set. */
export function unitProfit(price: number | null, cost: number | null | undefined) {
  if (price === null || cost === null || cost === undefined) return null
  const profit = price - cost
  return { profit, margin: price > 0 ? (profit / price) * 100 : null }
}
