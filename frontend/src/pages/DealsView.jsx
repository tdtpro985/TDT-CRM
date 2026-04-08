import React, { useState } from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import KanbanBoard from '../components/KanbanBoard'
import { formatCurrencyCompact, formatCurrencyFull, formatDateLabel, getToneClass } from '../utils'
import { stageOrder } from '../constants'

export default function DealsView({
  deals, totalPipelineValue, highPriorityDeals,
  filteredDeals, selectedDeal, selectedDealId, setSelectedDealId,
  stageFilter, setStageFilter, handleDealStageChange,
  dealForm, handleDealFormChange, handleCreateDeal,
  salesTeam, companies, contacts
}) {
  const [viewType, setViewType] = useState('kanban')

  return (
    <>
      <section className="metrics-grid metrics-grid--compact">
        <MetricCard label="Total pipeline value" value={formatCurrencyCompact(totalPipelineValue)} meta="Cumulative value of all active and won deals" accent="accent" />
        <MetricCard label="High-priority deals" value={highPriorityDeals.length.toLocaleString()} meta="High focus and expected close" accent="surface" />
      </section>

      <section className="pipeline-controls">
        <div className="view-selector">
          <button className={`view-button ${viewType === 'kanban' ? 'is-active' : ''}`} onClick={() => setViewType('kanban')}>Kanban Board</button>
          <button className={`view-button ${viewType === 'table' ? 'is-active' : ''}`} onClick={() => setViewType('table')}>Table List</button>
        </div>
      </section>

      <section className="content-grid content-grid--primary">
        <Panel 
          kicker="Pipeline manager" 
          title="Deal management"
          action={
            viewType === 'table' && (
              <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option value="all">All stages</option>
                {stageOrder.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )
          }
        >
          {viewType === 'kanban' ? (
            <KanbanBoard deals={filteredDeals} onStageChange={handleDealStageChange} />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Company</th>
                    <th>Stage</th>
                    <th>Value</th>
                    <th>Owner</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map((deal) => (
                    <tr key={deal.id} className={selectedDealId === deal.id ? 'is-selected' : ''}>
                      <td><button onClick={() => setSelectedDealId(deal.id)} className="table-link">{deal.name}</button></td>
                      <td>{deal.companyName}</td>
                      <td><span className={`tone-pill ${getToneClass(deal.stage)}`}>{deal.stage}</span></td>
                      <td>{formatCurrencyCompact(deal.value)}</td>
                      <td>{deal.owner}</td>
                      <td><span className={`tone-pill ${getToneClass(deal.priority)}`}>{deal.priority}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="panel-stack">
          <Panel kicker="Selected deal" title={selectedDeal?.name || 'No deal selected'}>
            {selectedDeal ? (
              <div className="detail-card">
                <div className="detail-list">
                  <div><span>Company</span><strong>{selectedDeal.companyName}</strong></div>
                  <div><span>Contact</span><strong>{selectedDeal.contactName}</strong></div>
                  <div><span>Value</span><strong>{formatCurrencyFull(selectedDeal.value)}</strong></div>
                  <div><span>Close date</span><strong>{formatDateLabel(selectedDeal.closeDate)}</strong></div>
                </div>
                <label className="field">
                  <span>Update Stage</span>
                  <select value={selectedDeal.stage} onChange={(e) => handleDealStageChange(selectedDeal.id, e.target.value)}>
                    {stageOrder.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
            ) : (
              <EmptyState title="No details" copy="Select a deal to view details." />
            )}
          </Panel>

          <Panel id="deal-form" kicker="Quick create" title="Add a new deal">
            <form className="form-grid" onSubmit={handleCreateDeal}>
              <label className="field field--span-2">
                <span>Deal name</span>
                <input name="name" value={dealForm.name} onChange={handleDealFormChange} placeholder="North district steel bundle" required />
              </label>
              <label className="field">
                <span>Company</span>
                <select name="companyId" value={dealForm.companyId} onChange={handleDealFormChange} required>
                  <option value="">Select a company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Contact</span>
                <select name="contactId" value={dealForm.contactId} onChange={handleDealFormChange} required>
                  <option value="">Select a contact</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Owner</span>
                <input name="owner" value={dealForm.owner} onChange={handleDealFormChange} placeholder="Enter owner name" />
              </label>
              <label className="field">
                <span>Stage</span>
                <select name="stage" value={dealForm.stage} onChange={handleDealFormChange}>
                  {stageOrder.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Value</span>
                <input name="value" type="number" value={dealForm.value} onChange={handleDealFormChange} placeholder="1250000" required />
              </label>
              <label className="field">
                <span>Close Date</span>
                <input name="closeDate" type="date" value={dealForm.closeDate} onChange={handleDealFormChange} required />
              </label>
              <button type="submit" className="primary-button field--span-2">Save Deal</button>
            </form>
          </Panel>
        </div>
      </section>
    </>
  )
}
