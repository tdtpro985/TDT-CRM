import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import { formatCurrencyCompact, formatDateLabel, getToneClass } from '../utils'

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
  leadForm,
  handleLeadFormChange,
  handleCreateLead,
  handleLeadStatusChange,
  linkHealth,
}) {
  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? leads[0] ?? null
  const selectedContact = contacts.find((c) => c.id === selectedContactId) ?? contacts[0] ?? null
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? companies[0] ?? null

  const selectedLeadCompany  = selectedLead ? companyMap[selectedLead.companyId] : null
  const selectedLeadDeal     = selectedLead ? deals.find((d) => d.leadId === selectedLead.id) : null

  const selectedContactCompany = selectedContact ? companyMap[selectedContact.companyId] : null
  const selectedContactLeads   = leads.filter((l) => l.contactId === selectedContact?.id)
  const selectedContactDeals   = deals.filter((d) => d.contactId === selectedContact?.id)

  const selectedCompanyContacts = contacts.filter((c) => c.companyId === selectedCompany?.id)
  const selectedCompanyLeads    = leads.filter((l) => l.companyId === selectedCompany?.id)
  const selectedCompanyDeals    = deals.filter((d) => d.companyId === selectedCompany?.id)
  const selectedCompanyValue    = selectedCompanyDeals.reduce((sum, d) => sum + d.value, 0)

  const recordTitle =
    databaseTab === 'leads' ? 'Lead Registry'
    : databaseTab === 'contacts' ? 'Contact Directory'
    : 'Company Accounts'



  return (
    <>
      <section className="metrics-grid metrics-grid--compact">
        <MetricCard label="Leads"       value={leads.length.toLocaleString()}    meta="Tracked with linked contact and company references"    accent="accent"  />
        <MetricCard label="Contacts"    value={contacts.length.toLocaleString()} meta="Customer-facing records tied to account ownership"      accent="surface" />
        <MetricCard label="Companies"   value={companies.length.toLocaleString()} meta="Accounts organized for cleaner pipeline reporting"    accent="alt"     />
        <MetricCard label="Link Health" value={`${linkHealth}%`}                 meta="Lead records linked to both contact and company"        accent="surface" />
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
            </div>
          }
        >
          {databaseTab === 'leads' && (
            filteredLeads.length === 0
              ? <EmptyState title="No leads match this search" copy="Clear the search box to see the full lead registry." />
              : (
                <div className="contact-list">
                  {filteredLeads.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      className={`contact-card ${selectedLeadId === lead.id ? 'is-selected' : ''}`}
                      onClick={() => {
                        setSelectedLeadId(lead.id)
                        setSelectedContactId(lead.contactId)
                        setSelectedCompanyId(lead.companyId)
                      }}
                    >
                      <div>
                        <strong>{lead.name}</strong>
                        <span>{companyMap[lead.companyId]?.name}</span>
                      </div>
                      <p>{lead.source} lead owned by {lead.owner}</p>
                      <div className="contact-card__meta">
                        <span>{formatDateLabel(lead.createdAt)}</span>
                        <span className={`tone-pill ${getToneClass(lead.status)}`}>{lead.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )
          )}

          {databaseTab === 'contacts' && (
            filteredContacts.length === 0
              ? <EmptyState title="No contacts match this search" copy="Clear the search box to see the full contact directory." />
              : (
                <div className="contact-list">
                  {filteredContacts.map((contact) => (
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
              )
          )}

          {databaseTab === 'companies' && (
            filteredCompanies.length === 0
              ? <EmptyState title="No companies match this search" copy="Clear the search box to see all company records." />
              : (
                <div className="contact-list">
                  {filteredCompanies.map((company) => (
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
              )
          )}
        </Panel>

        <div className="panel-stack">
          {databaseTab === 'leads' && (
            <Panel
              kicker="Lead detail"
              title={selectedLead?.name ?? 'Select a lead'}
              detail="Review source, ownership, links, and next step before moving the lead deeper into the pipeline."
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
                    <div><span>Company</span><strong>{selectedLeadCompany?.name ?? selectedLead.companyId ?? '—'}</strong></div>
                    <div><span>Contact number</span><strong>{selectedLead.phone ?? '—'}</strong></div>
                    <div><span>Source</span><strong>{selectedLead.source}</strong></div>
                    <div><span>Owner</span><strong>{selectedLead.owner}</strong></div>
                    <div><span>Created</span><strong>{formatDateLabel(selectedLead.createdAt)}</strong></div>
                    <div><span>Linked deal</span><strong>{selectedLeadDeal?.name ?? 'No deal yet'}</strong></div>
                  </div>
                  <article className="detail-card">
                    <strong>Next step</strong>
                    <p>{selectedLead.nextStep}</p>
                  </article>
                </>
              ) : (
                <EmptyState title="No lead selected" copy="Choose a lead from the registry to review its linked customer data." />
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

          <Panel
            id="lead-form"
            kicker="Fast entry"
            title="Add a new lead"
            detail="Quick lead capture keeps the customer database usable and ready for backend persistence later."
          >
            <form className="form-grid" onSubmit={handleCreateLead}>
              <label className="field field--span-2">
                <span>Lead name</span>
                <input name="name" value={leadForm.name} onChange={handleLeadFormChange} placeholder="Full name of the lead" required minLength={2} maxLength={100} />
              </label>

              <label className="field">
                <span>Company</span>
                <input name="companyId" value={leadForm.companyId} onChange={handleLeadFormChange} placeholder="Company or organization name" required maxLength={100} />
              </label>

              <label className="field">
                <span>Contact number</span>
                <input
                  name="phone"
                  type="tel"
                  value={leadForm.phone}
                  onChange={handleLeadFormChange}
                  placeholder="+63 9XX XXX XXXX"
                  pattern="[0-9+\-\s()]{7,20}"
                  title="Enter a valid phone number (digits, +, -, spaces allowed)"
                  required
                />
              </label>

              <label className="field">
                <span>Source</span>
                <select name="source" value={leadForm.source} onChange={handleLeadFormChange}>
                  {leadSources.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label className="field">
                <span>Owner</span>
                <input name="owner" value={leadForm.owner} onChange={handleLeadFormChange} placeholder="Assigned sales owner" required maxLength={80} />
              </label>

              <label className="field field--span-2">
                <span>Next step</span>
                <textarea name="nextStep" value={leadForm.nextStep} onChange={handleLeadFormChange} placeholder="Describe the next action the sales team should take" required maxLength={500} />
              </label>

              <button type="submit" className="primary-button field--span-2">Save lead</button>
            </form>
          </Panel>
        </div>
      </section>
    </>
  )
}
