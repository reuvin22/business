import { Link } from 'react-router-dom'
import { listOrders } from '../../api/orders'
import { useBusiness } from '../../businessContext'
import { Badge, EmptyState, ErrorBox, Loading, PageHeader, Tabs } from '../../components/ui'
import { useLoad } from '../../hooks/useLoad'
import { useTab } from '../../hooks/useTab'
import { formatDateTime, formatMoney } from '../../utils/format'
import { cx, ui } from '../../styles'

const TABS = [
  { key: 'selling', label: 'Orders from customers' },
  { key: 'buying', label: 'My purchases' },
]

export default function OrdersPage() {
  const { business } = useBusiness()
  const [tab, setTab] = useTab(TABS)
  const side = tab as 'selling' | 'buying'
  const { data: orders, loading, error } = useLoad(() => listOrders(business.id, side), [business.id, side])

  return (
    <div className={ui.page}>
      <PageHeader
        title="Orders"
        subtitle="Orders between your business and other businesses."
        actions={
          <Link to="/dashboard/directory" className={ui.btnGhost}>
            Find suppliers
          </Link>
        }
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <ErrorBox message={error} />
      {loading && !orders ? (
        <Loading />
      ) : !orders?.length ? (
        <EmptyState
          text={
            side === 'selling'
              ? 'No orders yet. Make sure your products are public and have prices, so buyers can find them in the directory.'
              : 'You have not ordered from a supplier yet. Browse the directory to find one.'
          }
        />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>Order</th>
                <th className={ui.th}>{side === 'selling' ? 'Customer' : 'Supplier'}</th>
                <th className={ui.th}>Ordered</th>
                <th className={cx(ui.th, ui.num)}>Items</th>
                <th className={cx(ui.th, ui.num)}>Total</th>
                <th className={ui.th}>Status</th>
                <th className={ui.th}>Payment</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className={cx(ui.td, ui.strong)}>
                    <Link to={`/business/${business.id}/orders/${order.id}`} className={ui.rowLink}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className={ui.td}>{side === 'selling' ? order.buyerBusinessName : order.sellerBusinessName}</td>
                  <td className={ui.td}>{formatDateTime(order.orderedAt)}</td>
                  <td className={cx(ui.td, ui.num)}>{order.items.length}</td>
                  <td className={cx(ui.td, ui.num, ui.strong)}>{formatMoney(order.total, order.currency)}</td>
                  <td className={ui.td}>
                    <Badge value={order.orderStatus} />
                  </td>
                  <td className={ui.td}>
                    <Badge value={order.paymentStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
