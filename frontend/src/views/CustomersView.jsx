import { useState, useEffect, useMemo } from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { formatDateLabel, formatCurrencyCompact, getToneClass } from '../utils'
import LeadForm from '../components/forms/LeadForm'
import { apiFetch } from '../api'

export default function CustomersView({
  filteredCustomers,
  customers,
  teamMembers,
  selectedCustomerId,
  setSelectedCustomerId,
  customerStatuses,
  statusFilter,
  setStatusFilter,
  showCustomerForm,
  setShowCustomerForm,
  onCreateCustomer,
  currentUser,
  page,
  setPage
}) {
  const ITEMS_PER_PAGE = 5
  const [customerDetail, setCustomerDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? customers[0] ?? null

  useEffect(() => {
    if (selectedCustomer?.id) {
      fetchDetail(selectedCustomer.id)
    }
  }, [selectedCustomer?.id])

  async function fetchDetail(id) {
    setLoadingDetail(true)
    try {
      const res = await apiFetch(`/api/customers/${id}`)
      if (res.ok) {
        setCustomerDetail(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch customer detail:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const getPaginatedData = (data, p) => {
    const pageNum = p === '' || isNaN(p) ? 1 : parseInt(p, 10)
    const startIndex = (pageNum - 1) * ITEMS_PER_PAGE
    return data.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }

  const renderPagination = (totalItems, currentPage, setPage) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
    if (totalPages <= 1) return null
    return (
      <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          className="secondary-button"
          disabled={currentPage === 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <div className="pagination-jump" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Page</span>
          <input
            type="text"
            inputMode="numeric"
            value={currentPage}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              const num = parseInt(val, 10);
              if (val === '') {
                setPage('');
              } else if (!isNaN(num) && num >= 1 && num <= totalPages) {
                setPage(num);
              }
            }}
            style={{ 
              width: '40px', 
              textAlign: 'center', 
              padding: '4px 0',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              color: 'var(--text-strong)',
              fontWeight: 700,
              outline: 'none'
            }}
          />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>of {totalPages}</span>
        </div>
        <button
          type="button"
          className="secondary-button"
          disabled={currentPage === totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        >
          Next
        </button>
      </div>
    )
  }

  const paginatedCustomers = getPaginatedData(filteredCustomers, page)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // KPI Calculations for the selected customer
  const winLossRatio = customerDetail?.customer?.winLossRatio ?? '—'
  const closedWonValue = customerDetail?.customer?.closedWonValue ?? 0
  const closedLostValue = customerDetail?.customer?.closedLostValue ?? 0
  
  const globalWinLossRatio = useMemo(() => {
    const won = (customers || []).reduce((sum, c) => Number(sum) + Number(c.closedWonCount || 0), 0)
    const lost = (customers || []).reduce((sum, c) => Number(sum) + Number(c.closedLostCount || 0), 0)
    if (lost === 0) return won > 0 ? 'Win Only' : '—'
    return (won / lost).toFixed(2)
  }, [customers])

  const totalClosedWon = (customers || []).reduce((sum, c) => Number(sum) + Number(c.closedWonCount || 0), 0)
  const totalClosedLost = (customers || []).reduce((sum, c) => Number(sum) + Number(c.closedLostCount || 0), 0)

  return (
    <>
      <section className="metrics-grid metrics-grid--compact">
        <MetricCard label="Total Customers" value={customers.length.toLocaleString()} meta="Total records in database" accent="accent" />
        <MetricCard label="Win/Loss Ratio" value={globalWinLossRatio} meta="Overall sales performance" accent="surface" />
        <MetricCard label="Closed Won" value={totalClosedWon.toLocaleString()} meta="Total successful deals" accent="alt" />
        <MetricCard label="Closed Lost" value={totalClosedLost.toLocaleString()} meta="Total unsuccessful deals" accent="surface" />
      </section>

      <section className="content-grid content-grid--primary">
        <Panel
          kicker="Customer Registry"
          title="Companies"
          detail="Derived from leads and direct company entries."
          action={
            <div className="panel-inline-controls">
              <label className="filter-wrap">
                <span>Status</span>
                <select 
                  value={statusFilter} 
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="all">All</option>
                  {customerStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
          }
        >
          <div style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
            {filteredCustomers.length === 0
              ? <EmptyState title="No customers match this search" copy="Clear the search box to see the full registry." />
              : (
                <>
                  <div className="contact-list" style={{ flex: 1, alignContent: 'start' }}>
                    {paginatedCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className={`contact-card ${selectedCustomerId === customer.id ? 'is-selected' : ''}`}
                        style={{ position: 'relative' }}
                        onClick={() => setSelectedCustomerId(customer.id)}
                        onDoubleClick={() => setDetailModalOpen(true)}
                      >
                        <span 
                          className={`tone-pill ${getToneClass(customer.customerStatus)}`}
                          style={{ position: 'absolute', top: '12px', right: '12px' }}
                        >
                          {customer.customerStatus}
                        </span>
                        <div style={{ paddingRight: '100px' }}>
                          <strong>{customer.name}</strong>
                          <p>{customer.city || customer.region || '—'}</p>
                        </div>
                        <p>Owner: {customer.owner || customer.sr || '—'}</p>
                        <div className="contact-card__meta">
                          <span>{customer.branch || 'No branch'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {renderPagination(filteredCustomers.length, page, setPage)}
                </>
              )
            }
          </div>
        </Panel>

        <div className="panel-stack">
          <Panel
            kicker="Transactional history"
            title={selectedCustomer?.name ?? 'Select a customer'}
            detail="Transaction history, deal summary, and sales rep activity."
          >
            {selectedCustomer ? (
              <div className="customer-detail-view">
                <div className="section-header" style={{ marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-strong)' }}>Deal History</h4>
                </div>

                <div className="metrics-grid metrics-grid--compact" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '24px' }}>
                  <MetricCard label="W/L Ratio" value={Number(winLossRatio) ? Number(winLossRatio).toFixed(2) : winLossRatio} meta="Performance" accent="accent" />
                  <MetricCard label="Won Value" value={formatCurrencyCompact(closedWonValue)} meta="Revenue" accent="alt" />
                  <MetricCard label="Lost Value" value={formatCurrencyCompact(closedLostValue)} meta="Missed" accent="surface" />
                </div>

                {loadingDetail ? (
                  <p>Loading transactions...</p>
                ) : !customerDetail?.deals?.length ? (
                  <EmptyState title="No transactions yet" copy="This company has no deals recorded." />
                ) : (
                  <div className="admin-table-wrap" style={{ marginBottom: '24px' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Deal</th>
                          <th>Stage</th>
                          <th>Value</th>
                          <th>Owner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerDetail.deals.map(deal => (
                          <tr key={deal.id}>
                            <td className="admin-table__name">{deal.name}</td>
                            <td><span className={`tone-pill ${getToneClass(deal.stage)}`}>{deal.stage}</span></td>
                            <td>{formatCurrencyCompact(deal.value)}</td>
                            <td className="admin-table__muted">{deal.owner}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="section-header" style={{ marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-strong)' }}>Activity Log</h4>
                </div>

                {loadingDetail ? (
                  <p>Loading activities...</p>
                ) : (
                  <div className="timeline">
                    {[
                      ...(customerDetail?.activities || []).map(a => ({ ...a, timelineType: 'activity' })),
                      ...(customerDetail?.auditLogs || []).map(l => ({ ...l, timelineType: 'audit', createdAt: l.changedAt }))
                    ]
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((item, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="timeline-time">{formatDateLabel(item.createdAt)}</span>
                            <span className={`timeline-badge ${item.timelineType === 'audit' ? 'is-audit' : 'is-activity'}`}>
                              {item.timelineType === 'audit' ? 'Change' : item.type}
                            </span>
                          </div>
                          <div className="timeline-body">
                            {item.timelineType === 'audit' ? (
                              <p>
                                <strong>{item.action.replace('_', ' ')}</strong>: 
                                <span className="timeline-old">{item.oldValue}</span> → <strong>{item.newValue}</strong>
                              </p>
                            ) : (
                              <p><strong>{item.subject}</strong> - {item.owner}</p>
                            )}
                            {item.notes && <p className="timeline-notes">{item.notes}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {!customerDetail?.activities?.length && !customerDetail?.auditLogs?.length && (
                      <p className="admin-table__muted" style={{ padding: '0 10px' }}>No activity history found.</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState title="No customer selected" copy="Choose a customer from the registry to review their history." />
            )}
          </Panel>
        </div>
      </section>

      <Modal
        isOpen={showCustomerForm}
        onClose={() => setShowCustomerForm(false)}
        title="Add new customer"
        kicker="Customer entry"
      >
        <LeadForm
          teamMembers = {teamMembers}
          branch = {currentUser?.branch ?? ''}
          onCancel = {() => setShowCustomerForm(false)}
          onSubmit = {(form) =>{
            onCreateCustomer(form)
            setShowCustomerForm(false)
          }}
        />
      </Modal>

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedCustomer?.name ?? 'Company Details'}
        kicker="Record Information"
      >
        <div style={{ padding: '0 24px 24px' }}>
          <div className="detail-list">
            <div><span>Industry</span><strong>{selectedCustomer?.industry ?? '—'}</strong></div>
            <div><span>Website</span><strong>{selectedCustomer?.website ?? '—'}</strong></div>
            <div><span>Phone</span><strong>{selectedCustomer?.contactNum ?? '—'}</strong></div>
            <div><span>Owner</span><strong>{selectedCustomer?.owner ?? selectedCustomer?.sr ?? '—'}</strong></div>
            <div><span>Branch</span><strong>{selectedCustomer?.branch ?? '—'}</strong></div>
            <div><span>City/Region</span><strong>{selectedCustomer?.city || selectedCustomer?.region || '—'}</strong></div>
            <div><span>Address</span><strong>{selectedCustomer?.address ?? '—'}</strong></div>
          </div>
          <div style={{ marginTop: '24px' }}>
            <button 
              type="button" 
              className="secondary-button" 
              style={{ width: '100%' }}
              onClick={() => setDetailModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
