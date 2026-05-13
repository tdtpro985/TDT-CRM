import { useState, useEffect, useMemo } from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { formatDateLabel, formatCurrencyCompact, getToneClass, createRecordId } from '../utils'
import LeadForm from '../components/forms/LeadForm'
import TaskForm from '../components/forms/TaskForm'
import { apiFetch } from '../api'

export default function CustomersView({
  filteredCustomers,
  customers,
  deals,
  companies,
  teamMembers,
  selectedCustomerId,
  setSelectedCustomerId,
  customerStatuses,
  statusFilter,
  setStatusFilter,
  showCustomerForm,
  setShowCustomerForm,
  onCreateCustomer,
  onCreateTask,
  currentUser,
  page,
  setPage
}) {
  const ITEMS_PER_PAGE = 5
  const [customerDetail, setCustomerDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showQuickTaskForm, setShowQuickTaskForm] = useState(false)

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
  const [companyContacts, setCompanyContacts] = useState([])

  // Recency mapping for dot indicator
  const companyLastTouch = useMemo(() => {
    const map = {}
    for (const d of (deals || [])) {
      if (d.companyId && d.lastTouch) {
        const t = new Date(d.lastTouch)
        if (!map[d.companyId] || t > map[d.companyId]) {
          map[d.companyId] = t
        }
      }
    }
    return map
  }, [deals])

  function getRecencyColor(customer) {
    const touch = companyLastTouch[customer.id]
    if (!touch || Number(customer.totalDealCount || 0) === 0) return 'var(--text-muted)'
    
    const now = new Date()
    const diffDays = (now - touch) / (1000 * 60 * 60 * 24)
    
    if (diffDays > 30) return 'var(--alert)'   // Red: Stale (> 30 days)
    if (diffDays > 7) return 'var(--warning)' // Yellow: Aging (8-30 days)
    return 'var(--positive)'                  // Green: Recent (<= 7 days)
  }

  useEffect(() => {
    if (customerDetail?.contacts) {
      setCompanyContacts(customerDetail.contacts.map(c => ({ ...c, isEditing: false, isNew: false })))
    } else {
      setCompanyContacts([])
    }
  }, [customerDetail?.contacts])

  // KPI Calculations for the summary cards
  const activeDealSum = useMemo(() =>
    (customers || []).reduce((sum, c) => sum + Number(c.activeDealCount || 0), 0)
  , [customers])

  const coldCompanyCount = useMemo(() => {
    const deadline = new Date()
    deadline.setDate(deadline.getDate() - 30)
    // companyId -> newest lastTouch date
    const touchMap = {}
    for (const d of (deals || [])) {
      if (d.companyId && d.lastTouch) {
        const t = new Date(d.lastTouch)
        if (!touchMap[d.companyId] || t > touchMap[d.companyId]) {
          touchMap[d.companyId] = t
        }
      }
    }
    return (customers || []).filter(c =>
      Number(c.totalDealCount || 0) === 0 ||
      !touchMap[c.id] ||
      touchMap[c.id] < deadline
    ).length
  }, [customers, deals])

  const winLossRatio = customerDetail?.customer?.winLossRatio ?? '—'
  const closedWonValue = customerDetail?.customer?.closedWonValue ?? 0
  const closedLostValue = customerDetail?.customer?.closedLostValue ?? 0

  const hasHistory = (customerDetail?.deals?.length > 0) || 
                     (customerDetail?.activities?.length > 0) || 
                     (customerDetail?.auditLogs?.length > 0)

  return (
    <>
      <section className="metrics-grid metrics-grid--compact" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <MetricCard label="Total Customers" value={customers.length.toLocaleString()} meta="Total records" accent="accent" />
        <MetricCard label="Active Deals" value={activeDealSum.toLocaleString()} meta="Currently in pipeline" accent="alt" />
        <MetricCard label="Cold Companies" value={coldCompanyCount.toLocaleString()} meta="No recent deal activity" accent="surface" />
      </section>

      <section className="content-grid content-grid--primary" style={{ gridTemplateColumns: '45fr 55fr' }}>
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
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '18px',
                            right: '18px',
                            background: getRecencyColor(customer),
                            boxShadow: `0 0 8px ${getRecencyColor(customer)}`,
                            opacity: 0.8
                          }}
                          title={companyLastTouch[customer.id] ? `Last activity: ${formatDateLabel(companyLastTouch[customer.id])}` : 'No recorded activity'}
                        />
                        <div style={{ paddingRight: '34px' }}>
                          <strong style={{ fontSize: 'var(--fs-md)', color: 'var(--text-strong)', display: 'block' }}>
                            {customer.name}
                          </strong>
                          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                            {customer.city || customer.region || '—'}
                          </p>
                        </div>
                        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{customer.branch || 'No branch'}</span>
                          {customer.industry && (
                            <>
                              <span style={{ opacity: 0.5 }}>•</span>
                              <span>{customer.industry}</span>
                            </>
                          )}
                          {Number(customer.activeDealCount) > 0 && (
                            <>
                              <span style={{ opacity: 0.5 }}>•</span>
                              <span style={{ color: 'var(--accent-strong)', fontWeight: 600 }}>
                                {customer.activeDealCount} active
                              </span>
                            </>
                          )}
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
                {loadingDetail ? (
                  <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading records...</p>
                ) : !hasHistory ? (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '64px 24px',
                    textAlign: 'center' 
                  }}>
                    <h4 style={{ margin: '0 0 8px', color: 'var(--text-strong)' }}>No history found</h4>
                    <p style={{ margin: '0 0 24px', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', maxWidth: '240px' }}>
                      Start by logging a task or update for {selectedCustomer.name}.
                    </p>
                    <button 
                      type="button" 
                      className="primary-button"
                      onClick={() => setShowQuickTaskForm(true)}
                    >
                      Add Task
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="section-header" style={{ marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, color: 'var(--text-strong)' }}>Deal History</h4>
                    </div>

                    <div className="metrics-grid metrics-grid--compact" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '24px' }}>
                      <MetricCard label="W/L Ratio" value={Number(winLossRatio) ? Number(winLossRatio).toFixed(2) : winLossRatio} meta="Performance" accent="accent" />
                      <MetricCard label="Won Value" value={formatCurrencyCompact(closedWonValue)} meta="Revenue" accent="alt" />
                      <MetricCard label="Lost Value" value={formatCurrencyCompact(closedLostValue)} meta="Missed" accent="surface" />
                    </div>

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

                    <div className="section-header" style={{ marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, color: 'var(--text-strong)' }}>Activity Log</h4>
                    </div>

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
                    </div>
                  </>
                )}
              </div>
            ) : (
              <EmptyState title="No customer selected" copy="Choose a customer from the registry to review their history." />
            )}
          </Panel>
        </div>
      </section>

      <Modal
        isOpen={showQuickTaskForm}
        onClose={() => setShowQuickTaskForm(false)}
        title="Log a task & Update deal"
        kicker="Activity entry"
      >
        <TaskForm
          deals={deals}
          companies={companies}
          teamMembers={teamMembers}
          currentUser={currentUser}
          prefilledCompanyId={selectedCustomer?.id}
          onCancel={() => setShowQuickTaskForm(false)}
          onSubmit={async (form) => {
            await onCreateTask(form)
            setShowQuickTaskForm(false)
            if (selectedCustomer?.id) {
              fetchDetail(selectedCustomer.id)
            }
          }}
        />
      </Modal>

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
            <div><span>Region</span><strong>{selectedCustomer?.city || selectedCustomer?.region || '—'}</strong></div>
            <div><span>Branch</span><strong>{selectedCustomer?.branch ?? '—'}</strong></div>
            <div><span>Address</span><strong>{selectedCustomer?.address ?? '—'}</strong></div>
            <div><span>Industry</span><strong>{selectedCustomer?.industry ?? '—'}</strong></div>
            <div><span>Website</span><strong>{selectedCustomer?.website ?? '—'}</strong></div>
          </div>

          <div className="section-header" style={{ marginTop: '24px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: 'var(--text-strong)' }}>Contacts</h4>
            <button
              type="button"
              title="Add contact"
              onClick={() => {
                setCompanyContacts(prev => [{
                  id: createRecordId('contact'),
                  name: '',
                  role: '',
                  email: '',
                  phone: '',
                  isEditing: true,
                  isNew: true,
                }, ...prev])
              }}
              style={{
                width: '28px', height: '28px', borderRadius: '50%',
                border: '1px solid var(--accent)', background: 'transparent',
                color: 'var(--accent)', fontSize: '16px', lineHeight: 1,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', padding: 0,
              }}
            >+</button>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Number</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {companyContacts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-table__muted" style={{ textAlign: 'center', padding: '16px' }}>
                      No contacts for this company.
                    </td>
                  </tr>
                ) : (
                  companyContacts.map((contact, idx) => (
                    <tr key={contact.id}>
                      {contact.isEditing ? (
                        <>
                          <td>
                            <input
                              value={contact.name}
                              onChange={e => {
                                const val = e.target.value
                                setCompanyContacts(prev => prev.map((c, i) => i === idx ? { ...c, name: val } : c))
                              }}
                              placeholder="Name *"
                              style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                          </td>
                          <td>
                            <input
                              value={contact.role}
                              onChange={e => {
                                const val = e.target.value
                                setCompanyContacts(prev => prev.map((c, i) => i === idx ? { ...c, role: val } : c))
                              }}
                              placeholder="Role"
                              style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                          </td>
                          <td>
                            <input
                              value={contact.email}
                              onChange={e => {
                                const val = e.target.value
                                setCompanyContacts(prev => prev.map((c, i) => i === idx ? { ...c, email: val } : c))
                              }}
                              placeholder="Email"
                              style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                          </td>
                          <td>
                            <input
                              value={contact.phone}
                              onChange={e => {
                                const val = e.target.value
                                setCompanyContacts(prev => prev.map((c, i) => i === idx ? { ...c, phone: val } : c))
                              }}
                              placeholder="Number"
                              style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              className="ghost-button"
                              style={{ fontSize: '11px', padding: '2px 6px', marginRight: '4px' }}
                              onClick={async () => {
                                const c = companyContacts[idx]
                                if (!c.name) return
                                if (!c.email && !c.phone) return

                                const payload = {
                                  ...(c.isNew ? {
                                    id: c.id,
                                    companyId: selectedCustomer?.id,
                                    ownerId: currentUser?.id || null,
                                    lastTouch: new Date().toISOString().split('T')[0],
                                    status: 'Active',
                                  } : {}),
                                  name: c.name,
                                  role: c.role,
                                  email: c.email,
                                  phone: c.phone,
                                }

                                try {
                                  if (c.isNew) {
                                    const res = await apiFetch('/api/contacts', {
                                      method: 'POST',
                                      body: JSON.stringify(payload),
                                    })
                                    if (!res.ok) return
                                  } else {
                                    await apiFetch(`/api/contacts/${c.id}`, {
                                      method: 'PUT',
                                      body: JSON.stringify({ name: c.name, role: c.role, email: c.email, phone: c.phone }),
                                    })
                                  }
                                  setCompanyContacts(prev => prev.map((c2, i) => i === idx ? { ...c2, isEditing: false, isNew: false } : c2))
                                } catch (e) {
                                  console.error('Failed to save contact:', e)
                                }
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="ghost-button"
                              style={{ fontSize: '11px', padding: '2px 6px' }}
                              onClick={() => {
                                if (contact.isNew) {
                                  setCompanyContacts(prev => prev.filter((_, i) => i !== idx))
                                } else {
                                  setCompanyContacts(prev => prev.map((c2, i) => i === idx ? { ...c2, isEditing: false } : c2))
                                }
                              }}
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="admin-table__name">{contact.name}</td>
                          <td className="admin-table__muted">{contact.role || '—'}</td>
                          <td className="admin-table__muted">{contact.email || '—'}</td>
                          <td className="admin-table__muted">{contact.phone || '—'}</td>
                          <td>
                            <button
                              type="button"
                              className="ghost-button"
                              title="Edit"
                              style={{ fontSize: '11px', padding: '2px 6px' }}
                              onClick={() => setCompanyContacts(prev => prev.map((c2, i) => i === idx ? { ...c2, isEditing: true } : c2))}
                            >
                              Edit
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
