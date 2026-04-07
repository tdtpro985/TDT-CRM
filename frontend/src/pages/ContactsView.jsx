import React from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import { formatDateLabel, getToneClass } from '../utils'
import { contactStatuses } from '../constants'

export default function ContactsView({
  filteredContacts, selectedContact, selectedContactId, setSelectedContactId,
  contactFilter, setContactFilter, handleContactStatusChange,
  contactForm, handleContactFormChange, handleCreateContact,
  salesTeam, companies
}) {
  return (
    <>
      <section className="metrics-grid metrics-grid--compact">
        <MetricCard label="Total contacts" value={filteredContacts.length.toLocaleString()} meta="Contacts in the directory" accent="accent" />
        <MetricCard label="New leads" value={filteredContacts.filter(c => c.status === 'Lead').length.toLocaleString()} meta="Needs initial follow-up" accent="surface" />
      </section>

      <section className="content-grid content-grid--primary">
        <Panel kicker="Contact directory" title="Account management">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Owner</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className={selectedContactId === contact.id ? 'is-selected' : ''}>
                    <td>
                      <button type="button" className="table-link" onClick={() => setSelectedContactId(contact.id)}>
                        {contact.name}
                      </button>
                    </td>
                    <td>{contact.companyName || 'Unassigned'}</td>
                    <td>{contact.role}</td>
                    <td>{contact.owner}</td>
                    <td><span className={`tone-pill ${getToneClass(contact.status)}`}>{contact.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="panel-stack">
          <Panel kicker="Selected contact" title={selectedContact?.name || 'No contact selected'}>
            {selectedContact ? (
              <div className="detail-card">
                <div className="detail-list">
                  <div><span>Email</span><strong>{selectedContact.email}</strong></div>
                  <div><span>Phone</span><strong>{selectedContact.phone}</strong></div>
                  <div><span>Company</span><strong>{selectedContact.companyName}</strong></div>
                </div>
              </div>
            ) : (
              <EmptyState title="No details available" copy="Select a contact to view details." />
            )}
          </Panel>

          <Panel id="contact-form" kicker="Quick create" title="Add a new contact">
            <form className="form-grid" onSubmit={handleCreateContact}>
              <label className="field field--span-2">
                <span>Name</span>
                <input name="name" value={contactForm.name} onChange={handleContactFormChange} placeholder="Sarah Miller" required />
              </label>
              <label className="field">
                <span>Company</span>
                <select name="companyId" value={contactForm.companyId} onChange={handleContactFormChange} required>
                  <option value="">Select a company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Role</span>
                <input name="role" value={contactForm.role} onChange={handleContactFormChange} placeholder="Procurement Manager" />
              </label>
              <label className="field">
                <span>Email</span>
                <input name="email" value={contactForm.email} onChange={handleContactFormChange} placeholder="sarah@..." />
              </label>
              <label className="field">
                <span>Phone</span>
                <input name="phone" value={contactForm.phone} onChange={handleContactFormChange} placeholder="0917-..." />
              </label>
              <label className="field">
                <span>Owner</span>
                <select name="owner" value={contactForm.owner} onChange={handleContactFormChange}>
                  <option value="Unassigned">Unassigned</option>
                  {salesTeam.map(rep => <option key={rep.id} value={rep.name}>{rep.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Status</span>
                <select name="status" value={contactForm.status} onChange={handleContactFormChange}>
                  {contactStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <button type="submit" className="primary-button field--span-2">Save Contact</button>
            </form>
          </Panel>
        </div>
      </section>
    </>
  )
}
