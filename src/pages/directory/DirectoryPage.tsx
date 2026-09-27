import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { searchBusinesses, type DirectoryFilters } from '../../api/directory'
import { EmptyState, ErrorBox, Loading, PageHeader, Stars, VerifiedBadge } from '../../components/ui'
import { BUSINESS_TYPES, labelOf, SUPPLIER_CAPABILITIES } from '../../constants/options'
import { useLoad } from '../../hooks/useLoad'
import { initials } from '../../utils/format'

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
    <div className="page">
      <PageHeader title="Directory" subtitle="Find suppliers, manufacturers, distributors, and retailers." />

      <form className="card filters" onSubmit={handleSearch}>
        <input value={draft.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search by name or description…" />
        <select value={draft.type} onChange={(e) => set({ type: e.target.value })} aria-label="Business type">
          <option value="">Any type</option>
          {BUSINESS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select value={draft.capability} onChange={(e) => set({ capability: e.target.value })} aria-label="Capability">
          <option value="">Any capability</option>
          {SUPPLIER_CAPABILITIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input value={draft.city} onChange={(e) => set({ city: e.target.value })} placeholder="City" />
        <label className="checkbox-label">
          <input type="checkbox" checked={Boolean(draft.verified_only)} onChange={(e) => set({ verified_only: e.target.checked })} />
          <span>Verified only</span>
        </label>
        <button type="submit" className="btn btn-primary btn-auto">
          Search
        </button>
      </form>

      <ErrorBox message={error} />
      {loading && !businesses ? (
        <Loading />
      ) : !businesses?.length ? (
        <EmptyState text="No businesses match. Try fewer filters." />
      ) : (
        <div className="directory-grid">
          {businesses.map((b) => (
            <Link key={b.id} to={`/dashboard/directory/${b.id}`} className="directory-card card">
              <div className="directory-card-top">
                {b.businessLogo ? (
                  <img src={b.businessLogo} alt="" className="business-logo small" />
                ) : (
                  <span className="business-logo small business-logo-fallback">{initials(b.businessName)}</span>
                )}
                <div>
                  <strong className="directory-name">{b.businessName}</strong>
                  <span className="muted small">
                    {b.businessTypes.map(labelOf).join(' · ')}
                    {b.primaryCity && ` · ${b.primaryCity}`}
                  </span>
                </div>
              </div>
              <p className="directory-description">{b.businessDescription || b.industry || 'No description yet.'}</p>
              <div className="directory-card-bottom">
                <Stars rating={b.ratingAverage} count={b.ratingCount} />
                <VerifiedBadge status={b.verificationStatus} level={b.verificationLevel} />
              </div>
              {b.capabilities.length > 0 && (
                <div className="chips">
                  {b.capabilities.slice(0, 4).map((c) => (
                    <span key={c} className="chip">
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
