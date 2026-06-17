import { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import { getPaginatedData } from '../utils'
import Panel from '../components/Panel'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'

const ITEMS_PER_PAGE = 20

export default function AdminCustomersView({ activeBranch, activeRegion, showToast, onLoadingChange }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    let isCurrent = true
    setLoading(true)
    setPage(1)
    onLoadingChange?.(true)

    const params = new URLSearchParams()
    if (activeBranch) params.set('branch', activeBranch)
    if (activeRegion) params.set('region', activeRegion)
    const query = params.toString() ? `?${params.toString()}` : ''

    apiFetch(`/api/customers${query}`)
      .then(r => r.json())
      .then(d => {
        if (!isCurrent) return
        setCustomers(Array.isArray(d) ? d : [])
      })
      .catch(() => { if (isCurrent) setCustomers([]) })
      .finally(() => {
        if (!isCurrent) return
        setLoading(false)
        onLoadingChange?.(false)
      })

    return () => { isCurrent = false; onLoadingChange?.(false) }
  }, [activeBranch, activeRegion]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.trim().toLowerCase()
  const filtered = q
    ? customers.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.branch || '').toLowerCase().includes(q) ||
        (c.region || '').toLowerCase().includes(q) ||
        (c.sr || '').toLowerCase().includes(q)
      )
    : customers

  const paginatedCustomers = getPaginatedData(filtered, page, ITEMS_PER_PAGE)
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)

  async function handleDelete() {
    if (!deleteTarget) return
    setProcessing(true)
    try {
      const res = await apiFetch(`/api/admin/customers/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        showToast(d.error || 'Failed to delete customer.')
        return
      }
      showToast(`"${deleteTarget.name}" deleted.`)
      setCustomers(cur => cur.filter(c => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <>
      <Panel
        kicker="All Branches"
        title="Customer Database"
        detail={`${filtered.length} customer${filtered.length !== 1 ? 's' : ''}${q ? ' matching search' : ''}`}
        action={
          <input
            type="search"
            placeholder="Search customers…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 'var(--fs-sm)', width: '200px' }}
          />
        }
      >
        {loading ? (
          <p className="u-pad-24 u-text-center u-text-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="No customers found" copy={q ? 'Try a different search term.' : 'No customers in this scope.'} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Branch</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Region</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>SR</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Deals</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <strong>{c.name}</strong>
                      {c.address && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-muted)' }}>{c.address}</div>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{c.branch || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{c.region || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{c.sr || '—'}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      {Number(c.activeDealCount) > 0 && (
                        <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{c.activeDealCount} active</span>
                      )}
                      {Number(c.activeDealCount) > 0 && Number(c.totalDealCount) > 0 && ' / '}
                      {Number(c.totalDealCount) > 0 && <span style={{ color: 'var(--color-muted)' }}>{c.totalDealCount} total</span>}
                      {!Number(c.totalDealCount) && <span style={{ color: 'var(--color-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        type="button"
                        className="ghost-button"
                        style={{ fontSize: 'var(--fs-xs)', padding: '4px 12px', color: 'var(--color-danger, #ef4444)' }}
                        onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Panel>

      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title={`Delete "${deleteTarget.name}"?`}
          kicker="Confirm Deletion"
        >
          <div className="form-body">
            <p className="field--span-2" style={{ color: 'var(--color-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>
              This will permanently delete the customer, all their deals, contacts, and activities across <strong>all accounts</strong>. This cannot be undone.
            </p>
            <div className="form-actions field--span-2">
              <button
                type="button"
                className="primary-button"
                style={{ background: 'var(--color-danger, #ef4444)' }}
                disabled={processing}
                onClick={handleDelete}
              >
                {processing ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDeleteTarget(null)}
                disabled={processing}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
