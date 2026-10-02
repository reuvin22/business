// Small building blocks used across pages.
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { labelOf } from '../constants/options'
import type { Tab } from '../hooks/useTab'
import { cx, ui } from '../styles'
import { initials } from '../utils/format'
import { isVideo } from '../utils/media'

/** A small spinning circle in the current text color. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx('inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
    />
  )
}

/**
 * A button for an action that talks to the server (save, add, delete...). While `busy` it shows a
 * spinner (and `busyLabel`, e.g. "Saving…") and cannot be clicked again, so nothing is sent twice.
 *
 *   const [saving, run] = useBusy()
 *   <BusyButton busy={saving} busyLabel="Saving…" className={ui.btnPrimary} onClick={() => run(save)}>Save</BusyButton>
 */
export function BusyButton({
  busy,
  busyLabel,
  children,
  disabled,
  type = 'button',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy: boolean; busyLabel?: string }) {
  return (
    <button
      type={type}
      {...props}
      // inline-flex puts the spinner next to the text, also on link-style buttons
      className={cx('inline-flex items-center gap-1.5', className)}
      disabled={disabled || busy}
      aria-busy={busy}
    >
      {busy && <Spinner />}
      {busy && busyLabel ? busyLabel : children}
    </button>
  )
}

const MODAL_WIDTHS = { sm: 'max-w-lg', md: 'max-w-3xl', lg: 'max-w-5xl', xl: 'max-w-7xl' }

/**
 * A dialog over the page, so forms never push the page around. Closes with Escape or `onClose`
 * (and a click outside, unless `closeOnBackdrop` is false, e.g. for long forms).
 * Drawn at the end of <body> (a "portal"), so it is never cut off by the page layout.
 * Tall content scrolls inside the dark overlay.
 */
export function Modal({
  title,
  onClose,
  children,
  size = 'sm',
  closeOnBackdrop = true,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  size?: keyof typeof MODAL_WIDTHS
  closeOnBackdrop?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden' // the page behind does not scroll
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = scroll
    }
  }, [onClose])

  return createPortal(
    // flex + my-auto: centered when it fits, scrolls from the top when it is taller than the screen
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/45 p-4 sm:p-8"
      onMouseDown={closeOnBackdrop ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className={cx('my-auto w-full rounded-xl bg-surface shadow-xl', MODAL_WIDTHS[size])}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function Loading({ text = 'Loading…' }: { text?: string }) {
  return <p className="py-4 text-muted">{text}</p>
}

export function ErrorBox({ message }: { message: string }) {
  return message ? <p className={ui.alertError}>{message}</p> : null
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className={ui.h1}>{title}</h1>
        {subtitle && <p className={ui.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}

export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[10px] border-2 border-dashed border-line px-4 py-14 text-center text-muted">
      <p>{text}</p>
      {action}
    </div>
  )
}

// Colors for status values. Anything not listed is grey.
const GOOD = ['ACTIVE', 'VERIFIED', 'IN_STOCK', 'PAID', 'COMPLETED', 'DELIVERED', 'PUBLISHED', 'CONFIRMED', 'OPEN']
const WAITING = ['PENDING', 'DRAFT', 'LOW_STOCK', 'PARTIALLY_PAID', 'UNPAID', 'SHIPPED', 'UNVERIFIED']
const BAD = ['REJECTED', 'CANCELLED', 'SUSPENDED', 'EXPIRED', 'OUT_OF_STOCK', 'DECLINED', 'CLOSED', 'REFUNDED']

const badgeBase = 'inline-block rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold whitespace-nowrap'

export function Badge({ value, label }: { value: string | null | undefined; label?: string }) {
  if (!value) return null
  const colors = GOOD.includes(value)
    ? 'bg-info-soft text-info'
    : WAITING.includes(value)
      ? 'bg-warn-soft text-warn'
      : BAD.includes(value)
        ? 'bg-danger-soft text-danger'
        : 'bg-chip text-muted'
  return <span className={cx(badgeBase, colors)}>{label ?? labelOf(value)}</span>
}

/** Shows that the numbers next to it update by themselves. */
export function LiveBadge() {
  return (
    <span className={cx(badgeBase, 'inline-flex items-center gap-1.5 bg-info-soft text-info')} title="Updates by itself">
      <span className="size-1.5 animate-pulse rounded-full bg-info" />
      Live
    </span>
  )
}

export function VerifiedBadge({ status, level }: { status: string; level?: string | null }) {
  if (status !== 'VERIFIED') return null
  return (
    <span className={cx(badgeBase, 'bg-info-soft text-info')}>✓ {level ? `${labelOf(level)} verified` : 'Verified'}</span>
  )
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  if (!count && !rating) return <span className="text-muted">No reviews yet</span>
  return (
    <span className="tracking-[1px] whitespace-nowrap text-star" title={`${rating.toFixed(1)} out of 5`}>
      {'★'.repeat(Math.round(rating))}
      <span className="text-line">{'★'.repeat(5 - Math.round(rating))}</span>
      <span className="tracking-normal text-muted">
        {' '}
        {rating.toFixed(1)}
        {count !== undefined ? ` (${count})` : ''}
      </span>
    </span>
  )
}

/** A button that asks "Confirm?" before running a destructive action. */
export function ConfirmButton({
  label,
  confirmLabel = 'Confirm',
  onConfirm,
  danger = true,
  disabled,
}: {
  label: string
  confirmLabel?: string
  onConfirm: () => Promise<unknown> | void
  danger?: boolean
  disabled?: boolean
}) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!asking) {
    return (
      <button type="button" className={danger ? ui.linkDanger : ui.link} onClick={() => setAsking(true)} disabled={disabled}>
        {label}
      </button>
    )
  }
  return (
    <span className="inline-flex gap-3">
      <button
        type="button"
        className={cx(ui.linkDanger, 'inline-flex items-center gap-1.5')}
        disabled={busy}
        aria-busy={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await onConfirm()
          } finally {
            setBusy(false)
            setAsking(false)
          }
        }}
      >
        {busy && <Spinner className="size-3" />}
        {confirmLabel}
      </button>
      <button type="button" className={ui.link} onClick={() => setAsking(false)} disabled={busy}>
        Cancel
      </button>
    </span>
  )
}

