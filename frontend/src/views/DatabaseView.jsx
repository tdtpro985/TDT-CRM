import { useState, useEffect } from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { formatCurrencyCompact, formatDateLabel, getToneClass } from '../utils'
import LeadForm from '../components/forms/LeadForm'
import ContactForm from '../components/forms/ContactForm'
import CompanyForm from '../components/forms/CompanyForm'

export default function DatabaseView({
  databaseTab,
  setDatabaseTab,
  setNotice,
  filteredLeads,
  filteredContacts,
  filteredCompanies,
  leads,
  contacts,
  companies,
  deals,
  teamMembers,
  selectedLeadId,
  setSelectedLeadId,
  selectedContactId,
  setSelectedContactId,
  selectedCompanyId,
  setSelectedCompanyId,
  companyMap,
  contactMap,
  leadStatuses,
  leadSources,
  showLeadForm,
  setShowLeadForm,
  showContactForm,
  setShowContactForm,
  showCompanyForm,
  setShowCompanyForm,
  onCreateLead,
  onCreateContact,
  onCreateCompany,
  handleLeadStatusChange,
  onSyncGSheets,
  linkHealth,
  currentUser,
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [leadPage, setLeadPage] = useState(1);
  const [contactPage, setContactPage] = useState(1);
  const [companyPage, setCompanyPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Reset to first page if the search or filter results change
  useEffect(() => setLeadPage(1), [filteredLeads]);
  useEffect(() => setContactPage(1), [filteredContacts]);
  useEffect(() => setCompanyPage(1), [filteredCompanies]);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? leads[0] ?? null
  const selectedContact = contacts.find((c) => c.id === selectedContactId) ?? contacts[0] ?? null
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? companies[0] ?? null

  const selectedContactCompany = selectedContact ? companyMap[selectedContact.companyId] : null
  const selectedContactLeads   = leads.filter((l) => l.sr === selectedContact?.name)
  const selectedContactDeals   = deals.filter((d) => d.contactId === selectedContact?.id)

  const selectedCompanyContacts = contacts.filter((c) => c.companyId === selectedCompany?.id)
  const selectedCompanyLeads    = leads.filter((l) => l.branch === selectedCompany?.name)
  const selectedCompanyDeals    = deals.filter((d) => d.companyId === selectedCompany?.id)
  const selectedCompanyValue    = selectedCompanyDeals.reduce((sum, d) => sum + d.value, 0)

  const recordTitle =
    databaseTab === 'leads' ? 'Customer Registry'
    : databaseTab === 'contacts' ? 'Contact Directory'
    : 'Company Accounts'

  const getPaginatedData = (data, page) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const renderPagination = (totalItems, currentPage, setPage) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;
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
    );
  };

  const paginatedLeads = getPaginatedData(filteredLeads, leadPage);
  const paginatedContacts = getPaginatedData(filteredContacts, contactPage);
  const paginatedCompanies = getPaginatedData(filteredCompanies, companyPage);

  return (
    <>
      <section className="metrics-grid metrics-grid--compact">
        <MetricCard label="Customers"    value={leads.length.toLocaleString()}    meta="Customer records tracked in the database"               accent="accent"  />
        <MetricCard label="Contacts"     value={contacts.length.toLocaleString()} meta="Customer-facing records tied to account ownership"      accent="surface" />
        <MetricCard label="Companies"    value={companies.length.toLocaleString()} meta="Accounts organized for cleaner pipeline reporting"     accent="alt"     />
        <MetricCard label="Data Quality" value={`${linkHealth}%`}                 meta="Customer records with contact number and region filled" accent="surface" />
      </section>

      <section className="content-grid content-grid--primary">
        <Panel
          kicker="Clean data"
          title={recordTitle}
          detail="Every record is designed to stay linked properly, which keeps the CRM clean and reporting dependable."
          action={
            <div className="database-tabs" role="tablist" aria-label="Database views">
              {['leads', 'contacts', 'companies'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`tab-button ${databaseTab === tab ? 'is-active' : ''}`}
                  onClick={() => {
                    setDatabaseTab(tab)
                    setNotice(`Customer Database switched to ${tab}.`)
                  }}
                >
                  {tab}
                </button>
              ))}
              {databaseTab === 'leads' && (
                <button
                  type="button"
                  className={`tab-button sync-button ${isSyncing ? 'is-syncing' : ''}`}
                  onClick={async () => {
                    setIsSyncing(true)
                    await onSyncGSheets()
                    setIsSyncing(false)
                  }}
                  disabled={isSyncing}
                  style={{ marginLeft: 'auto', background: 'var(--accent)', color: 'white', border: 'none' }}
                >
                  {isSyncing ? 'Syncing...' : 'Sync with GSheets'}
                </button>
              )}
            </div>
          }
        >
          {databaseTab === 'leads' && (
            filteredLeads.length === 0
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
          )}

          {databaseTab === 'contacts' && (
            filteredContacts.length === 0
              ? <EmptyState title="No contacts match this search" copy="Clear the search box to see the full contact directory." />
              : (
                <>
                  <div className="contact-list">
                    {paginatedContacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        className={`contact-card ${selectedContactId === contact.id ? 'is-selected' : ''}`}
                        onClick={() => {
                          setSelectedContactId(contact.id)
                          setSelectedCompanyId(contact.companyId)
                        }}
                      >
                        <div>
                          <strong>{contact.name}</strong>
                          <span>{contact.role}</span>
                        </div>
                        <p>{companyMap[contact.companyId]?.name}</p>
                        <div className="contact-card__meta">
                          <span>{contact.owner}</span>
                          <span className="tone-pill is-neutral">Contact</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {renderPagination(filteredContacts.length, contactPage, setContactPage)}
                </>
              )
          )}

          {databaseTab === 'companies' && (
            filteredCompanies.length === 0
              ? <EmptyState title="No companies match this search" copy="Clear the search box to see all company records." />
              : (
                <>
                  <div className="contact-list">
                    {paginatedCompanies.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        className={`contact-card ${selectedCompanyId === company.id ? 'is-selected' : ''}`}
                        onClick={() => setSelectedCompanyId(company.id)}
                      >
                        <div>
                          <strong>{company.name}</strong>
                          <span>{company.industry}</span>
                        </div>
                        <p>{company.city} | owner {company.owner}</p>
                        <div className="contact-card__meta">
                          <span>{company.status}</span>
                          <span className={`tone-pill ${getToneClass(company.status)}`}>{company.status}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {renderPagination(filteredCompanies.length, companyPage, setCompanyPage)}
                </>
              )
          )}
        </Panel>

        <div className="panel-stack">
          {databaseTab === 'leads' && (
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
                <>
                  <div className="detail-list">
                    <div><span>Customer Name</span><strong>{selectedLead.customerName ?? '—'}</strong></div>
                    <div><span>Contact Number</span><strong>{selectedLead.contactNum ?? '—'}</strong></div>
                    <div><span>Address</span><strong>{selectedLead.address ?? '—'}</strong></div>
                    <div><span>Region</span><strong>{selectedLead.region ?? '—'}</strong></div>
                    <div><span>SR</span><strong>{selectedLead.sr ?? '—'}</strong></div>
                    <div><span>Branch</span><strong>{selectedLead.branch ?? '—'}</strong></div>
                    <div><span>Date Added</span><strong>{formatDateLabel(selectedLead.createdAt)}</strong></div>
                  </div>
                </>
              ) : (
                <EmptyState title="No customer selected" copy="Choose a customer from the registry to review their details." />
              )}
            </Panel>
          )}

          {databaseTab === 'contacts' && (
            <Panel
              kicker="Contact detail"
              title={selectedContact?.name ?? 'Select a contact'}
              detail="Contact records give the sales team one reliable place for customer-facing information and related activity."
            >
              {selectedContact ? (
                <>
                  <div className="detail-list">
                    <div><span>Company</span><strong>{selectedContactCompany?.name ?? 'No company'}</strong></div>
                    <div><span>Role</span><strong>{selectedContact.role}</strong></div>
                    <div><span>Email</span><strong>{selectedContact.email}</strong></div>
                    <div><span>Phone</span><strong>{selectedContact.phone}</strong></div>
                    <div><span>Owner</span><strong>{selectedContact.owner}</strong></div>
                    <div><span>Last activity</span><strong>{formatDateLabel(selectedContact.lastActivity)}</strong></div>
                  </div>
                  <article className="detail-card">
                    <strong>Related pipeline context</strong>
                    <p>{selectedContactLeads.length} linked leads and {selectedContactDeals.length} deals are tied to this contact.</p>
                  </article>
                </>
              ) : (
                <EmptyState title="No contact selected" copy="Choose a contact to review ownership and relationship details." />
              )}
            </Panel>
          )}

          {databaseTab === 'companies' && (
            <Panel
              kicker="Company detail"
              title={selectedCompany?.name ?? 'Select a company'}
              detail="Account records keep companies, key contacts, and pipeline value visible in one place."
            >
              {selectedCompany ? (
                <>
                  <div className="detail-list">
                    <div><span>Industry</span><strong>{selectedCompany.industry}</strong></div>
                    <div><span>City</span><strong>{selectedCompany.city}</strong></div>
                    <div><span>Owner</span><strong>{selectedCompany.owner}</strong></div>
                    <div><span>Status</span><strong>{selectedCompany.status}</strong></div>
                    <div><span>Linked contacts</span><strong>{selectedCompanyContacts.length}</strong></div>
                    <div><span>Pipeline value</span><strong>{formatCurrencyCompact(selectedCompanyValue)}</strong></div>
                  </div>
                  <article className="detail-card">
                    <strong>Relationship summary</strong>
                    <p>{selectedCompanyLeads.length} leads and {selectedCompanyDeals.length} deals are currently linked to this account.</p>
                  </article>
                </>
              ) : (
                <EmptyState title="No company selected" copy="Choose a company to review its account status and related pipeline." />
              )}
            </Panel>
          )}
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

      <Modal
        isOpen={showContactForm}
        onClose={() => setShowContactForm(false)}
        title="Add a new contact"
        kicker="Directory entry"
      >
        <ContactForm
          companies={companies}
          teamMembers={teamMembers}
          onCancel={() => setShowContactForm(false)}
          onSubmit={(form) => {
            onCreateContact(form)
            setShowContactForm(false)
          }}
        />
      </Modal>

      <Modal
        isOpen={showCompanyForm}
        onClose={() => setShowCompanyForm(false)}
        title="Add a new company"
        kicker="Account entry"
      >
        <CompanyForm
          teamMembers={teamMembers}
          onCancel={() => setShowCompanyForm(false)}
          onSubmit={(form) => {
            onCreateCompany(form)
            setShowCompanyForm(false)
          }}
        />
      </Modal>
    </>
  )
}
