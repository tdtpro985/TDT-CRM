import { useState } from 'react'

const TASK_TYPES = ['Call', 'Follow-up', 'Meeting', 'Email']
const TASK_PRIORITIES = ['Low', 'Medium', 'High']

function DealCombobox({ deals, dealId, onChange }) {
  const displayValue = deals.find((d) => d.id === dealId)?.name ?? dealId

  function hChange(e) {
    const typed = e.target.value
    const match = deals.find((d) => d.name.toLowerCase() === typed.toLowerCase())
    onChange({ target: { name: 'dealId', value: match ? match.id : typed } })
  }

  return (
    <>
      <input
        name="dealId"
        value={displayValue}
        onChange={hChange}
        placeholder="Type deal name..."
        list="deal-options-task"
        autoComplete="off"
      />
      <datalist id="deal-options-task">
        {deals.map((d) => <option key={d.id} value={d.name} />)}
      </datalist>
    </>
  )
}

export default function TaskForm({ onSubmit, onCancel, deals, teamMembers, taskTypes = TASK_TYPES, taskPriorities = TASK_PRIORITIES }) {
  const [taskForm, setTaskForm] = useState({
    title: '',
    type: taskTypes[1],
    owner: teamMembers[0] ?? '',
    dealId: deals[0]?.id ?? '',
    dueDate: '',
    priority: 'Medium'
  })

  function handleChange(e) {
    const { name, value } = e.target
    setTaskForm((current) => ({ ...current, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(taskForm)
  }

  return (
    <form className="form-grid" style={{ padding: '0 24px 24px' }} onSubmit={handleSubmit}>
      <label className="field field--span-2">
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
        <input name="owner" value={taskForm.owner} onChange={handleChange} placeholder="Enter owner name" />
      </label>

      <label className="field field--span-2">
        <span>Linked deal</span>
        <DealCombobox deals={deals} dealId={taskForm.dealId} onChange={handleChange} />
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

      <div className="form-actions field--span-2">
        <button type="submit" className="primary-button">Save task</button>
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
