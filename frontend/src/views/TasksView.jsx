import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { formatDateLabel, getToneClass } from '../utils'

function DealCombobox({ deals, dealId, onChange }) {
  const displayValue = deals.find((d) => d.id === dealId)?.name ?? dealId

  function handleChange(e) {
    const typed = e.target.value
    const match = deals.find((d) => d.name.toLowerCase() === typed.toLowerCase())
    onChange({ target: { name: 'dealId', value: match ? match.id : typed } })
  }

  return (
    <>
      <input
        name="dealId"
        value={displayValue}
        onChange={handleChange}
        placeholder="Type deal name..."
        list="deal-options"
        autoComplete="off"
      />
      <datalist id="deal-options">
        {deals.map((d) => <option key={d.id} value={d.name} />)}
      </datalist>
    </>
  )
}

export default function TasksView({
  filteredTasks,
  tasks,
  openTasks,
  dueToday,
  deals,
  companyMap,
  taskTypes,
  taskPriorities,
  teamMembers,
  taskFilter,
  setTaskFilter,
  taskForm,
  handleTaskFormChange,
  handleCreateTask,
  handleTaskStatusToggle,
  showTaskForm,
  setShowTaskForm,
}) {
  const focusQueue = [...openTasks]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4)

  const completedCount = tasks.filter((t) => t.status === 'Completed').length
  const highPriorityCount = openTasks.filter((t) => t.priority === 'High').length

  return (
    <>
      <section className="metrics-grid metrics-grid--compact">
        <MetricCard label="Open tasks"    value={openTasks.length.toLocaleString()}   meta="Work still in progress for sales follow-through"  accent="accent"  />
        <MetricCard label="Due today"     value={dueToday.length.toLocaleString()}    meta="Tasks that need action today"                      accent="surface" />
        <MetricCard label="Completed"     value={completedCount.toLocaleString()}      meta="Closed activities already logged"                  accent="alt"     />
        <MetricCard label="High priority" value={highPriorityCount.toLocaleString()}  meta="Urgent follow-ups across open work"                accent="surface" />
      </section>

      <section className="content-grid content-grid--primary">
        <Panel
          kicker="Task tracking"
          title="Calls, follow-ups, meetings, and emails"
          detail="Activity tracking stays simple so updates are fast and the team sees the next action clearly."
          action={
            <div className="panel-inline-controls">
              <label className="filter-wrap">
                <span>Status</span>
                <select value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)}>
                  <option value="all">All tasks</option>
                  <option value="open">Open</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>
          }
        >
          {filteredTasks.length === 0 ? (
            <EmptyState title="No tasks match this filter" copy="Try a different search term or status filter." />
          ) : (
            <div className="activity-list">
              {filteredTasks.map((task) => {
                const linkedDeal = deals.find((d) => d.id === task.dealId)
                return (
                  <article key={task.id} className="activity-card">
                    <div className="activity-card__header">
                      <div>
                        <strong>{task.title}</strong>
                        <p>{task.type} | {task.owner}</p>
                      </div>
                      <div className="activity-card__badges">
                        <span className={`tone-pill ${getToneClass(task.priority)}`}>{task.priority}</span>
                        <span className={`tone-pill ${getToneClass(task.status)}`}>{task.status}</span>
                      </div>
                    </div>
                    <p className="activity-notes">
                      Linked to {linkedDeal?.name ?? 'manual task'} for{' '}
                      {linkedDeal ? companyMap[linkedDeal.companyId]?.name : 'general CRM work'}.
                    </p>
                    <div className="activity-card__footer">
                      <span>Due {formatDateLabel(task.dueDate)}</span>
                      <button type="button" className="ghost-button" onClick={() => handleTaskStatusToggle(task.id)}>
                        {task.status === 'Completed' ? 'Reopen task' : 'Mark complete'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </Panel>

        <div className="panel-stack">
          <Panel
            kicker="Focus queue"
            title="Most urgent follow-ups"
            detail="Use this queue to keep daily activity aligned with the pipeline."
          >
            <div className="simple-list">
              {focusQueue.map((task) => (
                <article key={task.id} className="simple-list__item">
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.owner} | due {formatDateLabel(task.dueDate)}</p>
                  </div>
                  <span className={`tone-pill ${getToneClass(task.priority)}`}>{task.priority}</span>
                </article>
              ))}
            </div>
          </Panel>

        </div>
      </section>

      <Modal
        isOpen={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        title="Log a task quickly"
        kicker="Fast entry"
      >
        <form className="form-grid" style={{ padding: '0 24px 24px' }} onSubmit={(e) => { handleCreateTask(e); setShowTaskForm(false) }}>
          <label className="field field--span-2">
            <span>Task title</span>
            <input name="title" value={taskForm.title} onChange={handleTaskFormChange} placeholder="Enter task title" required autoFocus />
          </label>

          <label className="field">
            <span>Type</span>
            <select name="type" value={taskForm.type} onChange={handleTaskFormChange}>
              {taskTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Owner</span>
            <input name="owner" value={taskForm.owner} onChange={handleTaskFormChange} placeholder="Enter owner name" />
          </label>

          <label className="field field--span-2">
            <span>Linked deal</span>
            <DealCombobox deals={deals} dealId={taskForm.dealId} onChange={handleTaskFormChange} />
          </label>

          <label className="field">
            <span>Due date</span>
            <input name="dueDate" type="date" value={taskForm.dueDate} onChange={handleTaskFormChange} required />
          </label>

          <label className="field">
            <span>Priority</span>
            <select name="priority" value={taskForm.priority} onChange={handleTaskFormChange}>
              {taskPriorities.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>

          <div className="form-actions field--span-2">
            <button type="submit" className="primary-button">Save task</button>
            <button type="button" className="secondary-button" onClick={() => setShowTaskForm(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
