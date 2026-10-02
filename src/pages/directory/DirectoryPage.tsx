import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { searchBusinesses, type DirectoryFilters } from '../../api/directory'
import { BusinessCover, EmptyState, ErrorBox, Loading, PageHeader, Stars, VerifiedBadge } from '../../components/ui'
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 max-sm:grid-cols-2 max-sm:gap-3">
          {businesses.map((b) => (
            <Link
              key={b.id}
              to={`/dashboard/directory/${b.id}`}
              className="group flex flex-col overflow-hidden rounded-[10px] border border-line bg-surface text-inherit no-underline transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg"
            >
              <BusinessCover name={b.businessName} src={b.businessLogo} />
              <div className="flex flex-1 flex-col gap-1.5 p-3.5 max-sm:p-3">
                <strong className="line-clamp-2 text-[1rem] leading-snug text-heading group-hover:text-accent">{b.businessName}</strong>
                <span className="line-clamp-1 text-[0.8rem] text-muted">
                  {b.businessTypes.map(labelOf).join(' · ')}
                  {b.primaryCity && ` · ${b.primaryCity}`}
                </span>
                <p className="line-clamp-2 text-[0.85rem] max-sm:hidden">{b.businessDescription || b.industry || 'No description yet.'}</p>
                {b.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-sm:hidden">
                    {b.capabilities.slice(0, 3).map((c) => (
                      <span key={c} className={ui.chip}>
                        {SUPPLIER_CAPABILITIES.find((o) => o.value === c)?.label ?? c}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1.5">
                  <Stars rating={b.ratingAverage} count={b.ratingCount} />
                  <VerifiedBadge status={b.verificationStatus} level={b.verificationLevel} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
