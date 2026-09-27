import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { searchBusinesses, type DirectoryFilters } from '../../api/directory'
import { BusinessLogo, EmptyState, ErrorBox, Loading, PageHeader, Stars, VerifiedBadge } from '../../components/ui'
import { BUSINESS_TYPES, labelOf, SUPPLIER_CAPABILITIES } from '../../constants/options'
import { useLoad } from '../../hooks/useLoad'
import { cx, ui } from '../../styles'

// Filter inputs share one row and shrink to fit
const filterInput = cx(ui.input, 'w-auto min-w-37.5 flex-1')

const EMPTY_FILTERS: DirectoryFilters = { q: '', type: '', capability: '', city: '', verified_only: false }

export default function DirectoryPage() {
  // `draft` is what the user is typing; `filters` is what was last searched
  const [draft, setDraft] = useState<DirectoryFilters>(EMPTY_FILTERS)
  const [filters, setFilters] = useState<DirectoryFilters>(EMPTY_FILTERS)
  const { data: businesses, loading, error } = useLoad(() => searchBusinesses(filters), [filters])

  const set = (changes: Partial<DirectoryFilters>) => setDraft((d) => ({ ...d, ...changes }))
  function handleSearch(e: FormEvent) {
    e.preventDefault()
    setFilters(draft)
  }

  return (
    <div className={ui.page}>
      <PageHeader title="Directory" subtitle="Find suppliers, manufacturers, distributors, and retailers." />

      <form className={cx(ui.card, 'flex flex-wrap items-center gap-2.5 px-4 py-3.5')} onSubmit={handleSearch}>
        <input className={filterInput} value={draft.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search by name or description…" />
        <select className={filterInput} value={draft.type} onChange={(e) => set({ type: e.target.value })} aria-label="Business type">
          <option value="">Any type</option>
          {BUSINESS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select className={filterInput} value={draft.capability} onChange={(e) => set({ capability: e.target.value })} aria-label="Capability">
          <option value="">Any capability</option>
          {SUPPLIER_CAPABILITIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input className={filterInput} value={draft.city} onChange={(e) => set({ city: e.target.value })} placeholder="City" />
        <label className={ui.checkboxLabel}>
          <input type="checkbox" className={ui.checkbox} checked={Boolean(draft.verified_only)} onChange={(e) => set({ verified_only: e.target.checked })} />
          <span>Verified only</span>
        </label>
        <button type="submit" className={ui.btnPrimary}>
          Search
        </button>
      </form>

      <ErrorBox message={error} />
      {loading && !businesses ? (
        <Loading />
      ) : !businesses?.length ? (
        <EmptyState text="No businesses match. Try fewer filters." />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4">
          {businesses.map((b) => (
            <Link key={b.id} to={`/dashboard/directory/${b.id}`} className={cx(ui.card, 'flex flex-col gap-2.5 p-4.5 text-inherit no-underline transition hover:-translate-y-0.5 hover:border-accent')}>
              <div className="flex items-center gap-3">
                <BusinessLogo name={b.businessName} src={b.businessLogo} small />
                <div className="flex min-w-0 flex-col">
                  <strong className="text-[1.02rem] text-heading">{b.businessName}</strong>
                  <span className="text-[0.82rem] text-muted">
                    {b.businessTypes.map(labelOf).join(' · ')}
                    {b.primaryCity && ` · ${b.primaryCity}`}
                  </span>
                </div>
              </div>
              <p className="line-clamp-3 text-[0.88rem]">{b.businessDescription || b.industry || 'No description yet.'}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                <Stars rating={b.ratingAverage} count={b.ratingCount} />
                <VerifiedBadge status={b.verificationStatus} level={b.verificationLevel} />
              </div>
              {b.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {b.capabilities.slice(0, 4).map((c) => (
                    <span key={c} className={ui.chip}>
                      {SUPPLIER_CAPABILITIES.find((o) => o.value === c)?.label ?? c}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
