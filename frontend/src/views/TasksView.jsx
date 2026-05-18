import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import { formatDateLabel, getToneClass, getPaginatedData, matchesSearch } from '../utils'
import { ITEMS_PER_PAGE } from '../constants'

import Pagination from '../components/Pagination'

export default function TasksView({
  tasks,
  contacts,
  openTasks,
  dueToday,
  deals,
  companies,
  handleTaskStatusToggle,
  searchQuery
}) {
  const navigate = useNavigate()
  const [taskFilter, setTaskFilter] = useState('open')
  const [currentPage, setCurrentPage] = useState(1)

  const companyMap = useMemo(() => Object.fromEntries((companies ?? []).map((c) => [c.id, c])), [companies])

  // Reset page on search change (adjusting state during render)
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery)
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery)
    setCurrentPage(1)
  }

  const filteredTasks = useMemo(() => tasks.filter(
    (t) => {
      const deal = deals.find((d) => d.id === t.dealId)
      const companyName = t.companyName || companyMap[deal?.companyId]?.name || ''
      
      return (
        (taskFilter === 'all' || 
         (taskFilter === 'open' && t.status === 'Open') || 
         (taskFilter === 'completed' && t.status === 'Completed') ||
         (taskFilter === 'reopened' && t.status === 'Reopened')) &&
        matchesSearch(searchQuery, [t.title, t.type, t.owner, deal?.name, companyName])
      )
    }
  ), [tasks, taskFilter, searchQuery, deals, companyMap])

  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE)

  const paginatedTasks = useMemo(() => getPaginatedData(filteredTasks, currentPage, ITEMS_PER_PAGE), [filteredTasks, currentPage])

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
                  
                  // Resolve enriched contact info from task.contact string
                  const contactObjects = (task.contact || '').split(', ').map(name => {
                    return contacts.find(c => c.name.toLowerCase() === name.toLowerCase())
                  }).filter(Boolean)

                  return (
                    <article key={task.id} className="activity-card" style={{ position: 'relative' }}>
                      <div className="activity-card__header">
                        <div style={{ paddingRight: '110px' }}>
                          <strong style={{ display: 'block' }}>{task.title}</strong>
                          <p style={{ margin: '4px 0 0' }}>{task.type} | {task.owner}</p>
                          
                          {contactObjects.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                              {contactObjects.map(c => (
                                <div key={c.id} className="tone-pill is-neutral" style={{ fontSize: '10px', padding: '2px 8px', height: 'auto', display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 700 }}>{c.name}</span>
                                  {(c.phone || c.email) && (
                                    <span style={{ opacity: 0.7, fontSize: '9px' }}>
                                      {c.phone ? `📞 ${c.phone}` : c.email ? `✉️ ${c.email}` : ''}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : task.contact ? (
                            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Contact: {task.contact}</p>
                          ) : null}
                        </div>
                        <div className="activity-card__badges" style={{ position: 'absolute', top: '8px', right: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span className={`tone-pill ${getToneClass(task.priority)}`}>{task.priority}</span>
                          <span className={`tone-pill ${getToneClass(task.status)}`}>{task.status}</span>
                          <button 
                            type="button" 
                            className="ghost-button" 
                            style={{ fontSize: '11px', padding: '2px 8px', marginTop: '4px', textDecoration: 'underline' }}
                            onClick={() => navigate('/pipeline', { state: { openDealId: task.dealId } })}
                          >
                            View
                          </button>
                        </div>
                      </div>
                      <p className="activity-notes" style={{ paddingRight: '110px' }}>
                        Linked to {linkedDeal?.name ?? 'manual task'}
                        {linkedDeal?.stage && (
                          <span className={`tone-pill ${getToneClass(linkedDeal.stage)}`} style={{ fontSize: '10px', padding: '1px 8px', marginLeft: '6px' }}>
                            {linkedDeal.stage}
                          </span>
                        )}
                        {task.companyName && <> for <strong>{task.companyName}</strong></>}.
                      </p>
                      {task.notes && (
                        <p className="activity-notes" style={{ marginTop: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          "{task.notes}"
                        </p>
                      )}
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

              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
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
              {focusQueue.map((task) => {
                const linkedDeal = deals.find((d) => d.id === task.dealId)
                return (
                  <article key={task.id} className="simple-list__item" style={{ position: 'relative' }}>
                    <div style={{ paddingRight: '110px' }}>
                      <strong style={{ display: 'block' }}>{task.title}</strong>
                      <p style={{ margin: '4px 0 0' }}>
                        {task.owner} | due {formatDateLabel(task.dueDate)}
                        {linkedDeal?.stage && (
                          <span className={`tone-pill ${getToneClass(linkedDeal.stage)}`} style={{ fontSize: '9px', padding: '1px 6px', marginLeft: '6px' }}>
                            {linkedDeal.stage}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="activity-card__badges" style={{ position: 'absolute', top: '8px', right: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          type="button" 
                          className="ghost-button" 
                          style={{ fontSize: '11px', padding: '0', textDecoration: 'underline' }}
                          onClick={() => navigate('/pipeline', { state: { openDealId: task.dealId } })}
                        >
                          View
                        </button>
                        <span className={`tone-pill ${getToneClass(task.priority)}`}>{task.priority}</span>
                      </div>
                      <span className={`tone-pill ${getToneClass(task.status)}`}>{task.status}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          </Panel>
        </div>
      </section>
    </>
  )
}
