import { Fragment, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { cx } from '../styles'
import { useAuth } from '../useAuth'
import { LogoutIcon, MenuIcon } from './icons'
import ThemeSwitch from './ThemeSwitch'
import VerifyEmailBanner from './VerifyEmailBanner'

/** group: links with a group are listed under that heading (e.g. Selling, Business) */
export type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean; group?: string; badge?: ReactNode }

type Props = {
  title: string
  header?: ReactNode
  items: NavItem[]
  children: ReactNode
}

// Tighter on screens that are not very tall (short:), so the whole menu fits without scrolling
const navItemClass =
  'flex w-full cursor-pointer items-center gap-3 rounded-md border-0 bg-transparent px-3.5 py-2.5 text-left text-[0.92rem] font-medium whitespace-nowrap text-side-text no-underline hover:bg-side-hover hover:text-side-heading short:py-1.5 [&>svg]:shrink-0'

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
    <div className="flex min-h-screen max-md:flex-col">
      {/* Top bar with the menu button (phones only) */}
      <header className="sticky top-0 z-10 hidden items-center gap-2 bg-side px-3 py-2.5 text-side-heading max-md:flex">
        <button type="button" className="grid cursor-pointer border-0 bg-transparent p-1.5 text-inherit" onClick={() => setOpen(true)} aria-label="Open menu">
          <MenuIcon />
        </button>
        <span className="text-[1.15rem] font-extrabold">{title}</span>
      </header>

      {open && <div className="fixed inset-0 z-20 bg-black/45 md:hidden" onClick={close} />}

      <aside
        className={cx(
          // The whole sidebar scrolls (only on very short screens), with no scrollbar showing; it is dark in both themes
          'sticky top-0 flex h-dvh w-59 shrink-0 flex-col gap-1.5 overflow-y-auto bg-side px-3.5 pt-6.5 pb-5 text-side-text [color-scheme:dark] [scrollbar-width:none] short:pt-4 short:pb-3 [&::-webkit-scrollbar]:hidden',
          'max-md:fixed max-md:left-0 max-md:z-30 max-md:transition-transform',
          open ? 'max-md:shadow-2xl' : 'max-md:-translate-x-full',
        )}
      >
        {header ?? (
          <div className="flex items-center gap-2 px-3 pb-5.5 text-[1.15rem] font-extrabold text-side-heading">
            <span className="size-3.5 shrink-0 rounded bg-lime" />
            {title}
          </div>
        )}

        <nav className="flex flex-col gap-0.5">
          {items.map((item, i) => (
            <Fragment key={item.to}>
              {item.group && item.group !== items[i - 1]?.group && (
                <span className="mt-3 px-3.5 pb-0.5 text-[0.7rem] font-bold tracking-wider text-side-text/70 uppercase first:mt-0 short:mt-2">
                  {item.group}
                </span>
              )}
              <NavLink
                to={item.to}
                end={item.end}
                onClick={close}
                className={({ isActive }) => cx(navItemClass, isActive && 'bg-side-active font-semibold text-lime hover:text-lime')}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
                {item.badge && <span className="ml-auto shrink-0">{item.badge}</span>}
              </NavLink>
            </Fragment>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3.5 pt-3 short:gap-2 short:pt-2">
          <ThemeSwitch showLabels />
          <button type="button" className={cx(navItemClass, 'hover:text-white')} onClick={handleLogout}>
            <LogoutIcon />
            Log out
          </button>
          <div className="flex min-w-0 items-center gap-2.5 px-3 py-1">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="size-8 shrink-0 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lime text-[0.9rem] font-bold text-ink">
                {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate text-[0.85rem] text-side-heading">{user?.displayName || user?.email}</span>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <VerifyEmailBanner />
        {children}
      </main>
    </div>
  )
}
