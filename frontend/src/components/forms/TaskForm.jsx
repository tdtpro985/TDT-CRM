import { useState, useMemo, useEffect, useRef } from 'react'
import { apiFetch } from '../../api'
import { TASK_TYPES, TASK_PRIORITIES, STAGE_WORKFLOW } from '../../constants'
import { createRecordId } from '../../utils'
import Select from '../Select'

const IconDot = () => (
  <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
)

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
        id="company-select-input"
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

export default function TaskForm({
  onSubmit, onCancel, deals, companies, contacts = [], teamMembers = [],
  currentUser, taskTypes = TASK_TYPES, taskPriorities = TASK_PRIORITIES,
  dealStages = [], prefilledCompanyId = '',
  fetchDealContacts,
  customTaskTypes = [],
  onCreateCustomTaskType,
}) {
  const [taskForm, setTaskForm] = useState({
    title: '',
    type: taskTypes[1],
    owner: currentUser?.name || '',
    companyId: prefilledCompanyId,
    dealId: '',
    dueDate: '',
    priority: 'Medium',
    notes: '',
    dealStage: dealStages[0] ?? 'New Opportunity',
    dealValue: '',
    expectedClose: '',
    dealName: '',
  })

  const [errors, setErrors] = useState({})
  const [selectedContactIds, setSelectedContactIds] = useState([])
  const [hasManuallyInteracted, setHasManuallyInteracted] = useState(false)
  const hasManuallyInteractedRef = useRef(false)
  hasManuallyInteractedRef.current = hasManuallyInteracted

  const [isAddingType, setIsAddingType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeError, setNewTypeError] = useState('')

  const [fetchedContacts, setFetchedContacts] = useState([])
  
  // UI State
  const [section1Expanded, setSection1Expanded] = useState(false)


  // Dynamic Metadata State
  const [metadata, setMetadata] = useState({
    location: '',
    meetingLink: '',
    phoneNumber: '',
    emailSubject: '',
    internalNotes: ''
  })

  const canAssignSR = currentUser?.role === 'Head of Sales' || currentUser?.role === 'Regional Sales Manager'
  const allTaskTypes = [...taskTypes, ...customTaskTypes.map(t => t.name)]

  const activeDeals = useMemo(() => {
    if (!taskForm.companyId) return []
    const selectedCompany = companies.find(c => c.id === taskForm.companyId || c.name === taskForm.companyId)
    if (!selectedCompany) return []
    
    return deals
      .filter(d => (d.companyId === selectedCompany.id || d.companyId === selectedCompany.name) && 
                   d.stage !== 'Closed Won' && d.stage !== 'Closed Lost')
      .sort((a, b) => new Date(b.lastTouch || 0) - new Date(a.lastTouch || 0))
  }, [taskForm.companyId, companies, deals])

  // Fetch full company contacts from API
  useEffect(() => {
    if (!taskForm.companyId) {
      setFetchedContacts([])
      return
    }

    const selectedCompany = companies.find(c => c.id === taskForm.companyId || c.name === taskForm.companyId)
    if (!selectedCompany) return

    let isMounted = true
    apiFetch(`/api/customers/${selectedCompany.id}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.contacts) {
          setFetchedContacts(data.contacts)
        }
      })
      .catch(err => console.error('Error fetching contacts:', err))

    return () => { isMounted = false }
  }, [taskForm.companyId, companies])

  // Fetch deal contacts if deal changes
  useEffect(() => {
    if (taskForm.dealId && fetchDealContacts) {
      let isMounted = true
      fetchDealContacts(taskForm.dealId).then(data => {
        if (isMounted) {
          if (data && data.length > 0) {
            // If deal has specific contacts, we might want to prioritize them or add them to the list
            // For now, let's just make sure they are in the selectable list
            setFetchedContacts(prev => {
              const combined = [...prev, ...data]
              return Array.from(new Map(combined.map(c => [c.id, c])).values())
            })
            
            // Overwrite selection with deal contacts when deal changes
            if (!hasManuallyInteractedRef.current) {
              setSelectedContactIds(data.map(c => c.id))
            }
          } else {
            // If deal has no specific contacts, don't force clear what might be there from company defaults
            // But we should probably clear deal-specific selections if they were only there for the old deal
          }
        }
      })
      return () => { isMounted = false }
    }
  }, [taskForm.dealId, fetchDealContacts])

  const companyContacts = useMemo(() => {
    const selectedCompany = companies.find(c => c.id === taskForm.companyId || c.name === taskForm.companyId)
    if (!selectedCompany) return []

    // Filter global contacts prop
    const existing = contacts.filter(c => c.companyId === selectedCompany.id)
    
    // Combine with internal fetched contacts (removing duplicates by ID)
    const combined = [...existing, ...fetchedContacts]
    const unique = Array.from(new Map(combined.map(c => [c.id, c])).values())

    return unique.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [taskForm.companyId, companies, contacts, fetchedContacts])

  // Reset interaction flag when company or deal changes
  useEffect(() => {
    setHasManuallyInteracted(false)
  }, [taskForm.companyId, taskForm.dealId])

  // Auto-logic when company changes
  useEffect(() => {
    if (taskForm.companyId) {
      const selectedCompany = companies.find(c => c.id === taskForm.companyId || c.name === taskForm.companyId)
      if (selectedCompany) {
        if (activeDeals.length > 0) {
          const recentDeal = activeDeals[0]
          
          // Determine default type based on stage
          const stageConfig = STAGE_WORKFLOW[recentDeal.stage]
          const defaultType = stageConfig?.activityType || TASK_TYPES[1] // Default to 'Call'

          setTaskForm(prev => ({
            ...prev,
            dealId: recentDeal.id,
            dealStage: recentDeal.stage,
            dealValue: recentDeal.value,
            expectedClose: recentDeal.expectedClose || '',
            dealName: recentDeal.name,
            type: defaultType
          }))
          setSection1Expanded(false)
        } else {
          const defaultStage = dealStages[0] || 'New Opportunity'
          const stageConfig = STAGE_WORKFLOW[defaultStage]
          const defaultType = stageConfig?.activityType || TASK_TYPES[1]

          setTaskForm(prev => ({
            ...prev,
            dealId: '',
            dealStage: defaultStage,
            dealValue: '',
            expectedClose: '',
            dealName: prev.dealName || selectedCompany?.name || taskForm.companyId || '',
            type: defaultType
          }))
          setSection1Expanded(true)
        }
      }
    } else {
      setSection1Expanded(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskForm.companyId, activeDeals.length, companies, dealStages])

  // Auto-select contact if only 1 (and user hasn't overridden)
  useEffect(() => {
    if (!hasManuallyInteracted && companyContacts.length === 1) {
      setSelectedContactIds([companyContacts[0].id])
    } else if (!hasManuallyInteracted && companyContacts.length === 0 && !taskForm.dealId) {
      setSelectedContactIds([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyContacts.length, hasManuallyInteracted, taskForm.dealId])

  const availableSRs = useMemo(() => {
    if (!canAssignSR) return []
    if (!taskForm.companyId) return teamMembers
    const selectedCompany = companies.find(c => c.id === taskForm.companyId || c.name === taskForm.companyId)
    const branch = selectedCompany?.branch
    if (!branch) return teamMembers
    return teamMembers.filter(m => m.branch === branch)
  }, [taskForm.companyId, companies, teamMembers, canAssignSR])

  function handleChange(e) {
    const { name, value } = e.target
    setErrors(prev => ({ ...prev, [name]: '' }))
    setTaskForm(prev => {
      const next = { ...prev, [name]: value }
      
      if (name === 'dealId') {
        if (value) {
          const deal = activeDeals.find(d => d.id === value)
          if (deal) {
            next.dealStage = deal.stage
            next.dealValue = deal.value
            next.expectedClose = deal.expectedClose || ''
            next.dealName = deal.name
          }
        } else {
          // Reset deal fields for new deal (pre-fill name for leads without deals)
          const defaultStage = dealStages[0] ?? 'New Opportunity'
          next.dealStage = defaultStage
          next.dealValue = ''
          next.expectedClose = ''
          if (activeDeals.length === 0) {
            const company = companies.find(c => c.id === taskForm.companyId || c.name === taskForm.companyId)
            next.dealName = company?.name || taskForm.companyId || ''
          } else {
            next.dealName = ''
          }
        }
      }
      return next
    })
  }

  function handleDealValueChange(e) {
    const val = e.target.value.replace(/[^\d.]/g, '')
    setTaskForm(prev => ({ ...prev, dealValue: val }))
  }

  const formattedDealValue = useMemo(() => {
    if (taskForm.dealValue === '') return ''
    const num = parseFloat(taskForm.dealValue)
    if (isNaN(num)) return taskForm.dealValue
    return num.toLocaleString('en-US')
  }, [taskForm.dealValue])

  async function handleSubmit(e) {
    e.preventDefault()

    const newErrors = {}
    if (!taskForm.companyId) newErrors.companyId = 'Company is required'
    if (!taskForm.title.trim()) newErrors.title = 'Task title is required'
    if (!taskForm.dueDate) newErrors.dueDate = 'Due date is required'
    else if (taskForm.expectedClose && taskForm.dueDate > taskForm.expectedClose) {
      newErrors.dueDate = `Due date cannot be later than expected close (${taskForm.expectedClose})`
    }
    if (!taskForm.notes.trim()) newErrors.notes = 'Notes are required'

    if (taskForm.dealName.trim()) {
      const selectedCompany = companies.find(c => c.id === taskForm.companyId || c.name === taskForm.companyId)
      const duplicate = deals.find(d =>
        d.name.toLowerCase() === taskForm.dealName.trim().toLowerCase() &&
        (selectedCompany ? d.companyId === selectedCompany.id : false) &&
        d.id !== taskForm.dealId
      )
      if (duplicate) newErrors.dealName = `"${taskForm.dealName}" already exists for this company. Use a unique name or select the existing deal.`
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    const contactNames = selectedContactIds
      .map(id => companyContacts.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ')

    const finalMetadata = {
      ...metadata
    }

    onSubmit({
      ...taskForm,
      contact: contactNames,
      contactIds: selectedContactIds,
      metadata: finalMetadata
    })
  }

  const isNewDeal = !taskForm.dealId

  // Common UI segments
  const dealFields = (
    <>
      {activeDeals.length > 0 && (
        <label className="field field--span-2">
          <span>Linked Deal</span>
          <Select 
            value={taskForm.dealId}
            onChange={v => handleChange({ target: { name: 'dealId', value: v } })}
            options={[
              ...activeDeals.map(d => ({ value: d.id, label: `${d.name} (${d.stage})` })),
              { value: '', label: '+ Create new deal' }
            ]}
          />
        </label>
      )}

      <div className="field--span-2">
        <div className="u-flex-between u-flex-center u-margin-b-8">
          <div className="u-flex-center-gap-sm">
            <span className="u-fs-xs u-font-600 u-text-muted">Contacts</span>
            {taskForm.dealId && selectedContactIds.length > 0 && (
              <span className="tone-pill is-active u-fs-10 u-pad-1-8 u-h-auto u-accent-bg-soft u-positive u-border-positive-soft">
                Deal contacts accounted for
              </span>
            )}
          </div>
        </div>

        <div className="admin-table-wrap u-max-h-120 u-overflow-y-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="u-w-30px"></th>
                <th>Name</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {companyContacts.length === 0 ? (
                <tr><td colSpan={3} className="u-text-center u-text-muted u-pad-12">No contacts found</td></tr>
              ) : (
                companyContacts.map(c => (
                  <tr 
                    key={c.id} 
                    className={`u-cursor-pointer ${selectedContactIds.includes(c.id) ? 'u-accent-bg-soft' : ''}`}
                    onClick={() => {
                      setHasManuallyInteracted(true)
                      setSelectedContactIds(prev => 
                        prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                      )
                    }}
                  >
                    <td><input type="checkbox" checked={selectedContactIds.includes(c.id)} readOnly /></td>
                    <td>{c.name}</td>
                    <td className="u-fs-11">{c.role || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <label className="field">
        <span>Deal stage</span>
        <Select 
          value={taskForm.dealStage}
          onChange={v => handleChange({ target: { name: 'dealStage', value: v } })}
          options={dealStages.map(s => ({ value: s, label: s }))}
          readOnly={!isNewDeal}
        />
      </label>

      <label className="field">
        <span>Deal value</span>
        <input name="dealValue" value={formattedDealValue} onChange={handleDealValueChange} placeholder="Enter value" inputMode="numeric" />
      </label>

      <label className="field">
        <span>Expected close</span>
        <input name="expectedClose" type="date" value={taskForm.expectedClose} onChange={handleChange} />
      </label>
    </>
  )

  const taskFields = (
    <>
      <label className="field">
        <span>Task title</span>
        <input name="title" value={taskForm.title} onChange={handleChange} placeholder="Enter task title" className={errors.title ? 'u-border-alert' : ''} />
        {errors.title && <p className="u-fs-10 u-alert u-margin-t-4">{errors.title}</p>}
      </label>

      <label className="field">
        <span>Follow-up</span>
        <Select
          value={taskForm.type}
          onChange={v => handleChange({ target: { name: 'type', value: v } })}
          options={allTaskTypes.map(t => ({ value: t, label: t }))}
        />
      </label>
      {canAssignSR && !isAddingType && (
        <button type="button" className="ghost-button u-fs-xs u-margin-t-6"
          onClick={() => setIsAddingType(true)}>
          + Add new type
        </button>
      )}

      {canAssignSR && isAddingType && (
        <div className="field">
          <span className="u-fs-xs u-font-600 u-text-muted u-block u-margin-b-6">New type name</span>
          <div className="u-flex-center-gap-sm">
            <input
              value={newTypeName}
              onChange={e => { setNewTypeName(e.target.value); setNewTypeError('') }}
              placeholder="e.g. Site Visit, Demo..."
              className={newTypeError ? 'u-border-alert' : ''}
              autoFocus
            />
            <button type="button" className="ghost-button u-text-accent" onClick={async () => {
              if (!newTypeName.trim()) { setNewTypeError('Enter a type name'); return }
              try {
                const created = await onCreateCustomTaskType(createRecordId('ttype'), newTypeName.trim())
                handleChange({ target: { name: 'type', value: created.name } })
                setIsAddingType(false)
                setNewTypeName('')
              } catch (err) {
                setNewTypeError(err.message)
              }
            }}>Save</button>
            <button type="button" className="ghost-button" onClick={() => {
              setIsAddingType(false); setNewTypeName(''); setNewTypeError('')
            }}>Cancel</button>
          </div>
          {newTypeError && <p className="u-fs-10 u-alert u-margin-t-4">{newTypeError}</p>}
        </div>
      )}

      {/* Dynamic Metadata Fields */}

      {taskForm.type === 'Meeting' && (
        <>
          <label className="field">
            <span>Location / Link</span>
            <input 
              value={metadata.location || ''} 
              onChange={e => setMetadata({...metadata, location: e.target.value})} 
              placeholder="Address or Meeting URL" 
            />
          </label>
        </>
      )}


      {canAssignSR && (
        <label className="field">
          <span>Assign SR</span>
          <input
            name="owner"
            value={taskForm.owner}
            onChange={handleChange}
            placeholder="Type or select a representative..."
            list="sr-suggestions"
            autoComplete="off"
          />
          <datalist id="sr-suggestions">
            {availableSRs.map(m => <option key={m.id} value={m.name}>{m.name} ({m.branch})</option>)}
          </datalist>
        </label>
      )}

      <label className="field">
        <span>Due date</span>
        <input
          name="dueDate"
          type="date"
          value={taskForm.dueDate}
          onChange={handleChange}
          max={taskForm.expectedClose || undefined}
          className={errors.dueDate ? 'u-border-alert' : ''}
        />
        {errors.dueDate && <p className="u-fs-10 u-alert u-margin-t-4">{errors.dueDate}</p>}
      </label>

      <label className="field">
        <span>Priority</span>
        <Select 
          value={taskForm.priority}
          onChange={v => handleChange({ target: { name: 'priority', value: v } })}
          options={taskPriorities.map(p => ({ value: p, label: p }))}
        />
      </label>

      <label className="field field--span-2">
        <span>Description / Notes</span>
        <textarea name="notes" value={taskForm.notes} onChange={handleChange} placeholder="Enter task details..." className={`u-min-h-80 ${errors.notes ? 'u-border-alert' : ''}`} />
        {errors.notes && <p className="u-fs-10 u-alert u-margin-t-4">{errors.notes}</p>}
      </label>
    </>
  )

  const hasDeals = activeDeals.length > 0

  return (
    <form className="form-grid form-body" onSubmit={handleSubmit}>
      {/* ALWAYS TOP: COMPANY AND DEAL NAME */}
      <label className="field">
        <span>Company</span>
        <CompanyCombobox companies={companies} companyId={taskForm.companyId} onChange={handleChange} />
        {errors.companyId && <p className="u-fs-10 u-alert u-margin-t-4">{errors.companyId}</p>}
      </label>

      <label className="field">
        <span>Deal Name</span>
        <input
          name="dealName"
          value={taskForm.dealName}
          onChange={handleChange}
          placeholder="Deal name"
          autoComplete="off"
          readOnly={!isNewDeal && !section1Expanded}
          className={`${!isNewDeal && !section1Expanded ? 'input--readonly' : ''} ${errors.dealName ? 'u-border-alert' : ''}`}
        />
        {errors.dealName && <p className="u-fs-10 u-alert u-margin-t-4">{errors.dealName}</p>}
      </label>

      {!hasDeals ? (
        <>
          {/* CASE: NO DEALS - DEAL SECTION FIRST (AUTO-EXPANDED) */}
          <div className="form-section-header">
            <span className="form-section-label u-flex-center-gap-sm">
              <IconDot /> Deal (New)
            </span>
          </div>
          {dealFields}

          <div className="form-section-header u-margin-v-8">
            <span className="form-section-label u-flex-center-gap-sm">
              <IconDot /> Task
            </span>
          </div>
          {taskFields}
        </>
      ) : (
        <>
          {/* CASE: HAS DEALS - TASK SECTION FIRST */}
          <div className="form-section-header">
            <span className="form-section-label u-flex-center-gap-sm">
              <IconDot /> Task
            </span>
          </div>
          {taskFields}

          <div className="form-section-header is-flex u-margin-v-8">
            <span className="form-section-label u-flex-center-gap-sm">
              <IconDot /> Deal ({activeDeals.length} Linked)
            </span>
            <button 
              type="button" 
              className="ghost-button u-fs-xs u-text-accent u-pad-2-8"
              onClick={() => setSection1Expanded(!section1Expanded)}
            >
              {section1Expanded ? 'Collapse' : 'Expand Options'}
            </button>
          </div>
          {section1Expanded && dealFields}
        </>
      )}

      <div className="form-actions field--span-2 u-margin-t-12">
        <button type="submit" className="primary-button">Save task</button>
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
