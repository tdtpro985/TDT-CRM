import { useState, useEffect } from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { formatDateLabel, getToneClass } from '../utils'
import LeadForm from '../components/forms/LeadForm'

export default function DatabaseView({
  setNotice,
  filteredLeads,
  leads,
  teamMembers,
  selectedLeadId,
  setSelectedLeadId,
  leadStatuses,
  showLeadForm,
  setShowLeadForm,
  onCreateLead,
  handleLeadStatusChange,
  linkHealth,
  currentUser,
}) {
  const [leadPage, setLeadPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  useEffect(() => setLeadPage(1), [filteredLeads])

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? leads[0] ?? null

  const getPaginatedData = (data, page) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE
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
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Page {currentPage} of {totalPages}
        </span>
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

  const paginatedLeads = getPaginatedData(filteredLeads, leadPage)

  return (
    <>
      <section className="metrics-grid metrics-grid--compact">
        <MetricCard label="Customers" value={leads.length.toLocaleString()} meta="Customer records tracked in the database" accent="accent" />
        <MetricCard label="Data Quality" value={`${linkHealth}%`} meta="Customer records with contact number and region filled" accent="surface" />
      </section>

      <section className="content-grid content-grid--primary">
        <Panel
          kicker="Clean data"
          title="Customer Registry"
          detail="Every record is designed to stay linked properly, which keeps the CRM clean and reporting dependable."
        >
          {filteredLeads.length === 0
            ? <EmptyState title="No customers match this search" copy="Clear the search box to see the full customer registry." />
            : (
              <>
                <div className="contact-list">
                  {paginatedLeads.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      className={`contact-card ${selectedLeadId === lead.id ? 'is-selected' : ''}`}
                      onClick={() => setSelectedLeadId(lead.id)}
                    >
                      <div>
                        <strong>{lead.customerName}</strong>
                        <span>{lead.region}</span>
                      </div>
                      <p>SR: {lead.sr} &mdash; {lead.branch}</p>
                      <div className="contact-card__meta">
                        <span>{formatDateLabel(lead.createdAt)}</span>
                        <span className={`tone-pill ${getToneClass(lead.status)}`}>{lead.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {renderPagination(filteredLeads.length, leadPage, setLeadPage)}
              </>
            )
          }
        </Panel>

        <div className="panel-stack">
          <Panel
            kicker="Customer detail"
            title={selectedLead?.customerName ?? 'Select a customer'}
            detail="Full customer record linked to a branch and assigned sales representative."
            action={
              selectedLead ? (
                <label className="filter-wrap">
                  <span>Status</span>
                  <select
                    value={selectedLead.status}
                    onChange={(e) => handleLeadStatusChange(selectedLead.id, e.target.value)}
                  >
                    {leadStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              ) : null
            }
          >
            {selectedLead ? (
              <div className="detail-list">
                <div><span>Customer Name</span><strong>{selectedLead.customerName ?? '—'}</strong></div>
                <div><span>Contact Number</span><strong>{selectedLead.contactNum ?? '—'}</strong></div>
                <div><span>Address</span><strong>{selectedLead.address ?? '—'}</strong></div>
                <div><span>Region</span><strong>{selectedLead.region ?? '—'}</strong></div>
                <div><span>SR</span><strong>{selectedLead.sr ?? '—'}</strong></div>
                <div><span>Branch</span><strong>{selectedLead.branch ?? '—'}</strong></div>
              </div>
            ) : (
              <EmptyState title="No customer selected" copy="Choose a customer from the registry to review their details." />
            )}
          </Panel>
        </div>
      </section>

      <Modal
        isOpen={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        title="Add new customer"
        kicker="Customer entry"
      >
        <LeadForm
          teamMembers={teamMembers}
          branch={currentUser?.branch ?? ''}
          onCancel={() => setShowLeadForm(false)}
          onSubmit={(form) => {
            onCreateLead(form)
            setShowLeadForm(false)
          }}
        />
      </Modal>
    </>
  )
}
