import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../useAuth'
import { LogoutIcon, MenuIcon } from './icons'

export type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean }

type Props = {
  title: string
  header?: ReactNode
  items: NavItem[]
  children: ReactNode
}

export default function SidebarLayout({ title, header, items, children }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await signOut(auth)
    navigate('/login', { replace: true })
  }

  const close = () => setOpen(false)

  return (
    <div className="dashboard">
      <header className="mobile-bar">
        <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
          <MenuIcon />
        </button>
        <span className="brand">{title}</span>
      </header>

      {open && <div className="backdrop" onClick={close} />}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        {header ?? <div className="brand sidebar-brand">{title}</div>}

        <nav className="nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-item" onClick={close}>
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="nav-item logout" onClick={handleLogout}>
            <LogoutIcon />
            Log out
          </button>
          <div className="sidebar-user">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="avatar" referrerPolicy="no-referrer" />
            ) : (
              <span className="avatar avatar-fallback">
                {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <span className="sidebar-user-name">{user?.displayName || user?.email}</span>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">{children}</main>
    </div>
  )
}
