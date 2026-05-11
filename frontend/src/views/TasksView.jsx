import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import { formatDateLabel, getToneClass } from '../utils'

export default function TasksView({
  filteredTasks,
  tasks,
  openTasks,
  dueToday,
  deals,
  companyMap,
  taskFilter,
  setTaskFilter,
  handleTaskStatusToggle,
  currentPage,
  setCurrentPage
}) {
  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE)

  const getPaginatedData = (data, page, limit) => {
    const pageNum = page === '' || isNaN(page) ? 1 : parseInt(page, 10)
    const start = (pageNum - 1) * limit
    return data.slice(start, start + limit)
  }

  const paginatedTasks = getPaginatedData(filteredTasks, currentPage, ITEMS_PER_PAGE)

  const focusQueue = [...openTasks]
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
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
                <select 
                  value={taskFilter} 
                  onChange={(e) => {
                    setTaskFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                >
                  <option value="all">All tasks</option>
                  <option value="open">Open</option>
                  <option value="reopened">Reopened</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>
          }
        >
          {paginatedTasks.length === 0 ? (
            <EmptyState title="No tasks match this filter" copy="Try a different search term or status filter." />
          ) : (
            <>
              <div className="activity-list">
                {paginatedTasks.map((task) => {
                  const linkedDeal = deals.find((d) => d.id === task.dealId)
                  return (
                    <article key={task.id} className="activity-card" style={{ position: 'relative' }}>
                      <div className="activity-card__header">
                        <div style={{ paddingRight: '110px' }}>
                          <strong style={{ display: 'block' }}>{task.title}</strong>
                          <p style={{ margin: '4px 0 0' }}>{task.type} | {task.owner}</p>
                        </div>
                        <div className="activity-card__badges" style={{ position: 'absolute', top: '8px', right: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span className={`tone-pill ${getToneClass(task.priority)}`}>{task.priority}</span>
                          <span className={`tone-pill ${getToneClass(task.status)}`}>{task.status}</span>
                        </div>
                      </div>
                      <p className="activity-notes" style={{ paddingRight: '110px' }}>
                        Linked to {linkedDeal?.name ?? 'manual task'} for{' '}
                        {linkedDeal ? companyMap[linkedDeal.companyId]?.name : 'general CRM work'}.
                      </p>
                      <div className="activity-card__footer">
                        <span>Due {formatDateLabel(task.dueDate)}</span>
                        <button type="button" className="ghost-button" onClick={() => handleTaskStatusToggle(task.id, task.status)}>
                          {task.status === 'Completed' ? 'Reopen task' : 'Mark complete'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border)', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <div className="pagination-jump" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Page</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={currentPage}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        const num = parseInt(val, 10);
                        if (val === '') {
                          setCurrentPage('');
                        } else if (!isNaN(num) && num >= 1 && num <= totalPages) {
                          setCurrentPage(num);
                        }
                      }}
                      style={{ 
                        width: '40px', 
                        textAlign: 'center', 
                        padding: '4px 0',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--r-md)',
                        color: 'var(--text-strong)',
                        fontWeight: 700,
                        outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>of {totalPages}</span>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
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
                <article key={task.id} className="simple-list__item" style={{ position: 'relative' }}>
                  <div style={{ paddingRight: '110px' }}>
                    <strong style={{ display: 'block' }}>{task.title}</strong>
                    <p style={{ margin: '4px 0 0' }}>{task.owner} | due {formatDateLabel(task.dueDate)}</p>
                  </div>
                  <div className="activity-card__badges" style={{ position: 'absolute', top: '8px', right: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span className={`tone-pill ${getToneClass(task.priority)}`}>{task.priority}</span>
                    <span className={`tone-pill ${getToneClass(task.status)}`}>{task.status}</span>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </>
  )
}
