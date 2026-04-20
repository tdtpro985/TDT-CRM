import { useState, useEffect } from 'react'
import { createRecordId } from '../utils'

const API_BASE = 'http://localhost:5000'
const CURRENT_DATE = new Date().toISOString().split('T')[0]

const STAGE_PROBABILITY = {
  'New Opportunity': 20,
  Qualified: 40,
  Proposal: 60,
  Negotiation: 80,
  'Closed Won': 100,
}

function getProbabilityForStage(stage) { return STAGE_PROBABILITY[stage] ?? 100 }

export default function useCRMData({ setNotice, showToast }) {
  const [companies, setCompanies] = useState([])
  const [contacts, setContacts] = useState([])
  const [leads, setLeads] = useState([])
  const [deals, setDeals] = useState([])
  const [tasks, setTasks] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAll() {
      try {
        const [companiesRes, contactsRes, leadsRes, dealsRes, activitiesRes, teamRes] =
          await Promise.all([
            fetch(`${API_BASE}/api/companies`),
            fetch(`${API_BASE}/api/contacts`),
            fetch(`${API_BASE}/api/leads`),
            fetch(`${API_BASE}/api/deals`),
            fetch(`${API_BASE}/api/activities`),
            fetch(`${API_BASE}/api/team`),
          ])

        setCompanies(await companiesRes.json())
        setContacts((await contactsRes.json()).map((c) => ({ ...c, lastActivity: c.lastTouch ?? '' })))
        setLeads(await leadsRes.json())
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
        setNotice('Backend is not reachable. Start the Flask server to load live data.')
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [setNotice])

  async function createLead(leadForm) {
    let matchedCompany = companies.find((c) => c.name.toLowerCase() === leadForm.companyName.toLowerCase())
    let matchedContact = contacts.find((c) => c.name.toLowerCase() === leadForm.contactName.toLowerCase())
    let companyIdToUse = matchedCompany ? matchedCompany.id : null
    let contactIdToUse = matchedContact ? matchedContact.id : null

    // Auto-create missing company
    if (!matchedCompany && leadForm.companyName) {
      companyIdToUse = createRecordId('company')
      const newCompany = { id: companyIdToUse, name: leadForm.companyName.trim(), status: 'Active' }
      setCompanies((c) => [newCompany, ...c])
      await fetch(`${API_BASE}/api/companies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCompany) }).catch(() => {})
    }

    // Auto-create missing contact
    if (!matchedContact && leadForm.contactName) {
      contactIdToUse = createRecordId('contact')
      const newContact = { id: contactIdToUse, name: leadForm.contactName.trim(), companyId: companyIdToUse, status: 'Active' }
      setContacts((c) => [newContact, ...c])
      await fetch(`${API_BASE}/api/contacts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newContact) }).catch(() => {})
    }

    const newLead = {
      id: createRecordId('lead'),
      ...leadForm,
      companyId: companyIdToUse,
      contactId: contactIdToUse,
      name: leadForm.name.trim(),
      status: 'New',
      createdAt: CURRENT_DATE,
      nextStep: leadForm.nextStep.trim(),
    }

    setLeads((current) => [newLead, ...current])

    try {
      const res = await fetch(`${API_BASE}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      })
      if (!res.ok) throw new Error('Network error')
      setNotice(`${newLead.name} was saved to the database.`)
    } catch {
      setNotice(`${newLead.name} was added locally — backend not reachable.`)
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
      await fetch(`${API_BASE}/api/companies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCompany) }).catch(() => {})
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
      const res = await fetch(`${API_BASE}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${API_BASE}/api/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`${API_BASE}/api/companies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCompany) }).catch(() => {})
    }

    if (!matchedContact && dealForm.contactName) {
      contactIdToUse = createRecordId('contact')
      const newContact = { id: contactIdToUse, name: dealForm.contactName.trim(), companyId: companyIdToUse, status: 'Active' }
      setContacts((c) => [newContact, ...c])
      await fetch(`${API_BASE}/api/contacts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newContact) }).catch(() => {})
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
      const res = await fetch(`${API_BASE}/api/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        await fetch(`${API_BASE}/api/deals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newDeal) }).catch(() => {})
      }
    } else if (!taskForm.dealId) {
      dealIdToUse = null
    }

    const newTask = { id: createRecordId('task'), ...taskForm, dealId: dealIdToUse, title: taskForm.title.trim(), status: 'Open' }

    setTasks((current) => [newTask, ...current])
    showToast(`Task "${newTask.title}" saved successfully!`)

    try {
      const res = await fetch(`${API_BASE}/api/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, subject: newTask.title }),
      })
      if (!res.ok) throw new Error('Network error')
      setNotice(`${newTask.title} was saved to the database.`)
    } catch {
      setNotice(`${newTask.title} was added locally — backend not reachable.`)
    }
    return newTask
  }

  function updateLeadStatus(leadId, nextStatus) {
    setLeads((current) => current.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l)))
    setNotice('Lead status updated in the clean-data registry.')
  }

  function updateDealStage(dealId, nextStage) {
    setDeals((current) =>
      current.map((d) => (d.id === dealId ? { ...d, stage: nextStage, probability: getProbabilityForStage(nextStage) } : d)),
    )
    setNotice('Pipeline stage updated successfully.')
  }

  function toggleTaskStatus(taskId) {
    setTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, status: t.status === 'Completed' ? 'Open' : 'Completed' } : t)),
    )
    setNotice('Task status updated in the activity tracker.')
  }

  return {
    data: { companies, contacts, leads, deals, tasks, teamMembers, loading },
    actions: { createLead, createContact, createCompany, createDeal, createTask, updateLeadStatus, updateDealStage, toggleTaskStatus }
  }
}
