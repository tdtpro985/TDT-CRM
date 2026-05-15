import { useState, useEffect, useMemo } from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { formatDateLabel, formatCurrencyCompact, getToneClass, createRecordId, parseAuditValue, getPaginatedData } from '../utils'
import { STAGE_COLORS, ITEMS_PER_PAGE } from '../constants'
import LeadForm from '../components/forms/LeadForm'
import TaskForm from '../components/forms/TaskForm'
import { apiFetch } from '../api'
import Pagination from '../components/Pagination'

export default function CustomersView({
  filteredCustomers,
  customers,
  contacts,
  deals,
  companies,
  teamMembers,
  selectedCustomerId,
  setSelectedCustomerId,
  customerStatuses,
  dealStages,
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
  const [showQuickTaskForm, setShowQuickTaskForm] = useState(false)
  const [customerDetail, setCustomerDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [companyContacts, setCompanyContacts] = useState([])
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const renderContactDiff = (item, linkedContact) => {
    const ACTION_LABELS = {
      'contact_created': 'Contact added',
      'update': 'Contact updated'
    }

    if (item.action === 'contact_created') {
      const val = parseAuditValue(item.newValue)
      return (
        <>
          <strong>{ACTION_LABELS[item.action]}</strong>: 
          {val && typeof val === 'object' ? <strong> {val.name}</strong> : <strong> {item.newValue}</strong>}
        </>
      )
    }

    const oldVal = parseAuditValue(item.oldValue)
    const newVal = parseAuditValue(item.newValue)

    if (oldVal && newVal && typeof oldVal === 'object' && typeof newVal === 'object') {
      const changes = []
      if (oldVal.name !== newVal.name) changes.push(<span key="name">Name: <em>{oldVal.name}</em> → <strong>{newVal.name}</strong></span>)
      if (oldVal.role !== newVal.role) changes.push(<span key="role">Role: <em>{oldVal.role}</em> → <strong>{newVal.role}</strong></span>)
      if (oldVal.email !== newVal.email) changes.push(<span key="email">Email: <em>{oldVal.email}</em> → <strong>{newVal.email}</strong></span>)
      if (oldVal.phone !== newVal.phone) changes.push(<span key="phone">Phone: <em>{oldVal.phone}</em> → <strong>{newVal.phone}</strong></span>)
      
      return (
        <>
          <strong>{ACTION_LABELS[item.action] || item.action}</strong>: 
          {changes.length > 0 ? (
            <span style={{ marginLeft: '4px' }}>
              {changes.reduce((prev, curr) => [prev, ', ', curr])}
            </span>
          ) : <span> {linkedContact?.name || 'Contact'} details updated</span>}
        </>
      )
    }

    return (
      <>
        <strong>{ACTION_LABELS[item.action] || item.action}</strong>: 
        <strong> {linkedContact?.name || 'Contact'}</strong> details updated
      </>
    )
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? customers[0] ?? null

  useEffect(() => {
    if (selectedCustomer?.id) {
      fetchDetail(selectedCustomer.id)
    }
  }, [selectedCustomer?.id])

  useEffect(() => {
    setCompanyContacts(customerDetail?.contacts || [])
  }, [customerDetail?.contacts])

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

  const activeDealSum = useMemo(() => deals.filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage)).length, [deals])
  const coldCompanyCount = useMemo(() => {
    const deadline = new Date()
    deadline.setDate(deadline.getDate() - 30)
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

  const customerDeals = useMemo(() => 
    deals
      .filter(d => d.companyId === selectedCustomer?.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  , [deals, selectedCustomer?.id])

  const wonCount = useMemo(() =>
    customerDeals.filter(d => d.stage === 'Closed Won').length, [customerDeals])
  const lostCount = useMemo(() =>
    customerDeals.filter(d => d.stage === 'Closed Lost').length, [customerDeals])
  const closedWonValue = useMemo(() =>
    customerDeals.filter(d => d.stage === 'Closed Won')
      .reduce((sum, d) => sum + Number(d.value || 0), 0), [customerDeals])
  const closedLostValue = useMemo(() =>
    customerDeals.filter(d => d.stage === 'Closed Lost')
      .reduce((sum, d) => sum + Number(d.value || 0), 0), [customerDeals])
  const winLossRatio = useMemo(() => {
    if (wonCount === 0 && lostCount === 0) return '—'
    if (lostCount === 0) return wonCount
    return wonCount / lostCount
  }, [wonCount, lostCount])

  const hasHistory = (customerDeals.length > 0) || 
                     (customerDetail?.auditLogs?.length > 0)

  const paginatedCustomers = getPaginatedData(filteredCustomers, page, ITEMS_PER_PAGE)
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE)

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
            <div className="panel-inline-controls" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
              ? <EmptyState title="No customers match this filter" copy="Try adjusting your status filter." />
              : (
                <>
                  <div className="contact-list" style={{ flex: 1, alignContent: 'start' }}>
                    {paginatedCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className={`contact-card ${selectedCustomerId === customer.id ? 'is-selected' : ''}`}
                        onClick={() => setSelectedCustomerId(customer.id)}
                        onDoubleClick={() => setDetailModalOpen(true)}
                      >
                        <div>
                          <strong style={{ fontSize: 'var(--fs-md)', color: 'var(--text-strong)', display: 'block' }}>
                            {customer.name}
                          </strong>
                          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{Number(customer.totalDealCount || 0)} total</span>
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
                      </div>
                    ))}
                  </div>
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </>
                )}
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
                      <MetricCard label="Won Value" value={wonCount === 0 ? '-' : formatCurrencyCompact(closedWonValue)} meta="Revenue" accent="alt" />
                      <MetricCard label="Lost Value" value={lostCount === 0 ? '-' : formatCurrencyCompact(closedLostValue)} meta="Missed" accent="surface" />
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
                          {customerDeals.map(deal => (
                            <tr key={deal.id}>
                              <td className="admin-table__name">{deal.name}</td>
                              <td>{deal.stage}</td>
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
                      {(customerDetail?.auditLogs || [])
                      .filter(l => !l.action.startsWith('task_status:') && l.action !== 'task_status_change')
                      .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
                      .map((item, idx) => {
                        const linkedDeal = deals.find(d => d.id === item.entityId)
                        const linkedContact = (customerDetail?.contacts || []).find(c => c.id === item.entityId)
                        
                        const stage = item.stage || linkedDeal?.stage
                        const dotColor = item.entityType === 'contact' ? 'var(--text-muted)' : (STAGE_COLORS[stage] || 'var(--accent)')

                        const ACTION_LABELS = {
                          'stage_change': 'Stage changed',
                          'deal_created': 'Deal created',
                          'value_change': 'Value changed',
                          'owner_id_change': 'Owner changed',
                          'close_date_change': 'Close date changed',
                          'probability_change': 'Probability changed',
                          'status_change': 'Status changed',
                          'lost_reason': 'Lost reason',
                          'contact_created': 'Contact added',
                          'update': 'Contact updated'
                        }

                        return (
                          <div key={idx} className="timeline-item">
                            <div className="timeline-dot" style={{ background: dotColor }}></div>
                            <div className="timeline-content">
                              <div className="timeline-header">
                                <span className="timeline-time">{formatDateLabel(item.changedAt)}</span>
                                <span className="timeline-badge is-audit">Change</span>
                              </div>
                              <div className="timeline-body">
                                <p>
                                  {item.action === 'deal_created' ? (
                                    <>
                                      <strong>Deal created</strong>: <span className={`tone-pill ${getToneClass(item.newValue)}`} style={{ fontSize: '10px', padding: '1px 6px', margin: '0 4px' }}>{item.newValue}</span>
                                      {linkedDeal && <> for <strong>{linkedDeal.name}</strong></>}
                                    </>
                                  ) : item.entityType === 'contact' ? (
                                    renderContactDiff(item, linkedContact)
                                  ) : (
                                    <>
                                      <strong>{ACTION_LABELS[item.action] || item.action.replace(/_/g, ' ')}</strong>:{' '}
                                      {item.action === 'stage_change' ? (
                                        <>
                                          {item.oldValue ? (
                                            <span className={`tone-pill ${getToneClass(item.oldValue)}`} style={{ fontSize: '10px', padding: '1px 6px', margin: '0 4px' }}>{item.oldValue}</span>
                                          ) : null}
                                          {item.oldValue && ' → '}
                                          <span className={`tone-pill ${getToneClass(item.newValue)}`} style={{ fontSize: '10px', padding: '1px 6px', margin: '0 4px' }}>{item.newValue}</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="timeline-old">{item.oldValue}</span> → <strong>{item.newValue}</strong>
                                        </>
                                      )}
                                    </>
                                  )}
                                </p>
                                {item.notes && <p className="timeline-notes">{item.notes}</p>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
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
          contacts={contacts}
          teamMembers={teamMembers}
          dealStages={dealStages}
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
                              name="name"
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
                              name="role"
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
                              name="email"
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
                              name="phone"
                              value={contact.phone}
                              onChange={e => {
                                const val = e.target.value.replace(/[^0-9+\s()-]/g, '')
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
                                  fetchDetail(selectedCustomer.id)
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
