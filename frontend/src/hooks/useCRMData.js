import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch } from '../api'
import { getTodayISO, createRecordId } from '../utils'
import { STAGE_WORKFLOW } from '../constants'

const CURRENT_DATE = getTodayISO()


function getProbabilityForStage(stage) { return STAGE_WORKFLOW[stage]?.probability ?? 20 }

export default function useCRMData({ setNotice, showToast, currentUser }) {
  const [companies, setCompanies] = useState([])
  const [customers, setCustomers] = useState([])
  const [contacts, setContacts] = useState([])
  const [leads, setLeads] = useState([])
  const [deals, setDeals] = useState([])
  const [tasks, setTasks] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [dealContactMap, setDealContactMap] = useState({})
  const [loading, setLoading] = useState(true)

  const abortControllerRef = useRef(null)

  const getSignal = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    return abortControllerRef.current.signal
  }, [])

  const initialBranch = currentUser?.role === 'Head of Sales' ? '' : (currentUser?.branch ?? '')
  const [activeBranch, setActiveBranch] = useState(initialBranch)
  const [activeRegion, setActiveRegion] = useState('')

  function buildQuery() {
    return activeBranch
      ? `?branch=${encodeURIComponent(activeBranch)}`
      : activeRegion
        ? `?region=${encodeURIComponent(activeRegion)}`
        : ''
  }

  async function fetchLeads() {
    try {
      const res = await apiFetch(`/api/leads${buildQuery()}`)
      if (res.ok) setLeads(await res.json())
    } catch { /* best-effort background refresh */ }
  }

  async function fetchCompanies() {
    try {
      const res = await apiFetch(`/api/companies${buildQuery()}`)
      if (res.ok) setCompanies(await res.json())
    } catch { /* best-effort background refresh */ }
  }

  async function fetchCustomers() {
    try {
      const res = await apiFetch(`/api/customers${buildQuery()}`)
      if (res.ok) setCustomers(await res.json())
    } catch { /* best-effort background refresh */ }
  }

  async function fetchContacts() {
    try {
      const res = await apiFetch(`/api/contacts${buildQuery()}`)
      if (res.ok) {
        const data = await res.json()
        setContacts(data.map((c) => ({ ...c, lastActivity: c.lastTouch ?? '' })))
      }
    } catch { /* best-effort background refresh */ }
  }

  async function fetchDeals() {
    try {
      const res = await apiFetch(`/api/deals${buildQuery()}`)
      if (res.ok) {
        const data = await res.json()
        setDeals(
          data.map((d) => ({
            ...d,
            name: d.name.replace(/^Deal - /, ''),
            expectedClose: d.closeDate ?? d.expectedClose ?? '',
            probability: d.probability ?? getProbabilityForStage(d.stage),
            urgencyScore: d.urgencyScore ?? 0,
            urgencyLabel: d.urgencyLabel ?? null,
            nextDueDate: d.nextDueDate ?? null,
            lastTouch: d.lastTouch ?? null,
            isAgos: Boolean(d.isAgos),
          })),
        )
      }
    } catch { /* best-effort background refresh */ }
  }

  async function fetchTasks() {
    try {
      const res = await apiFetch(`/api/activities${buildQuery()}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(
          data.map((a) => ({
            ...a,
            title: a.subject ?? a.title ?? '',
            priority: a.priority ?? 'Medium',
            status: ['Completed', 'Open', 'Reopened'].includes(a.status) ? a.status : 'Open',
            companyName: a.companyName ?? '',
            contact: a.contact_name ?? '',
          })),
        )
      }
    } catch { /* best-effort background refresh */ }
  }

  async function fetchDealContactMap() {
    try {
      const res = await apiFetch(`/api/deal-contacts`)
      if (res.ok) {
        const data = await res.json()
        const map = {}
        data.forEach((dc) => {
          if (!map[dc.deal_id]) map[dc.deal_id] = []
          map[dc.deal_id].push(dc)
        })
        setDealContactMap(map)
      }
    } catch { /* best-effort */ }
  }

  async function fetchTeam() {
    try {
      const res = await apiFetch(`/api/team${buildQuery()}`)
      if (res.ok) setTeamMembers(await res.json())
    } catch { /* best-effort background refresh */ }
  }

  async function loadAll() {
    if (!currentUser) return
    setLoading(true)
    const signal = getSignal()
    try {
      const responses = await Promise.all([
        apiFetch(`/api/companies${buildQuery()}`, { signal }),
        apiFetch(`/api/customers${buildQuery()}`, { signal }),
        apiFetch(`/api/contacts${buildQuery()}`, { signal }),
        apiFetch(`/api/leads${buildQuery()}`, { signal }),
        apiFetch(`/api/deals${buildQuery()}`, { signal }),
        apiFetch(`/api/activities${buildQuery()}`, { signal }),
        apiFetch(`/api/team${buildQuery()}`, { signal }),
        apiFetch(`/api/deal-contacts`, { signal }),
      ])

      if (responses.some(r => !r.ok)) {
        throw new Error('API or Database error')
      }

      const [companiesRes, customersRes, contactsRes, leadsRes, dealsRes, activitiesRes, teamRes, dealContactsRes] = responses

      const fetchedLeads = await leadsRes.json()
      const fetchedCompanies = await companiesRes.json()
      const fetchedCustomers = await customersRes.json()
      const fetchedContacts = await contactsRes.json()
      const fetchedDeals = await dealsRes.json()
      const fetchedActivities = await activitiesRes.json()
      const fetchedDealContacts = await dealContactsRes.json()

      const dcm = {}
      fetchedDealContacts.forEach((dc) => {
        if (!dcm[dc.deal_id]) dcm[dc.deal_id] = []
        dcm[dc.deal_id].push(dc)
      })
      setDealContactMap(dcm)

      setLeads(fetchedLeads)
      setCompanies(fetchedCompanies)
      setCustomers(fetchedCustomers)
      setContacts(fetchedContacts.map((c) => ({ ...c, lastActivity: c.lastTouch ?? '' })))
      setDeals(
        fetchedDeals.map((d) => ({
          ...d,
          name: d.name.replace(/^Deal - /, ''),
          expectedClose: d.closeDate ?? d.expectedClose ?? '',
          probability: d.probability ?? getProbabilityForStage(d.stage),
          urgencyScore: d.urgencyScore ?? 0,
          urgencyLabel: d.urgencyLabel ?? null,
          nextDueDate: d.nextDueDate ?? null,
          lastTouch: d.lastTouch ?? null,
          isAgos: Boolean(d.isAgos),
        })),
      )
      setTasks(
        fetchedActivities.map((a) => ({
          ...a,
          title: a.subject ?? a.title ?? '',
          priority: a.priority ?? 'Medium',
          status: ['Completed', 'Open', 'Reopened'].includes(a.status) ? a.status : 'Open',
          companyName: a.companyName ?? '',
          contact: a.contact_name ?? '',
        })),
      )
      setTeamMembers(await teamRes.json())
    } catch (err) {
      if (err.name === 'AbortError') return
      setNotice('Backend is not reachable or database is down. Start the server and configure database to load live data.')
    }
    setLoading(false)
  }

  // Reset activeBranch/activeRegion whenever the logged-in user changes (login/logout)
  useEffect(() => {
    setActiveBranch(currentUser?.role === 'Head of Sales' ? '' : (currentUser?.branch ?? ''))
    setActiveRegion('')
  }, [currentUser])

  useEffect(() => {
    loadAll()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, activeBranch, activeRegion])

  async function createLead(leadForm) {
    const rsm = teamMembers.find(m => m.name === leadForm.sr || m.id === leadForm.ownerId)
    const newLead = {
      id: createRecordId('lead'),
      customerName: leadForm.customerName.trim(),
      contactNum: leadForm.contactNum,
      address: leadForm.address,
      region: leadForm.region,
      ownerId: rsm?.id || leadForm.ownerId || null,
      branch: activeBranch,
      status: 'New',
      createdAt: CURRENT_DATE,
    }

    setLeads((current) => [newLead, ...current])

    try {
      const res = await apiFetch(`/api/leads`, {
        method: 'POST',
        body: JSON.stringify(newLead),
      })
      if (!res.ok) throw new Error('Network error')
      setNotice(`${newLead.customerName} was saved to the database.`)
      showToast(`Customer "${newLead.customerName}" saved successfully!`)
      fetchLeads()
    } catch {
      setNotice(`${newLead.customerName} was added locally — backend not reachable.`)
    }
    return newLead
  }

  async function createContact(contactForm) {
    if (!contactForm.email && !contactForm.phone) {
      setNotice('Email or phone is required to create a contact.')
      return
    }

    let matchedCompany = companies.find((c) => c.name.toLowerCase() === contactForm.companyName.toLowerCase())
    let companyIdToUse = matchedCompany ? matchedCompany.id : null

    if (!matchedCompany && contactForm.companyName) {
      companyIdToUse = createRecordId('company')
      const newCompany = { id: companyIdToUse, name: contactForm.companyName.trim(), status: 'Active' }
      setCompanies((c) => [newCompany, ...c])
      await apiFetch(`/api/companies`, { method: 'POST', body: JSON.stringify(newCompany) }).catch(() => {})
    }

    const rsm = teamMembers.find(m => m.name === contactForm.owner || m.id === contactForm.ownerId)
    const newContact = {
      id: createRecordId('contact'),
      ...contactForm,
      phone: (contactForm.phone || '').replace(/[^0-9+\s()-]/g, ''),
      companyId: companyIdToUse,
      name: contactForm.name.trim(),
      ownerId: rsm?.id || contactForm.ownerId || null,
      lastActivity: CURRENT_DATE,
    }

    setContacts((current) => [newContact, ...current])

    try {
      const res = await apiFetch(`/api/contacts`, {
        method: 'POST',
        body: JSON.stringify({ ...newContact, lastTouch: newContact.lastActivity }),
      })
      if (!res.ok) throw new Error('Network error')
      setNotice(`${newContact.name} was saved to the contacts database.`)
      await Promise.all([fetchContacts(), fetchCompanies()])
    } catch {
      setNotice(`${newContact.name} was added locally — backend not reachable.`)
    }
    return newContact
  }

  async function createCompany(companyForm) {
    const rsm = teamMembers.find(m => m.name === companyForm.owner || m.id === companyForm.ownerId)
    const newCompany = {
      id: createRecordId('company'),
      ...companyForm,
      name: companyForm.name.trim(),
      ownerId: rsm?.id || companyForm.ownerId || null,
      lastTouch: CURRENT_DATE,
    }

    setCompanies((current) => [newCompany, ...current])

    try {
      const res = await apiFetch(`/api/companies`, {
        method: 'POST',
        body: JSON.stringify(newCompany),
      })
      if (!res.ok) throw new Error('Network error')
      setNotice(`${newCompany.name} was saved to the companies database.`)
      fetchCompanies()
    } catch {
      setNotice(`${newCompany.name} was added locally — backend not reachable.`)
    }
    return newCompany
  }

  async function createDeal(dealForm) {
    let matchedCompany = companies.find((c) => c.name.toLowerCase() === dealForm.companyName.toLowerCase())
    let matchedContact = contacts.find((c) => c.name.toLowerCase() === dealForm.contactName.toLowerCase())
    let companyIdToUse = matchedCompany ? matchedCompany.id : null
    let contactIdToUse = matchedContact ? matchedContact.id : null

    if (!matchedCompany && dealForm.companyName) {
      companyIdToUse = createRecordId('company')
      const newCompany = { id: companyIdToUse, name: dealForm.companyName.trim(), status: 'Active' }
      setCompanies((c) => [newCompany, ...c])
      await apiFetch(`/api/companies`, { method: 'POST', body: JSON.stringify(newCompany) }).catch(() => {})
    }

    if (!matchedContact && dealForm.contactName) {
      contactIdToUse = createRecordId('contact')
      const newContact = { id: contactIdToUse, name: dealForm.contactName.trim(), companyId: companyIdToUse, status: 'Active' }
      setContacts((c) => [newContact, ...c])
      await apiFetch(`/api/contacts`, { method: 'POST', body: JSON.stringify(newContact) }).catch(() => {})
    }

    const rsm = teamMembers.find(m => m.name === dealForm.owner || m.id === dealForm.ownerId)
    const newDeal = {
      id: createRecordId('deal'),
      ...dealForm,
      value: Number(dealForm.value) || 0,
      companyId: companyIdToUse,
      contactId: contactIdToUse,
      name: dealForm.name.trim(),
      stage: dealForm.stage || 'Qualified',
      probability: getProbabilityForStage(dealForm.stage || 'Qualified'),
      ownerId: rsm?.id || dealForm.ownerId || null,
      createdAt: CURRENT_DATE,
    }

    setDeals((current) => [newDeal, ...current])

    try {
      const res = await apiFetch(`/api/deals`, {
        method: 'POST',
        body: JSON.stringify({ ...newDeal, closeDate: newDeal.expectedClose }),
      })
      
      if (!res.ok) {
        if (res.status === 409) {
          const errData = await res.json()
          throw new Error(errData.error || 'Duplicate deal name')
        }
        throw new Error('Network error')
      }
      
      showToast(`${newDeal.name} was saved.`)
      await Promise.all([fetchDeals(), fetchCompanies(), fetchContacts()])
    } catch (err) {
      // Rollback
      setDeals((current) => current.filter(d => d.id !== newDeal.id))
      setNotice(`Error: ${err.message}`)
      throw err // Propagate to UI
    }
    return newDeal
  }

  async function createTask(taskForm, DEAL_STAGES) {
    let dealIdToUse = taskForm.dealId
    let companyIdToUse = taskForm.companyId

    // 1. Resolve Company
    let matchedCompany = companies.find((c) => c.id === taskForm.companyId || c.name === taskForm.companyId)
    
    if (!matchedCompany && taskForm.companyId) {
      // Create new company if it doesn't exist
      companyIdToUse = createRecordId('company')
      const newCompany = { id: companyIdToUse, name: taskForm.companyId.trim(), status: 'Active' }
      setCompanies((c) => [newCompany, ...c])
      await apiFetch(`/api/companies`, { method: 'POST', body: JSON.stringify(newCompany) }).catch(() => {})
      matchedCompany = newCompany
    } else if (matchedCompany) {
      companyIdToUse = matchedCompany.id
    }

    // 2. Resolve or Create Deal
    const existingDeal = deals.find((d) => d.id === taskForm.dealId)

    if (!existingDeal && companyIdToUse) {
      // Create new deal for this company
      const rsm = teamMembers.find(m => m.name === taskForm.owner || m.id === taskForm.ownerId)
      dealIdToUse = createRecordId('deal')
      const newDeal = {
        id: dealIdToUse,
        companyId: companyIdToUse,
        name: taskForm.dealName || `Deal - ${matchedCompany?.name || taskForm.companyId}`,
        stage: taskForm.dealStage || DEAL_STAGES[0],
        probability: getProbabilityForStage(taskForm.dealStage || DEAL_STAGES[0]),
        value: Number(taskForm.dealValue) || 0,
        expectedClose: taskForm.expectedClose || null,
        ownerId: rsm?.id || taskForm.ownerId || currentUser?.id || null,
      }
      setDeals((d) => [newDeal, ...d])
      
      try {
        const res = await apiFetch(`/api/deals`, { 
          method: 'POST', 
          body: JSON.stringify({ ...newDeal, closeDate: newDeal.expectedClose }) 
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create deal')
        }
      } catch (err) {
        setDeals((d) => d.filter(item => item.id !== dealIdToUse))
        setNotice(`Error: ${err.message}`)
        throw err
      }
    } else if (existingDeal) {
      // Update existing deal with new values from task form
      const rsm = teamMembers.find(m => m.name === taskForm.owner || m.id === taskForm.ownerId)
      dealIdToUse = existingDeal.id
      const updatedDeal = {
        ...existingDeal,
        name: taskForm.dealName || existingDeal.name,
        stage: taskForm.dealStage || existingDeal.stage,
        value: taskForm.dealValue !== '' ? Number(taskForm.dealValue) : existingDeal.value,
        expectedClose: taskForm.expectedClose || existingDeal.expectedClose,
        probability: existingDeal.probability,
        ownerId: rsm?.id || taskForm.ownerId || existingDeal.ownerId || null,
      }
      
      setDeals((current) => current.map(d => d.id === dealIdToUse ? updatedDeal : d))
      
      // Update deal on backend
      try {
        const res = await apiFetch(`/api/deals/${dealIdToUse}/stage`, {
          method: 'PATCH',
          body: JSON.stringify({ 
            name: updatedDeal.name,
            stage: updatedDeal.stage,
            value: updatedDeal.value,
            closeDate: updatedDeal.expectedClose,
            ownerId: updatedDeal.ownerId
          })
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to update deal')
        }
      } catch (err) {
        setDeals((current) => current.map(d => d.id === dealIdToUse ? existingDeal : d))
        setNotice(`Error: ${err.message}`)
        throw err
      }
    }

    const rsmForTask = teamMembers.find(m => m.name === taskForm.owner || m.id === taskForm.ownerId)
    const newTask = { 
      id: createRecordId('task'), 
      ...taskForm, 
      dealId: dealIdToUse, 
      companyName: matchedCompany?.name || taskForm.companyId,
      title: taskForm.title.trim(), 
      status: 'Open',
      ownerId: rsmForTask?.id || taskForm.ownerId || currentUser?.id || null,
      stage: taskForm.dealStage
    }

    setTasks((current) => [newTask, ...current])
    showToast(`Task "${newTask.title}" saved successfully!`)

    try {
      const res = await apiFetch(`/api/activities`, {
        method: 'POST',
        body: JSON.stringify({ 
          ...newTask, 
          subject: newTask.title,
          stage: newTask.stage,
          metadata: newTask.metadata ? JSON.stringify(newTask.metadata) : null
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server error: ${res.status}`)
      }
      setNotice(`${newTask.title} was saved to the database.`)

      // Sync deal contacts with form selection
      if (dealIdToUse) {
        try {
          const selectedIds = taskForm.contactIds || []
          const currentRes = await apiFetch(`/api/deals/${dealIdToUse}/contacts`)
          if (currentRes.ok) {
            const currentContacts = await currentRes.json()
            const currentIds = currentContacts.map(c => c.id)

            const toAdd = selectedIds.filter(id => !currentIds.includes(id))
            const toRemove = currentIds.filter(id => !selectedIds.includes(id))

            for (const cId of toAdd) {
              const res = await apiFetch(`/api/deals/${dealIdToUse}/contacts`, {
                method: 'POST',
                body: JSON.stringify({ contactId: cId })
              })
              if (!res.ok) {
                const errText = await res.text().catch(() => 'No error text')
                console.error(`Failed to add contact ${cId} to deal ${dealIdToUse}:`, errText)
              }
            }
            for (const cId of toRemove) {
              const res = await apiFetch(`/api/deals/${dealIdToUse}/contacts`, {
                method: 'DELETE',
                body: JSON.stringify({ contactId: cId })
              })
              if (!res.ok) {
                const errText = await res.text().catch(() => 'No error text')
                console.error(`Failed to remove contact ${cId} from deal ${dealIdToUse}:`, errText)
              }
            }
          }
        } catch (syncErr) {
          console.error('Contact sync failed (non-fatal):', syncErr)
        }
        
      // Refresh deal contacts map so updates propagate - await it to ensure consistency
      await fetchDealContactMap()
    }
    await Promise.all([
      fetchTasks(),
      fetchDeals(),
      fetchCompanies(),
      fetchCustomers()
    ])
  } catch (err) {
    setTasks((current) => current.filter(t => t.id !== newTask.id))
    setNotice(`Error saving task: ${err.message}`)
    throw err
  }
  return newTask
}


  async function updateLeadStatus(leadId, nextStatus) {
    setLeads((current) => current.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l)))
    try {
      const res = await apiFetch(`/api/leads/${leadId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      })
      if (!res.ok) throw new Error('Network error')
      setNotice('Lead status updated.')
      fetchLeads()
    } catch {
      setNotice('Lead status update failed locally.')
    }
  }

  async function updateDealStage(dealId, nextStage, extra = {}) {

    const probability = STAGE_WORKFLOW[nextStage]?.probability ?? 20
    const snapshot = deals.find(d => d.id === dealId)

    setDeals((current) =>
      current.map((d) => (d.id === dealId
        ? { ...d, stage: nextStage, probability, lostReason: extra.lostReason ?? d.lostReason }
        : d)),
    )
    try {
      const res = await apiFetch(`/api/deals/${dealId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: nextStage, ...extra })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server error: ${res.status}`)
      }
      showToast(`Deal stage updated to ${nextStage}`)
      await Promise.all([fetchDeals(), fetchCustomers()])
    } catch (err) {
      setDeals((current) => current.map((d) => (d.id === dealId ? snapshot : d)))
      setNotice(`Stage update failed: ${err.message}`)
      throw err
    }
  }

  async function updateContact(contactId, data) {
    setContacts(current => current.map(c => c.id === contactId ? { ...c, ...data } : c))
    try {
      const res = await apiFetch(`/api/contacts/${contactId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Network error')
      showToast('Contact updated successfully')
      await Promise.all([fetchContacts(), fetchDealContactMap()])
    } catch (err) {
      setNotice(`Update failed: ${err.message}`)
      fetchContacts()
    }
  }

  async function updateDeal(dealId, fields) {

    const snapshot = deals.find(d => d.id === dealId)
    setDeals((current) =>
      current.map((d) => (d.id === dealId ? { ...d, ...fields } : d)),
    )
    try {
      const body = {}
      if (fields.value !== undefined) body.value = Number(fields.value)
      if (fields.expectedClose) body.closeDate = fields.expectedClose
      if (fields.probability !== undefined) body.probability = Number(fields.probability)
      const res = await apiFetch(`/api/deals/${dealId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server error: ${res.status}`)
      }
      await Promise.all([fetchDeals(), fetchCustomers()])
      setNotice('Deal updated successfully.')
    } catch (err) {
      console.error('updateDeal failed:', err)
      if (snapshot) {
        setDeals((current) => current.map(d => d.id === dealId ? snapshot : d))
      }
      setNotice(`Deal update failed: ${err.message}`)
      throw err
    }
  }

  async function toggleTaskStatus(taskId, currentStatus) {
    const nextStatus = currentStatus === 'Completed' ? 'Reopened' : 'Completed'
    setTasks((current) => current.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)))
    try {
      const res = await apiFetch(`/api/activities/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      })
      if (!res.ok) throw new Error('Network error')
      fetchTasks()
      setNotice('Task status updated.')
    } catch {
      setNotice('Task status updated locally — backend not reachable.')
    }
  }

  async function syncGSheets() {
    setNotice('Synchronizing with Google Sheets...')
    try {
      const res = await apiFetch(`/api/sync/gsheets`, { method: 'POST' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Sync failed')
      
      loadAll()
      
      const count = result.synced_count || 0
      setNotice(`Sync complete! ${count} new leads were added from Google Sheets.`)
      showToast(`Successfully synced ${count} new leads!`)
      return result
    } catch (err) {
      setNotice(`Sync failed: ${err.message}`)
      showToast(`Error: ${err.message}`)
    }
  }

  async function reassignLead(leadId, newOwnerId) {
    const newOwner = teamMembers.find(m => m.id === newOwnerId)
    setLeads(current => current.map(l =>
      l.id === leadId ? { ...l, ownerId: newOwnerId, sr: newOwner?.name ?? '' } : l
    ))
    try {
      const res = await apiFetch(`/api/leads/${leadId}/reassign`, {
        method: 'PATCH',
        body: JSON.stringify({ newOwnerId }),
      })
      if (!res.ok) throw new Error('Reassign failed')
      fetchLeads()
      setNotice('Lead reassigned successfully.')
      showToast('Lead reassigned!')
    } catch {
      setNotice('Lead reassign updated locally — backend not reachable.')
    }
  }

  return {

    data: { companies, customers, contacts, leads, deals, tasks, teamMembers, dealContactMap, loading, activeBranch, activeRegion },
    actions: {
      createLead,
      createContact,
      createCompany,
      createDeal,
      createTask,
      updateLeadStatus,
      updateDealStage,
      updateDeal,
      toggleTaskStatus,
      syncGSheets,
      reassignLead,
      setActiveBranch,
      setActiveRegion,
      loadAll,
      fetchLeads,
      fetchCompanies,
      fetchCustomers,
      fetchContacts,
      fetchDeals,
    fetchTasks,
    fetchTeam,
    fetchDealContactMap,
    updateContact,
  }

  }
}
