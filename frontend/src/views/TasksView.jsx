import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import { formatDueDate, getToneClass, getPaginatedData, matchesSearch, isSrRole } from '../utils'
import { ITEMS_PER_PAGE } from '../constants'

import Pagination from '../components/Pagination'

import { IconPhone, IconCalendar, IconMail, IconClipboard, IconMapPin } from '../components/Icons'

const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
)
const IconQuote = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
)
const IconChevronDown = ({ expanded }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`u-transition-transform ${expanded ? 'u-rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
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
          <strong className="activity-card__title u-flex-center-gap-sm">
            <span className="u-accent u-flex">{TypeIcon}</span>
            {task.title}
          </strong>
        </div>
        {linkedDeal?.stage && (
          <span className={`tone-pill ${getToneClass(linkedDeal.stage)} u-fs-9 u-pad-1-6`}>
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
                <div key={c.id} className="u-margin-b-8">
                  <div className="activity-card__contact-primary">
                    <IconUser />
                    <span>{displayName}{displayRole ? ` - ${displayRole}` : ''}</span>
                  </div>
                  <div className="activity-card__contact-details">
                    <span className={`activity-card__contact-item ${!c.phone ? 'u-text-muted u-italic u-opacity-06 u-fs-10' : ''}`}>
                      <IconPhone /> {c.phone || 'No phone on file'}
                    </span>
                    <span className={`activity-card__contact-item ${!c.email ? 'u-text-muted u-italic u-opacity-06 u-fs-10' : ''}`}>
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
              {metadata.location && <p className="activity-card__metadata-item"><strong><IconMapPin /> Location:</strong> {metadata.location}</p>}
              {metadata.emailSubject && <p className="activity-card__metadata-item"><strong><IconMail /> Subject:</strong> {metadata.emailSubject}</p>}
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
  onClearSearch,
  currentUser
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [taskFilter, setTaskFilter] = useState('open')
  const [currentPage, setCurrentPage] = useState(1)
  const [highlightedTaskId, setHighlightedTaskId] = useState(null)
  const [pinnedTaskId, setPinnedTaskId] = useState(null)
  const [clearingSearch, setClearingSearch] = useState(false)
  const isSr = isSrRole(currentUser?.role)

  const companyMap = useMemo(() => Object.fromEntries((companies ?? []).map((c) => [c.id, c])), [companies])

  // Reset page on search change (adjusting state during render)
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery)
  if (searchQuery !== prevSearchQuery && !clearingSearch) {
    setPrevSearchQuery(searchQuery)
    setCurrentPage(1)
    setPinnedTaskId(null)
  } else if (clearingSearch && searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery)
    setClearingSearch(false)
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
          matchesSearch(searchQuery, [t.resolvedCompanyName])
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

  const handleFocusTaskClick = useCallback((task) => {
    setHighlightedTaskId(task.id)
    setPinnedTaskId(task.id)
    setClearingSearch(true)
    onClearSearch()

    // Ensure filter allows the task to be seen
    if (taskFilter !== 'all' && taskFilter !== 'open') {
      setTaskFilter('open')
    }

    // Task will now be at the top of page 1 due to pinning
    setCurrentPage(1)
  }, [taskFilter, onClearSearch])

  // Handle cross-view navigation highlights (e.g. from Dashboard)
  useEffect(() => {
    if (location.state?.highlightTaskId) {
      const task = tasks.find(t => t.id === location.state.highlightTaskId)
      if (task) {
        // Clear state so it doesn't re-trigger
        navigate(location.pathname, { replace: true, state: {} })
        
        // Wrap in setTimeout to avoid synchronous setState in effect (eslint error)
        setTimeout(() => {
          handleFocusTaskClick(task)
        }, 0)
      }
    }
  }, [location.state, tasks, navigate, location.pathname, handleFocusTaskClick])

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
                        <div className={`activity-group-header ${idx > 0 ? 'u-margin-t-24' : ''}`}>
                          <div className="activity-group-header__content">
                            <span className="activity-group-header__kicker">Company</span>
                            <strong className="activity-group-header__title">{task.resolvedCompanyName}</strong>
                          </div>
                          <div className="activity-group-header__line" />
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
                    className={`simple-list__item ${priorityClass} u-border-l-3-transparent u-cursor-pointer`}
                    onClick={() => handleFocusTaskClick(task)}
                  >
                    <div className="u-flex-1 u-min-w-0">
                      <strong className="u-block u-truncate">
                        {task.title}
                      </strong>
                      <div className="u-flex-column u-margin-t-4">
                        <span className="u-fs-10 u-text-muted u-font-700 u-truncate">
                          {task.companyName || (deals.find(d => d.id === task.dealId)?.companyName) || 'Manual Task'}
                        </span>
                        <p className="u-fs-11 u-text-muted u-margin-t-2">
                          {!isSr ? `${task.owner} | ` : ''}due {formatDueDate(task.dueDate)}
                          {linkedDeal?.stage && (
                            <span className={`tone-pill ${getToneClass(linkedDeal.stage)} u-fs-9 u-pad-1-6 u-ml-6`}>
                              {linkedDeal.stage}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="u-shrink-0 u-ml-12">
                      <button 
                        type="button" 
                        className="ghost-button u-fs-11 u-pad-4-8" 
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
