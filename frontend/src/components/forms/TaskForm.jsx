import { useState, useMemo, useEffect } from 'react'
import { createRecordId } from '../../utils'
import { apiFetch } from '../../api'
import { TASK_TYPES, TASK_PRIORITIES } from '../../constants'
import Select from '../Select'

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
  onSubmit, onCancel, deals, companies, teamMembers = [],
  currentUser, taskTypes = TASK_TYPES, taskPriorities = TASK_PRIORITIES,
  dealStages = [], prefilledCompanyId = ''
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
  const [section1Expanded, setSection1Expanded] = useState(false)
  const [addingContact, setAddingContact] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', role: '' })
  const [contactErrors, setContactErrors] = useState({})
  const [fetchedContacts, setFetchedContacts] = useState([])

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

  const companyContacts = useMemo(() => {
    const combined = [...fetchedContacts]
    return combined.sort((a, b) => a.name.localeCompare(b.name))
  }, [fetchedContacts])

  // Auto-logic when company changes
  useEffect(() => {
    if (taskForm.companyId) {
      const selectedCompany = companies.find(c => c.id === taskForm.companyId || c.name === taskForm.companyId)
      if (selectedCompany) {
        if (activeDeals.length > 0) {
          const recentDeal = activeDeals[0]
          setTaskForm(prev => ({
            ...prev,
            dealId: recentDeal.id,
            dealStage: recentDeal.stage,
            dealValue: recentDeal.value,
            expectedClose: recentDeal.expectedClose || '',
            dealName: recentDeal.name
          }))
          setSection1Expanded(false)
        } else {
          setTaskForm(prev => ({
            ...prev,
            dealId: '',
            dealStage: dealStages[0] || 'New Opportunity',
            dealValue: '',
            expectedClose: '',
            dealName: `Deal - ${selectedCompany.name}`
          }))
          setSection1Expanded(true)
        }
      }
    } else {
      setSection1Expanded(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskForm.companyId, activeDeals.length, companies, dealStages])

  // Auto-select contact if only 1
  useEffect(() => {
    if (companyContacts.length === 1) {
      setSelectedContactIds([companyContacts[0].id])
    } else {
      setSelectedContactIds([])
    }
  }, [companyContacts.length, companyContacts])

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
      
      if (name === 'dealId' && value) {
        const deal = activeDeals.find(d => d.id === value)
        if (deal) {
          next.dealStage = deal.stage
          next.dealValue = deal.value
          next.expectedClose = deal.expectedClose || ''
          next.dealName = deal.name
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
    if (!taskForm.companyId) return

    const selectedCompany = companies.find(c => c.id === taskForm.companyId || c.name === taskForm.companyId)
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
        setFetchedContacts(prev => [...prev, saved])
        setSelectedContactIds(prev => [...prev, saved.id])
        setAddingContact(false)
        setNewContact({ name: '', email: '', phone: '', role: '' })
      }
    } catch (err) {
      console.error('Failed to add contact:', err)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const contactNames = selectedContactIds
      .map(id => companyContacts.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ')

    onSubmit({
      ...taskForm,
      contact: contactNames,
      contactIds: selectedContactIds
    })
  }

  const isNewDeal = !taskForm.dealId

  // Common UI segments
  const dealFields = (
    <>
      {!isNewDeal && activeDeals.length > 0 && (
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-muted)' }}>Contacts</span>
          <button 
            type="button" 
            className="ghost-button" 
            style={{ fontSize: '11px', padding: '2px 6px' }}
            onClick={() => setAddingContact(!addingContact)}
          >
            {addingContact ? 'Cancel' : '+ Add Contact'}
          </button>
        </div>

        {addingContact && (
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: 'var(--r-md)', 
            padding: '16px', 
            marginBottom: '16px',
            border: '1px solid var(--border)' 
          }}>
            <div className="form-grid" style={{ margin: 0, gap: '12px' }}>
              <label className="field">
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Contact Name {contactErrors.name && <span style={{ color: '#ff5252', fontSize: '10px' }}>{contactErrors.name}</span>}
                </span>
                <input 
                  placeholder="Full name" 
                  value={newContact.name} 
                  onChange={e => setNewContact({...newContact, name: e.target.value})} 
                  style={contactErrors.name ? { borderColor: '#ff5252' } : {}}
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
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Phone number {contactErrors.phone && <span style={{ color: '#ff5252', fontSize: '10px' }}>{contactErrors.phone}</span>}
                </span>
                <input 
                  placeholder="+63..." 
                  value={newContact.phone} 
                  onChange={e => setNewContact({...newContact, phone: e.target.value})} 
                  style={contactErrors.phone ? { borderColor: '#ff5252' } : {}}
                />
              </label>
              <label className="field">
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Email address {contactErrors.email && <span style={{ color: '#ff5252', fontSize: '10px' }}>{contactErrors.email}</span>}
                </span>
                <input 
                  placeholder="name@company.com" 
                  value={newContact.email} 
                  onChange={e => setNewContact({...newContact, email: e.target.value})} 
                  style={contactErrors.email ? { borderColor: '#ff5252' } : {}}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button 
                type="button" 
                className="secondary-button" 
                style={{ padding: '6px 14px', fontSize: 'var(--fs-xs)' }}
                onClick={() => {
                  setAddingContact(false)
                  setNewContact({ name: '', email: '', phone: '', role: '' })
                }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="primary-button" 
                style={{ padding: '6px 14px', fontSize: 'var(--fs-xs)' }}
                onClick={handleAddContact}
              >
                Create Contact
              </button>
            </div>
          </div>
        )}

        <div className="admin-table-wrap" style={{ maxHeight: '120px', overflowY: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '30px' }}></th>
                <th>Name</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {companyContacts.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px' }}>No contacts found</td></tr>
              ) : (
                companyContacts.map(c => (
                  <tr 
                    key={c.id} 
                    style={{ cursor: 'pointer', background: selectedContactIds.includes(c.id) ? 'rgba(255,152,0,0.08)' : 'transparent' }}
                    onClick={() => {
                      setSelectedContactIds(prev => 
                        prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                      )
                    }}
                  >
                    <td><input type="checkbox" checked={selectedContactIds.includes(c.id)} readOnly /></td>
                    <td>{c.name}</td>
                    <td style={{ fontSize: '11px' }}>{c.role || '—'}</td>
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
        <span>Type</span>
        <Select 
          value={taskForm.type}
          onChange={v => handleChange({ target: { name: 'type', value: v } })}
          options={taskTypes.map(t => ({ value: t, label: t }))}
        />
      </label>

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
        <input name="dueDate" type="date" value={taskForm.dueDate} onChange={handleChange} required />
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
        <span>Description</span>
        <textarea name="notes" value={taskForm.notes} onChange={handleChange} placeholder="Enter task details..." required style={{ minHeight: '80px' }} />
      </label>
    </>
  )

  const hasDeals = activeDeals.length > 0

  return (
    <form className="form-grid" style={{ padding: '0 24px 24px' }} onSubmit={handleSubmit}>
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
          readOnly={!isNewDeal && !section1Expanded}
          className={!isNewDeal && !section1Expanded ? 'input--readonly' : ''}
        />
      </label>

      {!hasDeals ? (
        <>
          {/* CASE: NO DEALS - DEAL SECTION FIRST (AUTO-EXPANDED) */}
          <div className="field--span-2" style={{ borderBottom: '1px solid var(--border)', padding: '12px 0 8px', margin: '4px 0' }}>
            <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-strong)' }}>
              ◉ Deal (New)
            </span>
          </div>
          {dealFields}

          <div className="field--span-2" style={{ borderBottom: '1px solid var(--border)', padding: '12px 0 8px', margin: '8px 0 4px' }}>
            <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-strong)' }}>
              ◉ Task
            </span>
          </div>
          {taskFields}
        </>
      ) : (
        <>
          {/* CASE: HAS DEALS - TASK SECTION FIRST */}
          <div className="field--span-2" style={{ borderBottom: '1px solid var(--border)', padding: '12px 0 8px', margin: '4px 0' }}>
            <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-strong)' }}>
              ◉ Task
            </span>
          </div>
          {taskFields}

          <div className="field--span-2" style={{ borderBottom: '1px solid var(--border)', padding: '12px 0 8px', margin: '8px 0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-strong)' }}>
              ◉ Deal ({activeDeals.length} Linked)
            </span>
            <button 
              type="button" 
              className="ghost-button" 
              style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent)', padding: '2px 8px' }}
              onClick={() => setSection1Expanded(!section1Expanded)}
            >
              {section1Expanded ? 'Collapse' : 'Expand Options'}
            </button>
          </div>
          {section1Expanded && dealFields}
        </>
      )}

      <div className="form-actions field--span-2" style={{ marginTop: '12px' }}>
        <button type="submit" className="primary-button">Save task</button>
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
