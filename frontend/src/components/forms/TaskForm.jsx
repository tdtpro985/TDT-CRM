import { useState, useMemo, useEffect, useRef } from 'react'
import { createRecordId } from '../../utils'
import { apiFetch } from '../../api'
import { TASK_TYPES, TASK_PRIORITIES, STAGE_WORKFLOW } from '../../constants'
import Select from '../Select'

const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
)

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
  dealStages = [], prefilledCompanyId = '', fetchCompanies, fetchContacts,
  fetchDealContacts
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

  const [selectedContactIds, setSelectedContactIds] = useState([])
  const [hasManuallyInteracted, setHasManuallyInteracted] = useState(false)
  const hasManuallyInteractedRef = useRef(false)
  hasManuallyInteractedRef.current = hasManuallyInteracted
  
  const [fetchedContacts, setFetchedContacts] = useState([])
  
  // UI State
  const [section1Expanded, setSection1Expanded] = useState(false)
  const [addingContact, setAddingContact] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', role: '', email: '', phone: '' })
  const [contactErrors, setContactErrors] = useState({})


  // Dynamic Metadata State
  const [metadata, setMetadata] = useState({
    location: '',
    meetingLink: '',
    phoneNumber: '',
    emailSubject: '',
    internalNotes: ''
  })

  const canAssignSR = currentUser?.role === 'Head of Sales' || currentUser?.role === 'Regional Sales Manager'

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
            dealName: '',
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
          // Reset deal fields for new deal
          const defaultStage = dealStages[0] ?? 'New Opportunity'
          next.dealStage = defaultStage
          next.dealValue = ''
          next.expectedClose = ''
          next.dealName = ''
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

  async function handleAddContact() {
    const errors = {}
    if (!newContact.name.trim()) errors.name = 'Required'
    
    // Philippines format check: +63 or 09
    const phonePattern = /^(?:\+63|0)9\d{9}$/
    if (newContact.phone && !phonePattern.test(newContact.phone.replace(/\s/g, ''))) {
      errors.phone = 'Invalid (+639...)'
    }

    // Basic email check
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (newContact.email && !emailPattern.test(newContact.email)) {
      errors.email = 'Invalid email'
    }

    if (!newContact.email && !newContact.phone) {
      errors.phone = 'Need phone or email'
      errors.email = 'Need phone or email'
    }

    if (Object.keys(errors).length > 0) {
      setContactErrors(errors)
      return
    }

    setContactErrors({})
    
    let companyIdToUse = taskForm.companyId
    let selectedCompany = companies.find(c => c.id === taskForm.companyId || c.name === taskForm.companyId)

    // If company doesn't exist, create it first
    if (!selectedCompany && taskForm.companyId) {
      const newCompanyId = createRecordId('company')
      const companyPayload = {
        id: newCompanyId,
        name: taskForm.companyId.trim(),
        status: 'Active'
      }
      try {
        const cRes = await apiFetch('/api/companies', { method: 'POST', body: JSON.stringify(companyPayload) })
        if (cRes.ok) {
          selectedCompany = await cRes.json()
          companyIdToUse = selectedCompany.id
          // Update parent form so it knows the new ID
          setTaskForm(prev => ({ ...prev, companyId: companyIdToUse }))
          if (fetchCompanies) fetchCompanies()
        } else {
          console.error('Failed to create company for new contact')
          return
        }
      } catch (err) {
        console.error('Error creating company:', err)
        return
      }
    }

    if (!selectedCompany) return

    // Clean phone number to +63 format if it starts with 09
    let cleanPhone = newContact.phone.replace(/\s/g, '')
    if (cleanPhone.startsWith('09')) {
      cleanPhone = '+63' + cleanPhone.substring(1)
    }

    const payload = {
      id: createRecordId('contact'),
      name: newContact.name.trim(),
      email: newContact.email.trim(),
      phone: cleanPhone,
      role: newContact.role.trim(),
      companyId: selectedCompany.id,
      status: 'Active'
    }

    try {
      const res = await apiFetch('/api/contacts', { method: 'POST', body: JSON.stringify(payload) })
    if (res.ok) {
      const saved = await res.json()
      setHasManuallyInteracted(true)
      setSelectedContactIds(prev => [...prev, saved.id])

        setAddingContact(false)
        setNewContact({ name: '', email: '', phone: '', role: '' })
        if (fetchContacts) fetchContacts()
      } else if (res.status === 409) {
        const errData = await res.json()
        setContactErrors({ global: errData.error || 'Contact already exists' })
      } else {
        const errData = await res.json()
        setContactErrors({ global: errData.error || 'Failed to add contact' })
      }
    } catch (err) {
      console.error('Failed to add contact:', err)
      setContactErrors({ global: 'Network error occurred' })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (taskForm.expectedClose && taskForm.dueDate > taskForm.expectedClose) {
      alert(`The task due date (${taskForm.dueDate}) cannot be later than the deal's expected close date (${taskForm.expectedClose}).`)
      return
    }

    if (taskForm.dealName.trim()) {
      const selectedCompany = companies.find(c => c.id === taskForm.companyId || c.name === taskForm.companyId)
      const duplicate = deals.find(d => 
        d.name.toLowerCase() === taskForm.dealName.trim().toLowerCase() && 
        (selectedCompany ? d.companyId === selectedCompany.id : false) &&
        d.id !== taskForm.dealId
      )
      if (duplicate) {
        alert(`A deal named "${taskForm.dealName}" already exists for this company. Please use a unique name or select the existing deal.`)
        return
      }
    }

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
          <button 
            type="button" 
            className="ghost-button u-fs-11 u-pad-2-6" 
            onClick={() => setAddingContact(!addingContact)}
          >
            {addingContact ? 'Cancel' : '+ Add Contact'}
          </button>
        </div>

        {addingContact && (
          <div className="u-bg-white-03 u-r-md u-pad-16 u-margin-b-16 u-border">
            {contactErrors.global && (
              <div className="u-alert-bg-soft u-alert u-pad-10-14 u-r-md u-fs-11 u-font-600 u-margin-b-12 u-border-alert-soft u-flex-center-gap-sm">
                <IconAlert /> {contactErrors.global}
              </div>
            )}
            <div className="form-grid u-margin-0 u-gap-12">
              <label className="field">
                <span className="u-flex-between">
                  Contact Name {contactErrors.name && <span className="u-text-red u-fs-10">{contactErrors.name}</span>}
                </span>
                <input 
                  placeholder="Full name" 
                  value={newContact.name} 
                  onChange={e => setNewContact({...newContact, name: e.target.value})} 
                  className={contactErrors.name ? 'u-border-red' : ''}
                />
              </label>
              <label className="field">
                <span>Role</span>
                <input 
                  placeholder="e.g. Manager, Owner" 
                  value={newContact.role} 
                  onChange={e => setNewContact({...newContact, role: e.target.value})} 
                />
              </label>
              <label className="field">
                <span className="u-flex-between">
                  Phone number {contactErrors.phone && <span className="u-text-red u-fs-10">{contactErrors.phone}</span>}
                </span>
                <input 
                  placeholder="+63..." 
                  value={newContact.phone} 
                  onChange={e => setNewContact({...newContact, phone: e.target.value})} 
                  className={contactErrors.phone ? 'u-border-red' : ''}
                />
              </label>
              <label className="field">
                <span className="u-flex-between">
                  Email address {contactErrors.email && <span className="u-text-red u-fs-10">{contactErrors.email}</span>}
                </span>
                <input 
                  placeholder="name@company.com" 
                  value={newContact.email} 
                  onChange={e => setNewContact({...newContact, email: e.target.value})} 
                  className={contactErrors.email ? 'u-border-red' : ''}
                />
              </label>
            </div>
            <div className="u-flex u-flex-gap-sm u-justify-end u-margin-t-16">
              <button 
                type="button" 
                className="secondary-button u-pad-6-14 u-fs-xs"
                onClick={() => {
                  setAddingContact(false)
                  setNewContact({ name: '', email: '', phone: '', role: '' })
                }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="primary-button u-pad-6-14 u-fs-xs"
                onClick={handleAddContact}
              >
                Create Contact
              </button>
            </div>
          </div>
        )}

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
        <input name="title" value={taskForm.title} onChange={handleChange} placeholder="Enter task title" required />
      </label>

      <label className="field">
        <span>Follow-up</span>
        <Select 
          value={taskForm.type}
          onChange={v => handleChange({ target: { name: 'type', value: v } })}
          options={taskTypes.map(t => ({ value: t, label: t }))}
        />
      </label>

      {/* Dynamic Metadata Fields */}
      {taskForm.type === 'Call' && (
        <label className="field">
          <span>Phone Number</span>
          <input 
            value={metadata.phoneNumber || ''} 
            onChange={e => setMetadata({...metadata, phoneNumber: e.target.value})} 
            placeholder="+63..." 
          />
          {taskForm.dealId && selectedContactIds.length > 0 && (
            <small className="u-text-muted u-fs-10 u-margin-t-4 u-block">
              Contacts already accounted for — dial number or type to add a new contact
            </small>
          )}
        </label>
      )}

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

      {taskForm.type === 'Email' && (
        <label className="field">
          <span>Email Subject</span>
          <input 
            value={metadata.emailSubject || ''} 
            onChange={e => setMetadata({...metadata, emailSubject: e.target.value})} 
            placeholder="Re: Opportunity..." 
          />
          {taskForm.dealId && selectedContactIds.length > 0 && (
            <small className="u-text-muted u-fs-10 u-margin-t-4 u-block">
              Contacts already accounted for — write subject or type to add a new contact
            </small>
          )}
        </label>
      )}

      {canAssignSR && (
        <label className="field">
          <span>Assign SR</span>
          <Select 
            value={taskForm.owner}
            onChange={v => handleChange({ target: { name: 'owner', value: v } })}
            options={availableSRs.map(m => ({ value: m.name, label: `${m.name} (${m.branch})` }))}
            placeholder="Select Representative"
          />
        </label>
      )}

      <label className="field">
        <span>Due date</span>
        <input 
          name="dueDate" 
          type="date" 
          value={taskForm.dueDate} 
          onChange={handleChange} 
          required 
          max={taskForm.expectedClose || undefined}
        />
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
        <textarea name="notes" value={taskForm.notes} onChange={handleChange} placeholder="Enter task details..." required className="u-min-h-80" />
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
      </label>

      <label className="field">
        <span>Deal Name</span>
        <input 
          name="dealName" 
          value={taskForm.dealName} 
          onChange={handleChange} 
          placeholder="Deal name" 
          required 
          autoComplete="off"
          readOnly={!isNewDeal && !section1Expanded}
          className={!isNewDeal && !section1Expanded ? 'input--readonly' : ''}
        />
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
