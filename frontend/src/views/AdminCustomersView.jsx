import { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import { getPaginatedData } from '../utils'
import Panel from '../components/Panel'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'

const ITEMS_PER_PAGE = 20

const EMPTY_EDIT = { industry: '', website: '', address: '', contact_num: '' }

export default function AdminCustomersView({ activeBranch, activeRegion, showToast, onLoadingChange }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [processing, setProcessing] = useState(false)

  // Detail modal
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

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

  async function openDetail(customerId) {
    setDetail(null)
    setEditing(false)
    setEditError('')
    setDetailLoading(true)
    try {
      const res = await apiFetch(`/api/customers/${customerId}`)
      if (res.ok) {
        const data = await res.json()
        setDetail(data)
        const c = data.customer
        setEditForm({
          industry: c.industry || '',
          website: c.website || '',
          address: c.address || '',
          contact_num: c.contactNum || '',
        })
      }
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setDetail(null)
    setEditing(false)
    setEditError('')
  }

  async function handleSaveEdit() {
    if (!detail) return
    setEditSaving(true)
    setEditError('')
    try {
      const res = await apiFetch(`/api/companies/${detail.customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          industry: editForm.industry,
          website: editForm.website,
          address: editForm.address,
          contact_num: editForm.contact_num,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setEditError(d.error || 'Failed to save changes.')
        return
      }
      showToast?.(`"${detail.customer.name}" updated.`)
      setEditing(false)
      // Refresh detail
      const refreshed = await apiFetch(`/api/customers/${detail.customer.id}`)
      if (refreshed.ok) setDetail(await refreshed.json())
    } finally {
      setEditSaving(false)
    }
  }

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
      if (detail?.customer?.id === deleteTarget.id) closeDetail()
    } finally {
      setProcessing(false)
    }
  }

  const c = detail?.customer

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
            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 'var(--fs-sm)', width: '200px' }}
          />
        }
      >
        {loading ? (
          <p className="u-pad-24 u-text-center u-text-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="No customers found" copy={q ? 'Try a different search term.' : 'No customers in this scope.'} />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Branch</th>
                  <th>Region</th>
                  <th>SR</th>
                  <th>Deals</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map(row => (
                  <tr
                    key={row.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openDetail(row.id)}
                  >
                    <td>
                      <strong>{row.name}</strong>
                      {row.address && <div className="u-fs-xs u-text-muted u-margin-t-2">{row.address}</div>}
                    </td>
                    <td>{row.branch || '—'}</td>
                    <td>{row.region || '—'}</td>
                    <td>{row.sr || '—'}</td>
                    <td className="u-fs-xs" style={{ whiteSpace: 'nowrap' }}>
                      {Number(row.activeDealCount) > 0 && (
                        <span className="u-text-accent u-font-600">{row.activeDealCount} active</span>
                      )}
                      {Number(row.activeDealCount) > 0 && Number(row.totalDealCount) > 0 && ' / '}
                      {Number(row.totalDealCount) > 0 && <span className="u-text-muted">{row.totalDealCount} total</span>}
                      {!Number(row.totalDealCount) && <span className="u-text-muted">—</span>}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className="ghost-button u-fs-xs u-alert"
                        onClick={() => setDeleteTarget({ id: row.id, name: row.name })}
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

      {/* Company Detail Modal */}
      <Modal
        isOpen={!!detail || detailLoading}
        onClose={closeDetail}
        title={c?.name ?? 'Loading…'}
        kicker="Company Details"
      >
        {detailLoading ? (
          <p className="u-pad-16 u-text-muted">Loading…</p>
        ) : c ? (
          <div className="u-pad-0-24-24">
            {/* Info fields */}
            <div className="detail-list">
              <div><span>SR</span><strong>{c.sr ?? '—'}</strong></div>
              <div><span>Branch</span><strong>{c.branch ?? '—'}</strong></div>
              <div><span>Region</span><strong>{c.region ?? '—'}</strong></div>
              {editing ? (
                <>
                  <div>
                    <span>Address</span>
                    <input className="modal-edit-input" value={editForm.address}
                      onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Address" />
                  </div>
                  <div>
                    <span>Contact No.</span>
                    <input className="modal-edit-input" value={editForm.contact_num}
                      onChange={e => setEditForm(f => ({ ...f, contact_num: e.target.value }))} placeholder="+63…" />
                  </div>
                  <div>
                    <span>Industry</span>
                    <input className="modal-edit-input" value={editForm.industry}
                      onChange={e => setEditForm(f => ({ ...f, industry: e.target.value }))} placeholder="e.g. Construction" />
                  </div>
                  <div>
                    <span>Website</span>
                    <input className="modal-edit-input" value={editForm.website}
                      onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} placeholder="https://…" />
                  </div>
                </>
              ) : (
                <>
                  <div><span>Address</span><strong>{c.address ?? '—'}</strong></div>
                  <div><span>Contact No.</span><strong>{c.contactNum ?? '—'}</strong></div>
                  <div><span>Industry</span><strong>{c.industry ?? '—'}</strong></div>
                  <div><span>Website</span><strong>{c.website ?? '—'}</strong></div>
                </>
              )}
            </div>

            {/* Deal stats */}
            <div className="u-margin-t-16 u-margin-b-8" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span className="admin-role-pill admin-role-pill--accent">{c.activeDealCount ?? 0} active deals</span>
              <span className="admin-role-pill admin-role-pill--positive">{c.closedWonCount ?? 0} won</span>
              <span className="admin-role-pill admin-role-pill--warning">{c.closedLostCount ?? 0} lost</span>
            </div>

            {/* Contacts */}
            {detail.contacts?.length > 0 && (
              <>
                <h4 className="u-margin-t-24 u-margin-b-8 u-text-strong u-fs-sm">Contacts</h4>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th></tr>
                    </thead>
                    <tbody>
                      {detail.contacts.map(ct => (
                        <tr key={ct.id}>
                          <td className="u-font-600">{ct.name}</td>
                          <td className="u-text-muted">{ct.role || '—'}</td>
                          <td className="u-text-muted">{ct.email || '—'}</td>
                          <td className="u-text-muted">{ct.phone || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {editError && <p className="u-fs-xs u-alert u-margin-t-8">{editError}</p>}

            {/* Actions */}
            <div className="u-margin-t-24" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {editing ? (
                <>
                  <button type="button" className="primary-button" disabled={editSaving} onClick={handleSaveEdit}>
                    {editSaving ? 'Saving…' : 'Save changes'}
                  </button>
                  <button type="button" className="secondary-button" onClick={() => { setEditing(false); setEditError('') }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="secondary-button" onClick={() => setEditing(true)}>Edit details</button>
                  <button type="button" className="ghost-button u-alert"
                    onClick={() => { setDeleteTarget({ id: c.id, name: c.name }); closeDetail() }}>
                    Delete company
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title={`Delete "${deleteTarget.name}"?`}
          kicker="Confirm Deletion"
        >
          <div className="form-body">
            <p className="field--span-2" style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>
              This will permanently delete the customer, all their deals, contacts, and activities across <strong>all accounts</strong>. This cannot be undone.
            </p>
            <div className="form-actions field--span-2">
              <button type="button" className="primary-button" style={{ background: 'var(--alert)' }}
                disabled={processing} onClick={handleDelete}>
                {processing ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button type="button" className="secondary-button" onClick={() => setDeleteTarget(null)} disabled={processing}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
