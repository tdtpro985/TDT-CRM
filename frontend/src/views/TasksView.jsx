import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import { formatDueDate, getToneClass, getPaginatedData, matchesSearch, isSrRole } from '../utils'
import { ITEMS_PER_PAGE } from '../constants'

import Pagination from '../components/Pagination'

// Inline SVG Icons
const IconPhone = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
)
const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
)
const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
)
const IconClipboard = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
)
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
)
const IconQuote = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
)
const IconChevronDown = ({ expanded }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
)

function TaskCard({ task, linkedDeal, contactObjects, metadata, handleTaskStatusToggle, isHighlighted }) {
  const [expanded, setExpanded] = useState(false)
  
  const TypeIcon = useMemo(() => {
    switch(task.type) {
      case 'Call': return <IconPhone />
      case 'Meeting': return <IconCalendar />
      case 'Email': return <IconMail />
      default: return <IconClipboard />
    }
  }, [task.type])

  const priorityClass = useMemo(() => {
    const p = task.priority.toLowerCase()
    return `is-priority-${p}`
  }, [task.priority])

  return (
    <article id={`task-card-${task.id}`} className={`activity-card ${priorityClass} ${isHighlighted ? 'is-highlighted' : ''}`}>
      <div className="activity-card__header">
        <div className="activity-card__main-content">
          <strong className="activity-card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}>{TypeIcon}</span>
            {task.title}
          </strong>
        </div>
        {linkedDeal?.stage && (
          <span className={`tone-pill ${getToneClass(linkedDeal.stage)}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
            {linkedDeal.stage}
          </span>
        )}
      </div>

      <div className="activity-card__deal-line">
        <span>{linkedDeal?.name ?? task.dealName ?? 'Manual Task'}</span>
      </div>

      <hr className="activity-card__separator" />

      {task.type !== 'Internal' && (
        <div className="activity-card__contact-line">
          {contactObjects.length > 0 ? (
            contactObjects.map(c => {
              const displayName = c.name || 'Unknown Contact'
              const displayRole = c.role
              
              return (
                <div key={c.id} style={{ marginBottom: '8px' }}>
                  <div className="activity-card__contact-primary">
                    <IconUser />
                    <span>{displayName}{displayRole ? ` - ${displayRole}` : ''}</span>
                  </div>
                  <div className="activity-card__contact-details">
                    <span className="activity-card__contact-item" style={!c.phone ? { color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.6, fontSize: '10px' } : {}}>
                      <IconPhone /> {c.phone || 'No phone on file'}
                    </span>
                    <span className="activity-card__contact-item" style={!c.email ? { color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.6, fontSize: '10px' } : {}}>
                      <IconMail /> {c.email || 'No email on file'}
                    </span>
                  </div>
                </div>
              )
            })
          ) : task.contact ? (
            <div className="activity-card__contact-primary">
              <IconUser />
              <span>{task.contact}</span>
            </div>
          ) : null}
        </div>
      )}

      {task.notes && (
        <div className="activity-card__notes-line">
          <IconQuote />
          <span>"{task.notes}"</span>
        </div>
      )}

      {(metadata.location || metadata.emailSubject) && (
        <>
          <button type="button" className="activity-card__expand-btn" onClick={() => setExpanded(!expanded)}>
            <IconChevronDown expanded={expanded} />
            {expanded ? 'Hide details' : 'Show details'}
          </button>
          
          {expanded && (
            <div className="activity-card__details-panel">
              {metadata.location && <p className="activity-card__metadata-item"><strong>📍 Location:</strong> {metadata.location}</p>}
              {metadata.emailSubject && <p className="activity-card__metadata-item"><strong>✉️ Subject:</strong> {metadata.emailSubject}</p>}
            </div>
          )}
        </>
      )}

      <div className="activity-card__footer">
        <span>{formatDueDate(task.dueDate)}</span>
        <button type="button" className="ghost-button" onClick={() => handleTaskStatusToggle(task.id, task.status)}>
          {task.status === 'Completed' ? 'Reopen task' : 'Mark complete'}
        </button>
      </div>
    </article>
  )
}

export default function TasksView({
  tasks,
  contacts,
  openTasks,
  dueToday,
  deals,
  companies,
  dealContactMap,
  handleTaskStatusToggle,
  searchQuery,
  currentUser
}) {
  const navigate = useNavigate()
  const [taskFilter, setTaskFilter] = useState('open')
  const [currentPage, setCurrentPage] = useState(1)
  const [highlightedTaskId, setHighlightedTaskId] = useState(null)
  const [pinnedTaskId, setPinnedTaskId] = useState(null)
  const isSr = isSrRole(currentUser?.role)

  const companyMap = useMemo(() => Object.fromEntries((companies ?? []).map((c) => [c.id, c])), [companies])

  // Reset page on search change (adjusting state during render)
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery)
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery)
    setCurrentPage(1)
    setPinnedTaskId(null)
  }

  const filteredTasks = useMemo(() => {
    const enriched = tasks.map(t => {
      const deal = deals.find((d) => d.id === t.dealId)
      return {
        ...t,
        resolvedCompanyName: t.companyName || companyMap[deal?.companyId]?.name || 'Unknown Company'
      }
    })

    return enriched.filter(
      (t) => {
        const deal = deals.find((d) => d.id === t.dealId)
        
        return (
          (taskFilter === 'all' || 
           (taskFilter === 'open' && t.status === 'Open') || 
           (taskFilter === 'completed' && t.status === 'Completed') ||
           (taskFilter === 'reopened' && t.status === 'Reopened')) &&
          matchesSearch(searchQuery, [t.title, t.type, t.owner, deal?.name, t.resolvedCompanyName])
        )
      }
    ).sort((a, b) => {
      // Pin priority
      if (a.id === pinnedTaskId) return -1
      if (b.id === pinnedTaskId) return 1
      
      // Sort by createdAt descending (most recent first)
      return (b.createdAt || '').localeCompare(a.createdAt || '')
    })
  }, [tasks, taskFilter, searchQuery, deals, companyMap, pinnedTaskId])

  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE)

  const paginatedTasks = useMemo(() => getPaginatedData(filteredTasks, currentPage, ITEMS_PER_PAGE), [filteredTasks, currentPage])

  // Scroll to and highlight task
  useEffect(() => {
    if (!highlightedTaskId) return

    const timer = setTimeout(() => {
      const el = document.getElementById(`task-card-${highlightedTaskId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)

    const clearTimer = setTimeout(() => {
      setHighlightedTaskId(null)
    }, 3000)

    return () => {
      clearTimeout(timer)
      clearTimeout(clearTimer)
    }
  }, [highlightedTaskId])

  const handleFocusTaskClick = (task) => {
    setHighlightedTaskId(task.id)
    setPinnedTaskId(task.id)

    // Ensure filter allows the task to be seen
    if (taskFilter !== 'all' && taskFilter !== 'open') {
      setTaskFilter('open')
    }

    // Task will now be at the top of page 1 due to pinning
    setCurrentPage(1)
  }

  const PRIORITY_ORDER = { 'High': 0, 'Medium': 1, 'Low': 2 }
  const focusQueue = [...openTasks]
    .sort((a, b) => {
      // Primary: Due date ascending
      const dateCompare = (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
      if (dateCompare !== 0) return dateCompare
      
      // Secondary: Priority (High before Medium before Low)
      return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
    })
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
                      setPinnedTaskId(null)
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
                {paginatedTasks.map((task, idx) => {
                  const linkedDeal = deals.find((d) => d.id === task.dealId)
                  const prevTask = idx > 0 ? paginatedTasks[idx - 1] : null
                  const showHeader = !prevTask || prevTask.resolvedCompanyName !== task.resolvedCompanyName

                  // Resolve enriched contact info: Prefer deal_contacts map, fall back to name-string parsing
                  const dealContacts = linkedDeal ? (dealContactMap[linkedDeal.id] || []) : []
                  const contactObjects = dealContacts.length > 0
                    ? dealContacts
                    : (task.contact || '').split(', ').map(name => {
                        return contacts.find(c => c.name.toLowerCase() === name.toLowerCase())
                      }).filter(Boolean)

                  const metadata = typeof task.metadata === 'string' ? JSON.parse(task.metadata || '{}') : (task.metadata || {})

                  return (
                    <div key={task.id}>
                      {showHeader && (
                        <div className="activity-group-header" style={{ marginTop: idx > 0 ? '24px' : '0' }}>
                          {task.resolvedCompanyName}
                        </div>
                      )}
                      
                      <TaskCard 
                        task={task}
                        linkedDeal={linkedDeal}
                        contactObjects={contactObjects}
                        metadata={metadata}
                        handleTaskStatusToggle={handleTaskStatusToggle}
                        isHighlighted={highlightedTaskId === task.id}
                      />
                    </div>
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
                const priorityClass = `is-priority-${task.priority.toLowerCase()}`
                
                return (
                  <article 
                    key={task.id} 
                    className={`simple-list__item ${priorityClass}`} 
                    style={{ borderLeft: '3px solid transparent', cursor: 'pointer' }}
                    onClick={() => handleFocusTaskClick(task)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.title}
                      </strong>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {!isSr ? `${task.owner} | ` : ''}due {formatDueDate(task.dueDate)}
                        {linkedDeal?.stage && (
                          <span className={`tone-pill ${getToneClass(linkedDeal.stage)}`} style={{ fontSize: '9px', padding: '1px 6px', marginLeft: '6px' }}>
                            {linkedDeal.stage}
                          </span>
                        )}
                      </p>
                    </div>
                    <div style={{ flexShrink: 0, marginLeft: '12px' }}>
                      <button 
                        type="button" 
                        className="ghost-button" 
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => navigate('/pipeline', { state: { openDealId: task.dealId } })}
                      >
                        View
                      </button>
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
