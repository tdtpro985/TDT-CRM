import { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import Panel from '../components/Panel'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'

export default function AdminNotificationsView({ showToast, onLoadingChange, onCountChange }) {
  const [pendingCustomers, setPendingCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(null)

  function fetchPending() {
    let isCurrent = true
    setLoading(true)
    onLoadingChange?.(true)
    apiFetch('/api/customers/pending')
      .then(r => r.json())
      .then(d => {
        if (!isCurrent) return
        const list = Array.isArray(d) ? d : []
        setPendingCustomers(list)
        onCountChange?.(list.length)
      })
      .catch(() => { if (isCurrent) setPendingCustomers([]) })
      .finally(() => {
        if (!isCurrent) return
        setLoading(false)
        onLoadingChange?.(false)
      })
    return () => { isCurrent = false; onLoadingChange?.(false) }
  }

  useEffect(fetchPending, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleApprove(customerId, customerName) {
    setProcessing(customerId)
    try {
      const res = await apiFetch(`/api/customers/${customerId}/approve`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        showToast(d.error || 'Failed to approve customer.')
        return
      }
      showToast(`"${customerName}" approved and is now visible to the SR.`)
      fetchPending()
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject() {
    if (!rejectTarget) return
    setProcessing(rejectTarget.id)
    try {
      const res = await apiFetch(`/api/customers/${rejectTarget.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        showToast(d.error || 'Failed to reject customer.')
        return
      }
      showToast(`"${rejectTarget.customerName}" rejected.`)
      setRejectTarget(null)
      setRejectReason('')
      fetchPending()
    } finally {
      setProcessing(null)
    }
  }

  return (
    <>
      <Panel kicker="Approval Queue" title="Pending Customer Approvals" detail="Customers submitted by SRs awaiting your decision.">
        {loading ? (
          <p className="u-pad-24 u-text-center u-text-muted">Loading…</p>
        ) : pendingCustomers.length === 0 ? (
          <EmptyState title="All caught up" copy="No pending customers to review." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Branch</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>SR</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Submitted</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Reviews</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingCustomers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <strong>{c.customerName}</strong>
                      {c.address && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-muted)' }}>{c.address}</div>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{c.branch}</td>
                    <td style={{ padding: '10px 12px' }}>{c.sr || '—'}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--color-muted)' }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {c.endorsements?.length === 0 && (
                        <span style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>No reviews yet</span>
                      )}
                      {c.endorsements?.map((e, i) => (
                        <div key={i} style={{ marginBottom: '2px' }}>
                          <span style={{ color: e.action === 'endorsed' ? 'var(--color-success, #22c55e)' : 'var(--color-warning, #f59e0b)', fontWeight: 600 }}>
                            {e.action === 'endorsed' ? '✓ Looks Good' : '⚑ Flagged'}
                          </span>
                          {' '}by <strong>{e.reviewerName}</strong>
                          <span style={{ color: 'var(--color-muted)', fontSize: 'var(--fs-xs)' }}>
                            {' '}({e.reviewerRole === 'Regional Sales Manager' ? 'RSM' : 'HOS'})
                          </span>
                          {e.notes && (
                            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-muted)', fontStyle: 'italic' }}>
                              "{e.notes}"
                            </div>
                          )}
                        </div>
                      ))}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="primary-button"
                          style={{ fontSize: 'var(--fs-xs)', padding: '4px 12px' }}
                          disabled={processing === c.id}
                          onClick={() => handleApprove(c.id, c.customerName)}
                        >
                          {processing === c.id ? '…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          style={{ fontSize: 'var(--fs-xs)', padding: '4px 12px', color: 'var(--color-danger, #ef4444)' }}
                          disabled={processing === c.id}
                          onClick={() => { setRejectTarget(c); setRejectReason('') }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {rejectTarget && (
        <Modal
          isOpen={!!rejectTarget}
          onClose={() => { setRejectTarget(null); setRejectReason('') }}
          title={`Reject "${rejectTarget.customerName}"?`}
          kicker="Confirm Rejection"
        >
          <div className="form-body">
            <label className="field field--span-2">
              <span>Reason (optional)</span>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Enter a reason for rejection…"
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </label>
            <div className="form-actions field--span-2">
              <button
                type="button"
                className="primary-button"
                style={{ background: 'var(--color-danger, #ef4444)' }}
                disabled={!!processing}
                onClick={handleReject}
              >
                {processing ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => { setRejectTarget(null); setRejectReason('') }}
                disabled={!!processing}
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
