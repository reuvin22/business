import { Outlet } from 'react-router-dom'
import { getMe } from '../api/directory'
import { useLoad } from '../hooks/useLoad'
import SidebarLayout, { type NavItem } from './SidebarLayout'
import { AdminIcon, BusinessIcon, DirectoryIcon, SettingsIcon } from './icons'

export default function DashboardLayout() {
  const { data: me } = useLoad(getMe, [])

  const items: NavItem[] = [
    { to: '/dashboard/business', label: 'My businesses', icon: <BusinessIcon /> },
    { to: '/dashboard/directory', label: 'Directory', icon: <DirectoryIcon /> },
    { to: '/dashboard/settings', label: 'Account', icon: <SettingsIcon /> },
  ]
  if (me?.isAdmin) items.push({ to: '/dashboard/admin', label: 'Platform admin', icon: <AdminIcon /> })

  return (
    <SidebarLayout title="My Business" items={items}>
      <Outlet />
    </SidebarLayout>
  )
}
