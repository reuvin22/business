// Small building blocks used across pages.
import { useState, type ReactNode } from 'react'
import { labelOf } from '../constants/options'
import type { Tab } from '../hooks/useTab'

export function Loading({ text = 'Loading…' }: { text?: string }) {
  return <p className="loading">{text}</p>
}

export function ErrorBox({ message }: { message: string }) {
  return message ? <p className="alert alert-error pre-line">{message}</p> : null
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  )
}

export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <p>{text}</p>
      {action}
    </div>
  )
}

// Colors for status values. Anything not listed is grey.
const GOOD = ['ACTIVE', 'VERIFIED', 'IN_STOCK', 'PAID', 'COMPLETED', 'DELIVERED', 'PUBLISHED', 'CONFIRMED', 'OPEN']
const WAITING = ['PENDING', 'DRAFT', 'LOW_STOCK', 'PARTIALLY_PAID', 'UNPAID', 'SHIPPED', 'UNVERIFIED']
const BAD = ['REJECTED', 'CANCELLED', 'SUSPENDED', 'EXPIRED', 'OUT_OF_STOCK', 'DECLINED', 'CLOSED', 'REFUNDED']

export function Badge({ value, label }: { value: string | null | undefined; label?: string }) {
  if (!value) return null
  const tone = GOOD.includes(value) ? 'good' : WAITING.includes(value) ? 'wait' : BAD.includes(value) ? 'bad' : 'plain'
  return <span className={`badge badge-${tone}`}>{label ?? labelOf(value)}</span>
}

export function VerifiedBadge({ status, level }: { status: string; level?: string | null }) {
  if (status !== 'VERIFIED') return null
  return <span className="badge badge-good">✓ {level ? `${labelOf(level)} verified` : 'Verified'}</span>
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  if (!count && !rating) return <span className="muted">No reviews yet</span>
  return (
    <span className="stars" title={`${rating.toFixed(1)} out of 5`}>
      {'★'.repeat(Math.round(rating))}
      <span className="stars-off">{'★'.repeat(5 - Math.round(rating))}</span>
      <span className="muted"> {rating.toFixed(1)}{count !== undefined ? ` (${count})` : ''}</span>
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
      <button type="button" className={`link${danger ? ' danger' : ''}`} onClick={() => setAsking(true)} disabled={disabled}>
        {label}
      </button>
    )
  }
  return (
    <span className="confirm-inline">
      <button
        type="button"
        className="link danger"
        disabled={busy}
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
        {confirmLabel}
      </button>
      <button type="button" className="link" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  )
}

export function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          className={active === tab.key ? 'active' : undefined}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
