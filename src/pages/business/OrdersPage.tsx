import { Link } from 'react-router-dom'
import { listOrders } from '../../api/orders'
import { useBusiness } from '../../businessContext'
import { Badge, EmptyState, ErrorBox, Loading, PageHeader, Tabs } from '../../components/ui'
import { useLoad } from '../../hooks/useLoad'
import { useTab } from '../../hooks/useTab'
import { formatDateTime, formatMoney } from '../../utils/format'

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
    <div className="page">
      <PageHeader
        title="Orders"
        subtitle="Orders between your business and other businesses."
        actions={
          <Link to="/dashboard/directory" className="btn btn-ghost">
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
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>{side === 'selling' ? 'Customer' : 'Supplier'}</th>
                <th>Ordered</th>
                <th className="num">Items</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="strong">
                    <Link to={`/business/${business.id}/orders/${order.id}`} className="row-link">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td>{side === 'selling' ? order.buyerBusinessName : order.sellerBusinessName}</td>
                  <td>{formatDateTime(order.orderedAt)}</td>
                  <td className="num">{order.items.length}</td>
                  <td className="num strong">{formatMoney(order.total, order.currency)}</td>
                  <td>
                    <Badge value={order.orderStatus} />
                  </td>
                  <td>
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
