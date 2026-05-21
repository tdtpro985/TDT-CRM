import { useState, useEffect, useMemo } from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { formatDateLabel, formatCurrencyCompact, getToneClass, createRecordId, parseAuditValue, getPaginatedData, matchesSearch, isSrRole } from '../utils'
import { STAGE_COLORS, ITEMS_PER_PAGE } from '../constants'
import LeadForm from '../components/forms/LeadForm'
import TaskForm from '../components/forms/TaskForm'
import { apiFetch } from '../api'
import Pagination from '../components/Pagination'

const CUSTOMER_ITEMS_PER_PAGE = 10

export default function CustomersView({
  customers,
  contacts,
  deals,
  companies,
  teamMembers,
  selectedCustomerId,
  setSelectedCustomerId,
  customerStatuses,
  dealStages,
  showCustomerForm,
  setShowCustomerForm,
  onCreateCustomer,
  onCreateTask,
  fetchDealContacts,
  fetchCompanies,
  fetchContacts,
  setNotice,
  currentUser,
  searchQuery
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [showQuickTaskForm, setShowQuickTaskForm] = useState(false)
  const [customerDetail, setCustomerDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [companyContacts, setCompanyContacts] = useState([])
  const [contactErrors, setContactErrors] = useState({})
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const isSr = isSrRole(currentUser?.role)

  // Reset page on search change (adjusting state during render)
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery)
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery)
    setPage(1)
  }

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Handle deal-based status filtering
      if (statusFilter !== 'all') {
        const companyDeals = deals.filter(d => d.companyId === c.id)
        
        if (statusFilter === 'New') {
          // New: No active deals (only Closed or no deals at all)
          if (companyDeals.some(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost')) return false
        } else if (statusFilter === 'Prospect') {
          // Prospect: At least one deal in "New Opportunity"
          if (!companyDeals.some(d => d.stage === 'New Opportunity')) return false
        } else if (statusFilter === 'Negotiation') {
          // Negotiation: At least one deal in "Proposal" or "Negotiation"
          if (!companyDeals.some(d => d.stage === 'Proposal' || d.stage === 'Negotiation')) return false
        } else if (statusFilter === 'Converted') {
          // Converted: At least one deal is Closed (Won or Lost) and owned by current user
          if (!companyDeals.some(d => (d.stage === 'Closed Won' || d.stage === 'Closed Lost') && d.ownerId === currentUser?.id)) return false
        }
      }

      return matchesSearch(searchQuery, [c.name, c.contactNum, c.address, c.region, c.sr, c.branch, c.customerStatus])
    })
  }, [customers, searchQuery, statusFilter, deals, currentUser])

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
            <span className="u-ml-4">
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
      setCustomerDetail(null)
      setCompanyContacts([])
      fetchDetail(selectedCustomer.id)
    }
  }, [selectedCustomer?.id])

  useEffect(() => {
    const globalMatches = contacts.filter(c => c.companyId === selectedCustomer?.id)
    const detailContacts = customerDetail?.contacts || []
    
    // Merge: Detail contacts from API take priority, but global matches fill the gap immediately
    const combined = [...detailContacts, ...globalMatches]
    const unique = Array.from(new Map(combined.map(c => [c.id, c])).values())
    
    setCompanyContacts(unique.sort((a, b) => (a.name || '').localeCompare(b.name || '')))
  }, [customerDetail?.contacts, selectedCustomer?.id, contacts])

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

  const hasActiveDeal = useMemo(() => 
    customerDeals.some(d => !['Closed Won', 'Closed Lost'].includes(d.stage))
  , [customerDeals])

  const paginatedCustomers = getPaginatedData(filteredCustomers, page, CUSTOMER_ITEMS_PER_PAGE)
  const totalPages = Math.ceil(filteredCustomers.length / CUSTOMER_ITEMS_PER_PAGE)

  return (
    <>

      <section className="metrics-grid metrics-grid--compact u-grid-3">
        <MetricCard label="Total Customers" value={customers.length.toLocaleString()} meta="Total records" accent="accent" />
        <MetricCard label="Active Deals" value={activeDealSum.toLocaleString()} meta="Currently in pipeline" accent="alt" />
        <MetricCard label="Cold Companies" value={coldCompanyCount.toLocaleString()} meta="No recent deal activity" accent="surface" />
      </section>

      <section className="content-grid content-grid--primary u-grid-45-55">
        <Panel
          kicker="Customer Registry"
          title="Companies"
          detail="Derived from leads and direct company entries."
          action={
            <div className="panel-inline-controls u-flex-center-gap-16">
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
          <div className="u-min-h-600 u-flex-column">
            {filteredCustomers.length === 0
              ? <EmptyState title="No customers match this filter" copy="Try adjusting your status filter." />
              : (
                <>
                  <div className="contact-list u-flex-1 u-align-content-start">
                    {paginatedCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className={`contact-card ${selectedCustomerId === customer.id ? 'is-selected' : ''}`}
                        onClick={() => setSelectedCustomerId(customer.id)}
                        onDoubleClick={() => setDetailModalOpen(true)}
                      >
                        <div>
                          <strong className="u-fs-md u-text-strong u-block">
                            {customer.name}
                          </strong>
                          <div className="u-fs-xs u-text-muted u-margin-t-4 u-flex-center-gap-4">
                            <span>{Number(customer.totalDealCount || 0)} total</span>
                            {Number(customer.activeDealCount) > 0 && (
                              <>
                                <span className="u-opacity-05">•</span>
                                <span className="u-text-accent u-font-600">
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
                  <p className="u-pad-24 u-text-center u-text-muted">Loading records...</p>
                ) : !hasActiveDeal ? (
                  <div className="u-flex-column-center u-pad-64-24 u-text-center">
                    <h4 className="u-margin-b-8 u-text-strong">No active deals</h4>
                    <p className="u-margin-b-24 u-fs-sm u-text-muted u-max-w-240">
                      Transactional history and contacts are only visible for companies with at least one active deal.
                    </p>
                    <button 
                      type="button" 
                      className="primary-button"
                      onClick={() => setShowQuickTaskForm(true)}
                    >
                      Add Task / New Deal
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="section-header u-margin-b-12">
                      <h4 className="u-margin-0 u-text-strong">Deal History</h4>
                    </div>

                    <div className="metrics-grid metrics-grid--compact u-grid-3 u-flex-gap-sm u-margin-b-24">
                      <MetricCard label="W/L Ratio" value={Number(winLossRatio) ? Number(winLossRatio).toFixed(2) : winLossRatio} meta="Performance" accent="accent" />
                      <MetricCard label="Won Value" value={wonCount === 0 ? '-' : formatCurrencyCompact(closedWonValue)} meta="Revenue" accent="alt" />
                      <MetricCard label="Lost Value" value={lostCount === 0 ? '-' : formatCurrencyCompact(closedLostValue)} meta="Missed" accent="surface" />
                    </div>

                    <div className="admin-table-wrap u-margin-b-24">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Deal</th>
                            <th>Stage</th>
                            <th>Value</th>
                            {!isSr && <th>Owner</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {customerDeals.map(deal => (
                            <tr key={deal.id}>
                              <td className="admin-table__name">{deal.name}</td>
                              <td>{deal.stage}</td>
                              <td>{formatCurrencyCompact(deal.value)}</td>
                              {!isSr && <td className="admin-table__muted">{deal.owner}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="section-header u-margin-b-12">
                      <h4 className="u-margin-0 u-text-strong">Activity Log</h4>
                    </div>

                    <div className="timeline">
                      {(customerDetail?.auditLogs || [])
                      .filter(l => {
                        // 1. Filter out technical/noisy logs
                        if (l.action.startsWith('task_status:') || l.action === 'task_status_change' || l.action === 'value_change') return false
                        
                        // 2. Filter out no-change logs (where old == new)
                        if (l.oldValue === l.newValue && l.oldValue !== null) return false
                        
                        // 3. SRs should not see owner reassignments
                        if (isSr && l.action === 'owner_id_change') return false
                        
                        return true
                      })
                      .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt))
                      .map((item, idx) => {
                        const linkedDeal = deals.find(d => d.id === item.entityId)
                        const linkedContact = (customerDetail?.contacts || []).find(c => c.id === item.entityId)
                        
                        const stageContext = (item.action === 'stage_change' || item.action === 'deal_created')
                          ? parseAuditValue(item.newValue)
                          : (item.stage || linkedDeal?.stage)
                        
                        const dotColor = item.entityType === 'contact' ? 'var(--text-muted)' : (STAGE_COLORS[stageContext] || 'var(--accent)')

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
                            <div className="timeline-dot" style={{ backgroundColor: dotColor }}></div>
                            <div className="timeline-content">
                              <div className="timeline-header">
                                <span className="timeline-time">{formatDateLabel(item.changedAt)}</span>
                                {item.changedBy && (
                                  <span className="timeline-user u-fs-10 u-text-muted u-ml-8">
                                    by {item.changedBy}
                                  </span>
                                )}
                                <span className="timeline-badge is-audit">Change</span>
                              </div>
                              <div className="timeline-body">
                                <p>
                                  {item.action === 'deal_created' ? (
                                    <>
                                      <strong>Deal created</strong>: <span className={`tone-pill ${getToneClass(item.newValue)} u-fs-10 u-pad-1-6 u-margin-h-4`}>{item.newValue}</span>
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
                                            <span className={`tone-pill ${getToneClass(item.oldValue)} u-fs-10 u-pad-1-6 u-margin-h-4`}>{item.oldValue}</span>
                                          ) : null}
                                          {item.oldValue && ' → '}
                                          <span className={`tone-pill ${getToneClass(item.newValue)} u-fs-10 u-pad-1-6 u-margin-h-4`}>{item.newValue}</span>
                                        </>
                                      ) : item.action === 'owner_id_change' ? (
                                        <>
                                          <span className="timeline-old">
                                            {teamMembers.find(m => String(m.id) === String(item.oldValue))?.name || `User ${item.oldValue}`}
                                          </span>
                                          {' → '}
                                          <strong>
                                            {teamMembers.find(m => String(m.id) === String(item.newValue))?.name || `User ${item.newValue}`}
                                          </strong>
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
          fetchDealContacts={fetchDealContacts}
          fetchCompanies={fetchCompanies}
          fetchContacts={fetchContacts}
          onCancel={() => setShowQuickTaskForm(false)}
          onSubmit={async (form) => {
            try {
              await onCreateTask(form)
              setShowQuickTaskForm(false)
              if (selectedCustomer?.id) {
                fetchDetail(selectedCustomer.id)
              }
            } catch {
              // Error handled in useCRMData
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
          currentUser = {currentUser}
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
        <div className="u-pad-0-24-24">
          <div className="detail-list">
            {!isSr && <div><span>SR</span><strong>{selectedCustomer?.sr ?? '—'}</strong></div>}
            <div><span>Region</span><strong>{selectedCustomer?.city || selectedCustomer?.region || '—'}</strong></div>
            <div><span>Branch</span><strong>{selectedCustomer?.branch ?? '—'}</strong></div>
            <div><span>Address</span><strong>{selectedCustomer?.address ?? '—'}</strong></div>
            <div><span>Industry</span><strong>{selectedCustomer?.industry ?? '—'}</strong></div>
            <div><span>Website</span><strong>{selectedCustomer?.website ?? '—'}</strong></div>
          </div>

          <>
              <div className="section-header u-margin-t-24 u-margin-b-12 u-flex-between u-flex-center">
                <h4 className="u-margin-0 u-text-strong">Contacts</h4>
                <button
                  type="button"
                  title="Add contact"
                  className="u-btn-circle-plus"
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
                      <th className="col-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyContacts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="admin-table__muted u-text-center u-pad-16">
                          No contacts for this company.
                        </td>
                      </tr>
                    ) : (
                      companyContacts.map((contact, idx) => {
                        const errors = contactErrors[contact.id] || {}
                        return (
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
                                    className={`u-w-100 u-box-border ${errors.name ? 'u-border-alert' : ''}`}
                                  />
                                  {errors.name && <div className="u-fs-10 u-margin-t-4 u-alert">{errors.name}</div>}
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
                                    className="u-w-100 u-box-border"
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
                                    className={`u-w-100 u-box-border ${errors.email ? 'u-border-alert' : ''}`}
                                  />
                                  {errors.email && <div className="u-fs-10 u-margin-t-4 u-alert">{errors.email}</div>}
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
                                    className={`u-w-100 u-box-border ${errors.phone ? 'u-border-alert' : ''}`}
                                  />
                                  {errors.phone && <div className="u-fs-10 u-margin-t-4 u-alert">{errors.phone}</div>}
                                  {errors.global && <div className="u-fs-10 u-margin-t-4 u-font-600 u-alert">{errors.global}</div>}
                                </td>
                                <td className="col-actions u-nowrap">
                                  <button
                                    type="button"
                                    className="ghost-button u-fs-11 u-pad-2-6 u-mr-4"
                                    onClick={async () => {
                                      const c = companyContacts[idx]
                                      const errors = {}
                                      if (!c.name?.trim()) errors.name = 'Name is required'
                                      if (!c.email?.trim() && !c.phone?.trim()) {
                                        errors.email = 'Need phone or email'
                                        errors.phone = 'Need phone or email'
                                      }
                                      if (c.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
                                        errors.email = 'Invalid email'
                                      }

                                      if (Object.keys(errors).length > 0) {
                                        setContactErrors(prev => ({ ...prev, [c.id]: errors }))
                                        setNotice('Please correct the highlighted errors.')
                                        return
                                      }

                                      setContactErrors(prev => {
                                        const next = { ...prev }
                                        delete next[c.id]
                                        return next
                                      })

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
                                          if (res.status === 409) {
                                            const errData = await res.json()
                                            setNotice(errData.error || 'This contact already exists.')
                                            setContactErrors(prev => ({ ...prev, [c.id]: { global: errData.error || 'Duplicate contact' } }))
                                            return
                                          }
                                          if (!res.ok) {
                                            const errData = await res.json().catch(() => ({}))
                                            setNotice(errData.error || 'Failed to create contact.')
                                            setContactErrors(prev => ({ ...prev, [c.id]: { global: errData.error || 'Create failed' } }))
                                            return
                                          }
                                        } else {
                                          const res = await apiFetch(`/api/contacts/${c.id}`, {
                                            method: 'PUT',
                                            body: JSON.stringify({ name: c.name, role: c.role, email: c.email, phone: c.phone }),
                                          })
                                          if (res.status === 409) {
                                            const errData = await res.json()
                                            setNotice(errData.error || 'This contact already exists.')
                                            setContactErrors(prev => ({ ...prev, [c.id]: { global: errData.error || 'Duplicate contact' } }))
                                            return
                                          }
                                          if (!res.ok) {
                                            const errData = await res.json().catch(() => ({}))
                                            setNotice(errData.error || 'Failed to update contact.')
                                            setContactErrors(prev => ({ ...prev, [c.id]: { global: errData.error || 'Update failed' } }))
                                            return
                                          }
                                        }
                                        setCompanyContacts(prev => prev.map((c2, i) => i === idx ? { ...c2, isEditing: false, isNew: false } : c2))
                                        setNotice('Contact saved successfully.')
                                        fetchDetail(selectedCustomer.id)
                                        fetchContacts()
                                      } catch (e) {
                                        console.error('Failed to save contact:', e)
                                        setNotice('A network error occurred while saving the contact.')
                                        setContactErrors(prev => ({ ...prev, [c.id]: { global: 'Network error' } }))
                                      }
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost-button u-fs-11 u-pad-2-6"
                                    onClick={() => {
                                      if (contact.isNew) {
                                        setCompanyContacts(prev => prev.filter((_, i) => i !== idx))
                                      } else {
                                        setCompanyContacts(prev => prev.map((c2, i) => i === idx ? { ...c2, isEditing: false } : c2))
                                      }
                                      setContactErrors(prev => {
                                        const next = { ...prev }
                                        delete next[contact.id]
                                        return next
                                      })
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
                                <td className="col-actions">
                                  <button
                                    type="button"
                                    className="ghost-button u-fs-11 u-pad-2-6"
                                    title="Edit"
                                    onClick={() => setCompanyContacts(prev => prev.map((c2, i) => i === idx ? { ...c2, isEditing: true } : c2))}
                                  >
                                    Edit
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>

          <div className="u-margin-t-24">
            <button 
              type="button" 
              className="secondary-button u-w-100" 
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
