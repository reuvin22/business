import type { StockMovement } from '../api/types'
import { labelOf, STOCK_MOVEMENT_TYPES } from '../constants/options'
import { cx } from '../styles'
import { formatDateTime, formatNumber } from '../utils/format'
import { EmptyState, Table, Td, Th } from './ui'

const typeLabel = (type: string) => STOCK_MOVEMENT_TYPES.find((t) => t.value === type)?.label ?? labelOf(type)

/** Every added (+) and deducted (−) quantity, newest first. */
export default function StockHistoryTable({
  movements,
  showProduct = true,
}: {
  movements: StockMovement[]
  showProduct?: boolean
}) {
  if (movements.length === 0) return <EmptyState text="No stock changes yet." />

  return (
    <Table
      head={
        <>
          <Th>When</Th>
          {showProduct && <Th>Product</Th>}
          <Th>Location</Th>
          <Th>What happened</Th>
          <Th num>Change</Th>
          <Th num>On hand after</Th>
          <Th>Details</Th>
          <Th>By</Th>
        </>
      }
    >
      {movements.map((m) => (
        <tr key={m.id}>
          <Td>{formatDateTime(m.createdAt)}</Td>
          {showProduct && (
            <Td strong>
              {m.productName}
              {m.variantName && ` (${m.variantName})`}
            </Td>
          )}
          <Td>{m.locationName}</Td>
          <Td>{typeLabel(m.movementType)}</Td>
          <Td num strong className={cx(m.change > 0 ? 'text-up' : m.change < 0 ? 'text-down' : undefined)}>
            {m.change > 0 ? '+' : m.change < 0 ? '−' : ''}
            {formatNumber(Math.abs(m.change))}
          </Td>
          <Td num>{formatNumber(m.quantityAfter)}</Td>
          <Td wrap>{[m.referenceLabel && `${m.movementType.startsWith('ORDER_') ? 'Order' : 'Receipt'} ${m.referenceLabel}`, m.note].filter(Boolean).join(' · ') || '—'}</Td>
          <Td>{m.byName || '—'}</Td>
        </tr>
      ))}
    </Table>
  )
}
