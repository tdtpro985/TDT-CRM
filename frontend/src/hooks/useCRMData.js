import { useState, useEffect } from 'react'
import { createRecordId } from '../utils'
import { apiFetch } from '../api'

const CURRENT_DATE = new Date().toISOString().split('T')[0]

const STAGE_PROBABILITY = {
  'New Opportunity': 20,
  Qualified: 40,
  Proposal: 60,
  Negotiation: 80,
  'Closed Won': 100,
}

function getProbabilityForStage(stage) { return STAGE_PROBABILITY[stage] ?? 100 }

export default function useCRMData({ setNotice, showToast, currentUser }) {
  const [companies, setCompanies] = useState([])
  const [contacts, setContacts] = useState([])
  const [leads, setLeads] = useState([])
  const [deals, setDeals] = useState([])
  const [tasks, setTasks] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const branch = currentUser?.branch ?? ''

  useEffect(() => {
    if (!currentUser) return
    async function loadAll() {
      try {
        const branchParam = branch ? `?branch=${encodeURIComponent(branch)}` : ''
        const responses = await Promise.all([
          apiFetch(`/api/companies`),
          apiFetch(`/api/contacts`),
          apiFetch(`/api/leads${branchParam}`),
          apiFetch(`/api/deals`),
          apiFetch(`/api/activities`),
          apiFetch(`/api/team${branchParam}`),
        ])

        if (responses.some(r => !r.ok)) {
          throw new Error('API or Database error')
        }

        const [companiesRes, contactsRes, leadsRes, dealsRes, activitiesRes, teamRes] = responses

        const fetchedLeads = await leadsRes.json()
        const leadIdSet = new Set(fetchedLeads.map((l) => l.id))

        // Filter API results to only records linked to this branch's leads
        const branchCompanies = (await companiesRes.json()).filter((c) => leadIdSet.has(c.id))
        const branchContacts = (await contactsRes.json())
          .filter((c) => leadIdSet.has(c.companyId))
          .map((c) => ({ ...c, lastActivity: c.lastTouch ?? '' }))

        // Derive missing companies and contacts from leads not yet in the DB
        const companyIdSet = new Set(branchCompanies.map((c) => c.id))
        const contactCompanyIdSet = new Set(branchContacts.map((c) => c.companyId))

        const derivedCompanies = fetchedLeads
          .filter((l) => !companyIdSet.has(l.id))
          .map((l) => ({
            id: l.id,
            name: l.customerName,
            city: l.region,
            owner: l.sr,
            status: 'Active',
          }))

        const derivedContacts = fetchedLeads
          .filter((l) => !contactCompanyIdSet.has(l.id))
          .map((l) => ({
            id: `c-${l.id}`,
            name: l.customerName,
            companyId: l.id,
            phone: l.contactNum,
            owner: l.sr,
            status: 'Active',
            lastActivity: l.createdAt ?? '',
          }))

        setLeads(fetchedLeads)
        setCompanies([...branchCompanies, ...derivedCompanies])
        setContacts([...branchContacts, ...derivedContacts])
        setDeals(
          (await dealsRes.json()).map((d) => ({
            ...d,
            expectedClose: d.closeDate ?? '',
            probability: d.probability ?? getProbabilityForStage(d.stage),
          })),
        )
        setTasks(
          (await activitiesRes.json()).map((a) => ({
            ...a,
            title: a.subject ?? a.title ?? '',
            priority: a.priority ?? 'Medium',
            status: ['Completed', 'Open'].includes(a.status) ? a.status : 'Open',
          })),
        )
        setTeamMembers((await teamRes.json()).map((u) => u.name))
      } catch {
        setNotice('Backend is not reachable or database is down. Start the server and configure database to load live data.')
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [currentUser, branch, setNotice])

  async function createLead(leadForm) {
    const newLead = {
      id: createRecordId('lead'),
      customerName: leadForm.customerName.trim(),
      contactNum: leadForm.contactNum,
      address: leadForm.address,
      region: leadForm.region,
      sr: leadForm.sr,
      branch: branch,
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
    } catch {
      setNotice(`${newLead.customerName} was added locally — backend not reachable.`)
    }
    return newLead
  }

  async function createContact(contactForm) {
    let matchedCompany = companies.find((c) => c.name.toLowerCase() === contactForm.companyName.toLowerCase())
    let companyIdToUse = matchedCompany ? matchedCompany.id : null

    if (!matchedCompany && contactForm.companyName) {
      companyIdToUse = createRecordId('company')
      const newCompany = { id: companyIdToUse, name: contactForm.companyName.trim(), status: 'Active' }
      setCompanies((c) => [newCompany, ...c])
      await apiFetch(`/api/companies`, { method: 'POST', body: JSON.stringify(newCompany) }).catch(() => {})
    }

    const newContact = {
      id: createRecordId('contact'),
      ...contactForm,
      companyId: companyIdToUse,
      name: contactForm.name.trim(),
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
    } catch {
      setNotice(`${newContact.name} was added locally — backend not reachable.`)
    }
    return newContact
  }

  async function createCompany(companyForm) {
    const newCompany = {
      id: createRecordId('company'),
      ...companyForm,
      name: companyForm.name.trim(),
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

    const newDeal = {
      id: createRecordId('deal'),
      ...dealForm,
      companyId: companyIdToUse,
      contactId: contactIdToUse,
      name: dealForm.name.trim(),
      value: Number(dealForm.value),
      probability: getProbabilityForStage(dealForm.stage),
    }

    setDeals((current) => [newDeal, ...current])
    showToast(`Deal "${newDeal.name}" saved successfully!`)

    try {
      const res = await apiFetch(`/api/deals`, {
        method: 'POST',
        body: JSON.stringify({ ...newDeal, closeDate: newDeal.expectedClose }),
      })
      if (!res.ok) throw new Error('Network error')
      setNotice(`${newDeal.name} was saved to the database.`)
    } catch {
      setNotice(`${newDeal.name} was added locally — backend not reachable.`)
    }
    return newDeal
  }

  async function createTask(taskForm, DEAL_STAGES) {
    let dealIdToUse = taskForm.dealId
    const isExistingId = deals.some((d) => d.id === taskForm.dealId)

    if (!isExistingId && taskForm.dealId) {
      const matchName = deals.find((d) => d.name.toLowerCase() === taskForm.dealId.toLowerCase())
      if (matchName) {
        dealIdToUse = matchName.id
      } else {
        dealIdToUse = createRecordId('deal')
        const newDeal = {
          id: dealIdToUse,
          name: taskForm.dealId.trim(),
          stage: DEAL_STAGES[0],
          probability: getProbabilityForStage(DEAL_STAGES[0]),
          value: 0,
        }
        setDeals((d) => [newDeal, ...d])
        await apiFetch(`/api/deals`, { method: 'POST', body: JSON.stringify(newDeal) }).catch(() => {})
      }
    } else if (!taskForm.dealId) {
      dealIdToUse = null
    }

    const newTask = { id: createRecordId('task'), ...taskForm, dealId: dealIdToUse, title: taskForm.title.trim(), status: 'Open' }

    setTasks((current) => [newTask, ...current])
    showToast(`Task "${newTask.title}" saved successfully!`)

    try {
      const res = await apiFetch(`/api/activities`, {
        method: 'POST',
        body: JSON.stringify({ ...newTask, subject: newTask.title }),
      })
      if (!res.ok) throw new Error('Network error')
      setNotice(`${newTask.title} was saved to the database.`)
    } catch {
      setNotice(`${newTask.title} was added locally — backend not reachable.`)
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
    } catch {
      setNotice('Lead status updated locally — backend not reachable.')
    }
  }

  async function updateDealStage(dealId, nextStage) {
    setDeals((current) =>
      current.map((d) => (d.id === dealId ? { ...d, stage: nextStage, probability: getProbabilityForStage(nextStage) } : d)),
    )
    try {
      const res = await apiFetch(`/api/deals/${dealId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: nextStage })
      })
      if (!res.ok) throw new Error('Network error')
      setNotice('Pipeline stage updated successfully.')
    } catch {
      setNotice('Pipeline stage updated locally — backend not reachable.')
    }
  }

  async function toggleTaskStatus(taskId, currentStatus) {
    const nextStatus = currentStatus === 'Completed' ? 'Open' : 'Completed'
    setTasks((current) => current.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)))
    try {
      const res = await apiFetch(`/api/activities/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      })
      if (!res.ok) throw new Error('Network error')
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
      
      // Refresh leads after sync
      const branchParam = branch ? `?branch=${encodeURIComponent(branch)}` : ''
      const leadsRes = await apiFetch(`/api/leads${branchParam}`)
      if (leadsRes.ok) {
        setLeads(await leadsRes.json())
      }
      
      const count = result.synced_count || 0
      setNotice(`Sync complete! ${count} new leads were added from Google Sheets.`)
      showToast(`Successfully synced ${count} new leads!`)
      return result
    } catch (err) {
      setNotice(`Sync failed: ${err.message}`)
      showToast(`Error: ${err.message}`)
    }
  }

  return {
    data: { companies, contacts, leads, deals, tasks, teamMembers, loading },
    actions: { 
      createLead, 
      createContact, 
      createCompany, 
      createDeal, 
      createTask, 
      updateLeadStatus, 
      updateDealStage, 
      toggleTaskStatus,
      syncGSheets 
    }
  }
}
