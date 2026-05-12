import { useState } from 'react'

const TASK_TYPES = ['Call', 'Follow-up', 'Meeting', 'Email']
const TASK_PRIORITIES = ['Low', 'Medium', 'High']

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

export default function TaskForm({ onSubmit, onCancel, deals, companies, currentUser, taskTypes = TASK_TYPES, taskPriorities = TASK_PRIORITIES, dealStages = [] }) {
  const [taskForm, setTaskForm] = useState({
    title: '',
    type: taskTypes[1],
    owner: currentUser?.branch || '',
    companyId: '',
    contact: '',
    dealId: '',
    dueDate: '',
    priority: 'Medium',
    notes: '',
    dealStage: dealStages[0] ?? 'New Opportunity',
    dealValue: '',
    expectedClose: '',
  })

  function handleChange(e) {
    const { name, value } = e.target
    setTaskForm((current) => {
      const next = { ...current, [name]: value }
      
      // Auto-fill logic when selecting a company
      if (name === 'companyId' && value) {
        const selectedCompany = companies.find(c => c.id === value || c.name === value)
        if (selectedCompany) {
          // Find the most recent active deal for this company
          const companyDeal = deals.find(d => 
            (d.companyId === selectedCompany.id || d.companyId === selectedCompany.name) && 
            d.stage !== 'Closed Won' && 
            d.stage !== 'Closed Lost'
          )
          
          if (companyDeal) {
            next.dealId = companyDeal.id
            next.dealStage = companyDeal.stage
            next.dealValue = companyDeal.value
            next.expectedClose = companyDeal.expectedClose
          } else {
            // No active deal, prep for new deal creation
            next.dealId = ''
            next.dealStage = dealStages[0]
            next.dealValue = ''
            next.expectedClose = ''
          }
        }
      }
      return next
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(taskForm)
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

      <label className="field">
        <span>Contact</span>
        <input name="contact" value={taskForm.contact} onChange={handleChange} placeholder="Enter contact person" />
      </label>

      {/* Transferred Deal Fields */}
      <label className="field">
        <span>Deal stage</span>
        <select name="dealStage" value={taskForm.dealStage} onChange={handleChange}>
          {dealStages.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label className="field">
        <span>Deal value</span>
        <input name="dealValue" type="number" min="0" value={taskForm.dealValue} onChange={handleChange} placeholder="Enter value" />
      </label>

      <label className="field">
        <span>Expected close</span>
        <input name="expectedClose" type="date" value={taskForm.expectedClose} onChange={handleChange} />
      </label>

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
