import React from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import { formatDateLabel } from '../utils'

export default function CompaniesView({
  companies, filteredCompanies, selectedCompany, selectedCompanyId, setSelectedCompanyId,
  companyForm, handleCompanyFormChange, handleCreateCompany,
  salesTeam
}) {
  return (
    <>
      <section className="metrics-grid metrics-grid--compact">
        <MetricCard label="Total companies" value={companies.length.toLocaleString()} meta="Total accounts in directory" accent="accent" />
        <MetricCard label="Manufacturing" value={companies.filter(c => c.industry === 'Manufacturing').length.toLocaleString()} meta="Primary industry focus" accent="surface" />
      </section>

      <section className="content-grid content-grid--primary">
        <Panel kicker="Account directory" title="Company management">
          {filteredCompanies.length === 0 ? (
            <EmptyState title="No companies found" copy="Try adjusting your search criteria." />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Industry</th>
                    <th>Website</th>
                    <th>Owner</th>
                    <th>Last Touch</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company) => (
                    <tr key={company.id} className={selectedCompanyId === company.id ? 'is-selected' : ''}>
                      <td>
                        <button type="button" className="table-link" onClick={() => setSelectedCompanyId(company.id)}>
                          {company.name}
                        </button>
                      </td>
                      <td>{company.industry}</td>
                      <td><a href={company.website} target="_blank" rel="noreferrer" className="table-link">{company.website}</a></td>
                      <td>{company.owner}</td>
                      <td>{formatDateLabel(company.lastTouch)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="panel-stack">
          <Panel kicker="Selected account" title={selectedCompany?.name || 'No company selected'}>
            {selectedCompany ? (
              <div className="detail-card">
                <div className="detail-list">
                  <div><span>Industry</span><strong>{selectedCompany.industry}</strong></div>
                  <div><span>Website</span><strong>{selectedCompany.website}</strong></div>
                  <div><span>Owner</span><strong>{selectedCompany.owner}</strong></div>
                  <div><span>Last touch</span><strong>{formatDateLabel(selectedCompany.lastTouch)}</strong></div>
                </div>
              </div>
            ) : (
              <EmptyState title="No details available" copy="Select a company to view details." />
            )}
          </Panel>

          <Panel id="company-form" kicker="Quick create" title="Add a new company">
            <form className="form-grid" onSubmit={handleCreateCompany}>
              <label className="field field--span-2">
                <span>Company name</span>
                <input name="name" value={companyForm.name} onChange={handleCompanyFormChange} placeholder="TDT Powersteel" required />
              </label>
              <label className="field">
                <span>Industry</span>
                <input name="industry" value={companyForm.industry} onChange={handleCompanyFormChange} placeholder="Manufacturing" />
              </label>
              <label className="field">
                <span>Website</span>
                <input name="website" value={companyForm.website} onChange={handleCompanyFormChange} placeholder="https://..." />
              </label>
              <label className="field field--span-2">
                <span>Owner</span>
                <select name="owner" value={companyForm.owner} onChange={handleCompanyFormChange}>
                  <option value="Unassigned">Unassigned</option>
                  {salesTeam.map(rep => <option key={rep.id} value={rep.name}>{rep.name}</option>)}
                </select>
              </label>
              <button type="submit" className="primary-button field--span-2">Save Company</button>
            </form>
          </Panel>
        </div>
      </section>
    </>
  )
}
