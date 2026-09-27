import { Link, Outlet, useParams } from 'react-router-dom'
import { getBusiness, getMyRole } from '../api/businesses'
import type { BusinessContext } from '../businessContext'
import { labelOf } from '../constants/options'
import { useLoad } from '../hooks/useLoad'
import SidebarLayout from './SidebarLayout'
import {
  CommerceIcon,
  DashboardIcon,
  InventoryIcon,
  MessagesIcon,
  NetworkIcon,
  OrdersIcon,
  ProductsIcon,
  ProfileIcon,
  TeamIcon,
} from './icons'
import { cx, ui } from '../styles'
import { ErrorBox, VerifiedBadge } from './ui'

export default function BusinessLayout() {
  const { id = '' } = useParams()
  const { data, error, reload } = useLoad(
    () => Promise.all([getBusiness(id), getMyRole(id)]).then(([business, role]) => ({ business, role })),
    [id],
  )

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center text-muted">
        {error ? (
          <div className={cx(ui.card, 'flex max-w-100 flex-col gap-3')}>
            <ErrorBox message={error} />
            <Link to="/dashboard/business" className={ui.backLink}>
              ← Back to my businesses
            </Link>
          </div>
        ) : (
          'Loading…'
        )}
      </main>
    )
  }

  const { business, role } = data
  const context: BusinessContext = {
    business,
    role,
    can: (permission) => role.permissions.includes(permission),
    reload,
  }
  const base = `/business/${business.id}`

  return (
    <SidebarLayout
      title={business.businessName}
      header={
        <div className="flex flex-col items-start gap-2.5 px-3 pb-5">
          <Link to="/dashboard/business" className="text-[0.88rem] font-semibold text-side-text no-underline hover:text-lime">
            ← All businesses
          </Link>
          <div className="text-[1.15rem] leading-tight font-extrabold wrap-break-word text-side-heading">{business.businessName}</div>
          <div className="-mt-1.5 text-[0.8rem] text-side-text">{business.businessTypes.map(labelOf).join(' · ')}</div>
          <VerifiedBadge status={business.verificationStatus} level={business.verificationLevel} />
        </div>
      }
      items={[
        { to: base, label: 'Dashboard', icon: <DashboardIcon />, end: true },
        { to: `${base}/profile`, label: 'Profile', icon: <ProfileIcon /> },
        { to: `${base}/products`, label: 'Products', icon: <ProductsIcon /> },
        { to: `${base}/inventory`, label: 'Inventory', icon: <InventoryIcon /> },
        { to: `${base}/orders`, label: 'Orders', icon: <OrdersIcon /> },
        { to: `${base}/messages`, label: 'Messages', icon: <MessagesIcon /> },
        { to: `${base}/network`, label: 'Network', icon: <NetworkIcon /> },
        { to: `${base}/commerce`, label: 'Delivery & payments', icon: <CommerceIcon /> },
        { to: `${base}/team`, label: 'Team', icon: <TeamIcon /> },
      ]}
    >
      <Outlet context={context} />
    </SidebarLayout>
  )
}
