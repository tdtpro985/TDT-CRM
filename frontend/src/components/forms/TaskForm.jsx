import { useState } from 'react'

const TASK_TYPES = ['Call', 'Follow-up', 'Meeting', 'Email']
const TASK_PRIORITIES = ['Low', 'Medium', 'High']

const ACTIVE_STAGES = new Set(['Qualified', 'New Opportunity', 'Proposal', 'Negotiation'])

function CompanyCombobox({ companies, companyId, onChange }) {
  const displayValue = companies.find((c) => c.id === companyId)?.name ?? companyId

  function hChange(e) {
    const typed = e.target.value
    const match = companies.find((c) => c.name.toLowerCase() === typed.toLowerCase())
    onChange({ target: { name: 'companyId', value: match ? match.id : typed } })
  }

  return (
    <>
      <input
        name="companyId"
        value={displayValue}
        onChange={hChange}
        placeholder="Search company..."
        list="company-options-task"
        autoComplete="off"
        required
      />
      <datalist id="company-options-task">
        {companies?.map((c) => <option key={c.id} value={c.name} />)}
      </datalist>
    </>
  )
}

export default function TaskForm({ onSubmit, onCancel, deals, companies, currentUser, taskTypes = TASK_TYPES, taskPriorities = TASK_PRIORITIES, dealStages = [], prefilledCompanyId = '' }) {
  const [taskForm, setTaskForm] = useState({
    title: '',
    type: taskTypes[1],
    owner: currentUser?.name || '',
    companyId: prefilledCompanyId,
    contact: '',
    dealId: '',
    dueDate: '',
    priority: 'Medium',
    notes: '',
    dealStage: '',
    dealValue: '',
    expectedClose: '',
  })

  const [dealContacts, setDealContacts] = useState([])
  const [selectedContacts, setSelectedContacts] = useState([])
  const [loadingContacts, setLoadingContacts] = useState(false)

  // Active deals for the currently selected company
  const activeDealsForCompany = deals.filter((d) =>
    (d.companyId === taskForm.companyId) && ACTIVE_STAGES.has(d.stage)
  )

  async function loadDealContacts(dealId) {
    if (!fetchDealContacts || !dealId) {
      setDealContacts([])
      setSelectedContacts([])
      return
    }
    setLoadingContacts(true)
    try {
      const data = await fetchDealContacts(dealId)
      setDealContacts(Array.isArray(data) ? data : [])
      setSelectedContacts(Array.isArray(data) ? data.map((c) => c.id) : [])
    } finally {
      setLoadingContacts(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setTaskForm((current) => {
      const next = { ...current, [name]: value }

      if (name === 'companyId') {
        // Reset deal selection when company changes
        next.dealId = ''
        next.dealStage = ''
        next.dealValue = ''
        next.expectedClose = ''
        setDealContacts([])
        setSelectedContacts([])
      }

      if (name === 'dealId' && value) {
        const deal = deals.find((d) => d.id === value)
        if (deal) {
          next.dealStage = deal.stage
          next.dealValue = deal.value
          next.expectedClose = deal.expectedClose || ''
        }
        loadDealContacts(value)
      }

      return next
    })
  }

  function toggleContact(contactId) {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    const contactNames = dealContacts
      .filter((c) => selectedContacts.includes(c.id))
      .map((c) => c.name)
      .join(', ')
    onSubmit({ ...taskForm, contact: contactNames || taskForm.contact })
  }

  return (
    <form className="form-grid" style={{ padding: '0 24px 24px' }} onSubmit={handleSubmit}>
      <label className="field">
        <span>Task title</span>
        <input name="title" value={taskForm.title} onChange={handleChange} placeholder="Enter task title" required autoFocus />
      </label>

      <label className="field">
        <span>Type</span>
        <select name="type" value={taskForm.type} onChange={handleChange}>
          {taskTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <label className="field">
        <span>Owner</span>
        <input
          name="owner"
          value={taskForm.owner}
          readOnly
          className="input--readonly"
          placeholder="Enter owner name"
        />
      </label>

      <label className="field">
        <span>Company</span>
        <CompanyCombobox companies={companies} companyId={taskForm.companyId} onChange={handleChange} />
      </label>

      {/* Linked deal dropdown */}
      <label className="field">
        <span>Linked deal</span>
        <select
          name="dealId"
          value={taskForm.dealId}
          onChange={handleChange}
          disabled={activeDealsForCompany.length === 0}
        >
          <option value="">
            {activeDealsForCompany.length === 0 ? 'No active deals' : 'Select a deal…'}
          </option>
          {activeDealsForCompany.map((d) => (
            <option key={d.id} value={d.id}>{d.name} — {d.stage}</option>
          ))}
        </select>
      </label>

      {/* Deal info (read-only) when a deal is selected */}
      {taskForm.dealId && (
        <>
          <label className="field">
            <span>Deal stage</span>
            <input value={taskForm.dealStage} readOnly className="input--readonly" />
          </label>

          <label className="field">
            <span>Deal value</span>
            <input value={taskForm.dealValue} readOnly className="input--readonly" />
          </label>

          <label className="field">
            <span>Expected close</span>
            <input value={taskForm.expectedClose} readOnly className="input--readonly" />
          </label>
        </>
      )}

      {/* Deal contacts table */}
      {taskForm.dealId && (
        <div className="field field--span-2">
          <span>Contacts involved</span>
          {loadingContacts ? (
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginTop: '6px' }}>Loading contacts…</p>
          ) : dealContacts.length > 0 ? (
            <table style={{ width: '100%', marginTop: '6px', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--text-muted)' }}>Include</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--text-muted)' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, color: 'var(--text-muted)' }}>Role</th>
                </tr>
              </thead>
              <tbody>
                {dealContacts.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(c.id)}
                        onChange={() => toggleContact(c.id)}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>{c.name}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{c.deal_role || c.role || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginTop: '6px' }}>No contacts linked to this deal yet.</p>
          )}
        </div>
      )}

      {/* Manual contact field when no deal or no deal contacts */}
      {(!taskForm.dealId || dealContacts.length === 0) && (
        <label className="field">
          <span>Contact</span>
          <input name="contact" value={taskForm.contact} onChange={handleChange} placeholder="Enter contact person" />
        </label>
      )}

      <label className="field">
        <span>Due date</span>
        <input name="dueDate" type="date" value={taskForm.dueDate} onChange={handleChange} required />
      </label>

      <label className="field">
        <span>Priority</span>
        <select name="priority" value={taskForm.priority} onChange={handleChange}>
          {taskPriorities.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>

      <label className="field field--span-2">
        <span>Description</span>
        <textarea
          name="notes"
          value={taskForm.notes}
          onChange={handleChange}
          placeholder="Enter task details..."
          required
          style={{ minHeight: '80px' }}
        />
      </label>

      <div className="form-actions field--span-2">
        <button type="submit" className="primary-button">Save task</button>
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