export function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          className={cx(
            '-mb-px cursor-pointer border-0 border-b-2 bg-transparent px-3.5 py-2.5 text-[0.9rem] font-semibold whitespace-nowrap',
            active === tab.key ? 'border-accent text-heading' : 'border-transparent text-muted hover:text-heading',
          )}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ---- Tables ------------------------------------------------------------------------------
//   <Table head={<><Th>Name</Th><Th num>Price</Th></>}>
//     <tr><Td strong>Cola</Td><Td num>120</Td></tr>
//   </Table>

export function Table({ head, children, foot }: { head: ReactNode; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className={ui.tableWrap}>
      <table className={ui.table}>
        <thead>
          <tr>{head}</tr>
        </thead>
        <tbody>{children}</tbody>
        {foot && <tfoot>{foot}</tfoot>}
      </table>
    </div>
  )
}

export function Th({ children, num, label }: { children?: ReactNode; num?: boolean; label?: string }) {
  return (
    <th className={cx(ui.th, num && ui.num)} aria-label={label}>
      {children}
    </th>
  )
}

type TdProps = {
  children?: ReactNode
  num?: boolean // right-aligned number
  strong?: boolean // darker, bold text
  wrap?: boolean // allow long text to wrap
  actions?: boolean // right-aligned action links
  colSpan?: number
  className?: string
}

export function Td({ children, num, strong, wrap, actions, colSpan, className }: TdProps) {
  return (
    <td className={cx(ui.td, num && ui.num, strong && ui.strong, wrap && ui.wrap, actions && ui.actions, className)} colSpan={colSpan}>
      {children}
    </td>
  )
}

/** The business's logo, or its first letter when it has no logo. */
export function BusinessLogo({ name, src, small }: { name: string; src: string; small?: boolean }) {
  const size = small ? 'size-11 rounded-[10px] text-base' : 'size-16 rounded-[14px] text-[1.4rem]'
  const [failed, setFailed] = useState(false) // a link that no longer works shows the letters instead
  if (src && !failed) return <img src={src} alt="" onError={() => setFailed(true)} className={cx(size, 'shrink-0 object-cover')} />
  return <span className={cx(size, 'grid shrink-0 place-items-center bg-chip font-extrabold text-accent')}>{initials(name)}</span>
}

/** The business's logo as the big square picture of a card, or its initials when it has none. */
export function BusinessCover({ name, src }: { name: string; src: string }) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="block aspect-square w-full bg-chip object-cover" />
  }
  return (
    <span className="grid aspect-square w-full place-items-center bg-chip text-[3rem] font-extrabold tracking-wide text-accent" aria-hidden="true">
      {initials(name)}
    </span>
  )
}

const THUMB_SIZES = {
  sm: 'size-10 rounded-md',
  md: 'size-16 rounded-lg',
  lg: 'aspect-square w-full max-w-80 rounded-xl',
}

/** A product's primary image, or a grey placeholder when it has none (images are optional; videos are skipped). */
export function ProductThumb({
  images,
  size = 'sm',
}: {
  images: { imageUrl: string; isPrimary: boolean; mediaType?: string }[]
  size?: keyof typeof THUMB_SIZES
}) {
  const photos = images.filter((i) => !isVideo(i))
  const image = photos.find((i) => i.isPrimary) ?? photos[0]
  if (image) return <img src={image.imageUrl} alt="" loading="lazy" className={cx(THUMB_SIZES[size], 'shrink-0 bg-chip object-cover')} />
  return (
    <span className={cx(THUMB_SIZES[size], 'grid shrink-0 place-items-center bg-chip text-muted')} aria-label="No image">
      <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    </span>
  )
}
