import { useState, useEffect } from 'react'
import './App.css'

// Constants & Utils
import { navigationConfig, defaultCompanyForm, defaultDealForm, defaultContactForm, defaultActivityForm, defaultDeliverySettings, viewMeta, stageProbability, stageOrder } from './constants'
import { createRecordId, formatCurrencyCompact, focusSection } from './utils'

// Views
import Dashboard from './pages/Dashboard'
import SalesWorkspace from './pages/SalesWorkspace'
import DealsView from './pages/DealsView'
import ContactsView from './pages/ContactsView'
import ActivitiesView from './pages/ActivitiesView'
import ReportsView from './pages/ReportsView'
import CompaniesView from './pages/CompaniesView'

function App() {
  const [activeView, setActiveView] = useState('dashboard')

  const [companies, setCompanies] = useState([])
  const [deals, setDeals] = useState([])
  const [contacts, setContacts] = useState([])
  const [activities, setActivities] = useState([])
  const [salesTeam, setSalesTeam] = useState([])
  const [reports, setReports] = useState([])
  const [selectedReports, setSelectedReports] = useState([])
  const [activeReportId, setActiveReportId] = useState(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDealId, setSelectedDealId] = useState(null)
  const [selectedContactId, setSelectedContactId] = useState(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)
  
  const [stageFilter, setStageFilter] = useState('all')
  const [contactFilter, setContactFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('all')
  const [companyFilter, setCompanyFilter] = useState('all')

  const [notice, setNotice] = useState('Initializing CRM state...')
  
  const [companyForm, setCompanyForm] = useState(defaultCompanyForm)
  const [dealForm, setDealForm] = useState(defaultDealForm)
  const [contactForm, setContactForm] = useState(defaultContactForm)
  const [activityForm, setActivityForm] = useState(defaultActivityForm)
  const [deliverySettings, setDeliverySettings] = useState(defaultDeliverySettings)

  // Fetch all data
  const fetchData = async () => {
    try {
      const [comps, dealsData, conts, acts, team] = await Promise.all([
        fetch('/api/companies').then(res => res.json()),
        fetch('/api/deals').then(res => res.json()),
        fetch('/api/contacts').then(res => res.json()),
        fetch('/api/activities').then(res => res.json()),
        fetch('/api/team').then(res => res.json())
      ])
      
      setCompanies(comps || [])
      setDeals(dealsData || [])
      setContacts(conts || [])
      setActivities(acts || [])
      setSalesTeam(team || [])
      
      if (dealsData?.length > 0) setSelectedDealId(dealsData[0].id)
      if (conts?.length > 0) setSelectedContactId(conts[0].id)
      if (comps?.length > 0) setSelectedCompanyId(comps[0].id)
      
      setNotice('CRM data synchronized with database.')
    } catch (err) {
      console.error(err)
      setNotice('Error fetching CRM data.')
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // KPI Calculations
  const totalPipelineValue = deals.reduce((sum, deal) => sum + deal.value, 0)
  const openDeals = deals.filter(deal => deal.stage !== 'Closed Won' && deal.stage !== 'Closed Lost')
  const pipelineValue = openDeals.reduce((sum, deal) => sum + deal.value, 0)
  const activeDeals = openDeals.length
  const newLeads = contacts.filter((contact) => contact.status === 'Lead').length
  const conversionRate = deals.length > 0 ? ((deals.filter(d => d.stage === 'Closed Won').length / deals.length) * 100).toFixed(1) : 0

  const highPriorityDeals = deals.filter((deal) => deal.priority === 'High')
  const openActivities = activities.filter((activity) => activity.status !== 'Completed')

  const pipelineSummary = stageOrder.map((stage) => {
    const stageDeals = deals.filter((deal) => deal.stage === stage)
    const stageValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0)
    return {
      stage,
      count: stageDeals.length,
      value: stageValue,
      share: totalPipelineValue ? Math.round((stageValue / totalPipelineValue) * 100) : 0,
    }
  })

  const topMetricCards = [
    { label: 'Pipeline value', value: formatCurrencyCompact(pipelineValue), meta: 'Total value of active, open deals', accent: 'accent' },
    { label: 'Conversion rate', value: `${conversionRate}%`, meta: 'Percentage of all deals marked as Closed Won', accent: 'surface' },
    { label: 'Active deals', value: activeDeals.toLocaleString(), meta: 'Total number of deals currently in progress', accent: 'alt' },
    { label: 'New leads', value: newLeads.toLocaleString(), meta: 'Contacts currently in the Lead status', accent: 'surface' },
  ]

  // Navigation item badges
  const navigationItems = navigationConfig.map((item) => {
    let badge = '00'
    if (item.id === 'dashboard') badge = 'Live'
    else if (item.id === 'companies') badge = String(companies.length).padStart(2, '0')
    else if (item.id === 'deals') badge = String(deals.length).padStart(2, '0')
    else if (item.id === 'contacts') badge = String(contacts.length).padStart(2, '0')
    else if (item.id === 'activities') badge = String(openActivities.length).padStart(2, '0')
    return { ...item, badge }
  })

  // Filtering Logic
  const matchesSearch = (query, values) => {
    if (!query.trim()) return true
    const normalizedQuery = query.trim().toLowerCase()
    return values.some((value) => String(value || '').toLowerCase().includes(normalizedQuery))
  }

  const filteredDeals = deals.filter(deal => 
    (stageFilter === 'all' || deal.stage === stageFilter) &&
    matchesSearch(searchQuery, [deal.name, deal.companyName, deal.owner, deal.contactName, deal.stage])
  )

  const filteredContacts = contacts.filter(contact => 
    (contactFilter === 'all' || contact.status === contactFilter) &&
    matchesSearch(searchQuery, [contact.name, contact.companyName, contact.role, contact.owner])
  )

  const filteredCompanies = companies.filter(company => 
    matchesSearch(searchQuery, [company.name, company.industry, company.owner])
  )

  const filteredActivities = activities.filter(activity => 
    (activityFilter === 'all' || activity.status === activityFilter) &&
    matchesSearch(searchQuery, [activity.subject, activity.type, activity.owner, activity.dealName, activity.notes])
  )

  const selectedDeal = deals.find(d => d.id === selectedDealId) || deals[0] || null
  const selectedContact = contacts.find(c => c.id === selectedContactId) || contacts[0] || null
  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || companies[0] || null

  const currentViewMeta = viewMeta[activeView]

  // Handlers
  function handleViewChange(viewId) {
    setActiveView(viewId)
    setSearchQuery('')
  }

  // Form Changes
  const handleFormChange = (setter) => (e) => {
    const { name, value, type, checked } = e.target
    setter(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  // Create Functions
  async function handleCreateEntity(endpoint, entity, resetForm, setter, successMsg) {
    try {
      const res = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entity)
      })
      if (res.ok) {
        await fetchData() // Refresh all data to ensure joined names are correct
        resetForm()
        setNotice(successMsg)
      }
    } catch (err) {
      setNotice('Error saving to database.')
    }
  }

  const handleCreateCompany = (e) => {
    e.preventDefault()
    handleCreateEntity('companies', { id: createRecordId('comp'), ...companyForm }, () => setCompanyForm(defaultCompanyForm), setCompanies, `${companyForm.name} added.`)
  }

  const handleCreateDeal = (e) => {
    e.preventDefault()
    handleCreateEntity('deals', { id: createRecordId('deal'), ...dealForm }, () => setDealForm(defaultDealForm), setDeals, `${dealForm.name} added.`)
  }

  const handleCreateContact = (e) => {
    e.preventDefault()
    handleCreateEntity('contacts', { id: createRecordId('cont'), ...contactForm }, () => setContactForm(defaultContactForm), setContacts, `${contactForm.name} added.`)
  }

  const handleCreateActivity = (e) => {
    e.preventDefault()
    handleCreateEntity('activities', { id: createRecordId('act'), ...activityForm }, () => setActivityForm(defaultActivityForm), setActivities, `${activityForm.subject} logged.`)
  }

  async function handleDealStageChange(dealId, nextStage) {
    try {
      const deal = deals.find(d => d.id === dealId)
      if (!deal) return
      const updated = { ...deal, stage: nextStage }
      await fetch(`/api/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      })
      await fetchData()
      setNotice('Deal stage updated.')
    } catch (err) {
      setNotice('Error updating stage.')
    }
  }

  function handleTopPrimaryAction() {
    const mapping = {
      dashboard: 'deals',
      companies: 'companies',
      deals: 'deals',
      contacts: 'contacts',
      activities: 'activities'
    }
    const formId = activeView === 'dashboard' ? 'deal-form' : `${activeView.slice(0, -1)}-form`
    focusSection(setActiveView, setNotice, mapping[activeView] || 'deals', formId, `New ${activeView.slice(0, -1)} form is ready.`)
  }

  return (
    <div className="crm-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-logo" aria-label="TDT Powersteel CRM">
            <img className="brand-logo-image" src="/tdt-powersteel-logo.png" alt="TDT Powersteel logo" />
            <h1 className="brand-name">Customer Relationship Management</h1>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'is-active' : ''}`}
              onClick={() => handleViewChange(item.id)}
            >
              <span className="nav-item__copy">
                <span className="nav-item__label">{item.label}</span>
                <span className="nav-item__description">{item.description}</span>
              </span>
              <span className="nav-item__badge">{item.badge}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-label">Today's pulse</p>
          <div className="sidebar-stat">
            <strong>{formatCurrencyCompact(pipelineValue)}</strong>
            <span>Active pipeline value</span>
          </div>
          <div className="sidebar-stat">
            <strong>{openActivities.length}</strong>
            <span>Open activities</span>
          </div>
        </div>
      </aside>

      <main className="dashboard">
        <header className="top-bar">
          <div>
            <p className="eyebrow">{currentViewMeta.eyebrow}</p>
            <h2 className="page-title">{currentViewMeta.title}</h2>
            <p className="page-description">{currentViewMeta.description}</p>
          </div>

          <div className="top-bar-actions">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={currentViewMeta.searchPlaceholder}
            />
            <button className="primary-button" onClick={handleTopPrimaryAction}>
              New {activeView === 'dashboard' ? 'deal' : activeView.slice(0, -1)}
            </button>
          </div>
        </header>

        <div className="dashboard-content content-pad">
          {activeView === 'dashboard' && (
            <Dashboard 
              deals={deals} contacts={contacts} activities={activities} selectedReports={[]}
              pipelineValue={pipelineValue} conversionRate={conversionRate} activeDeals={activeDeals}
              totalPipelineValue={totalPipelineValue} pipelineSummary={pipelineSummary}
              highPriorityDeals={highPriorityDeals} openActivities={openActivities} topMetricCards={topMetricCards}
            />
          )}
          {activeView === 'companies' && (
            <CompaniesView 
              companies={companies} filteredCompanies={filteredCompanies} 
              selectedCompany={selectedCompany} selectedCompanyId={selectedCompanyId} setSelectedCompanyId={setSelectedCompanyId}
              companyForm={companyForm} handleCompanyFormChange={handleFormChange(setCompanyForm)} handleCreateCompany={handleCreateCompany}
              salesTeam={salesTeam}
            />
          )}
          {activeView === 'deals' && (
            <DealsView
              deals={deals} totalPipelineValue={totalPipelineValue} highPriorityDeals={highPriorityDeals}
              filteredDeals={filteredDeals} selectedDeal={selectedDeal} selectedDealId={selectedDealId} setSelectedDealId={setSelectedDealId}
              stageFilter={stageFilter} setStageFilter={setStageFilter} handleDealStageChange={handleDealStageChange}
              dealForm={dealForm} handleDealFormChange={handleFormChange(setDealForm)} handleCreateDeal={handleCreateDeal}
              salesTeam={salesTeam} companies={companies} contacts={contacts}
            />
          )}
          {activeView === 'contacts' && (
            <ContactsView
              filteredContacts={filteredContacts} selectedContact={selectedContact} selectedContactId={selectedContactId} setSelectedContactId={setSelectedContactId}
              contactFilter={contactFilter} setContactFilter={setContactFilter}
              contactForm={contactForm} handleContactFormChange={handleFormChange(setContactForm)} handleCreateContact={handleCreateContact}
              salesTeam={salesTeam} companies={companies}
            />
          )}
          {activeView === 'activities' && (
            <ActivitiesView
              activities={activities} filteredActivities={filteredActivities}
              activityFilter={activityFilter} setActivityFilter={setActivityFilter}
              activityForm={activityForm} handleActivityFormChange={handleFormChange(setActivityForm)} handleCreateActivity={handleCreateActivity}
              deals={deals} salesTeam={salesTeam}
            />
          )}
        </div>
        
        <div className="status-bar"><p>{notice}</p></div>
      </main>
    </div>
  )
}

export default App
