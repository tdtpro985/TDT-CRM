import { useState } from 'react'

const DEAL_STAGES = ['New Opportunity', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won']

export default function DealForm({ onSubmit, onCancel, companies, contacts, teamMembers, dealStages = DEAL_STAGES }) {
  const [dealForm, setDealForm] = useState({
    name: '',
    companyName: '',
    contactName: '',
    stage: dealStages[0],
    value: '',
    expectedClose: '',
    owner: teamMembers[0] ?? ''
  })

  function handleChange(e) {
    const { name, value } = e.target
    setDealForm((current) => {
      const next = { ...current, [name]: value }
      if (name === 'companyName' && value) {
        const c = companies.find((comp) => comp.name.toLowerCase() === value.toLowerCase())
        if (c && !current.owner) next.owner = c.owner
      } else if (name === 'contactName' && value) {
        const c = contacts.find((cont) => cont.name.toLowerCase() === value.toLowerCase())
        if (c && !current.owner) next.owner = c.owner
        if (c && !current.companyName) {
          const comp = companies.find((comp) => comp.id === c.companyId)
          if (comp) next.companyName = comp.name
        }
      }
      return next
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(dealForm)
  }

  return (
    <form className="form-grid" style={{ padding: '0 24px 24px' }} onSubmit={handleSubmit}>
      <label className="field field--span-2">
        <span>Deal name</span>
        <input name="name" value={dealForm.name} onChange={handleChange} placeholder="Enter opportunity name" required autoFocus />
      </label>

      <label className="field">
        <span>Company</span>
        <input name="companyName" list="companies-deal-list" value={dealForm.companyName} onChange={handleChange} placeholder="Enter company name" />
      </label>

      <label className="field">
        <span>Contact</span>
        <input name="contactName" list="contacts-deal-list" value={dealForm.contactName} onChange={handleChange} placeholder="Enter contact name" />
      </label>

      <label className="field">
        <span>Stage</span>
        <select name="stage" value={dealForm.stage} onChange={handleChange}>
          {dealStages.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label className="field">
        <span>Value</span>
        <input name="value" type="number" min="0" value={dealForm.value} onChange={handleChange} placeholder="Enter value" required />
      </label>

      <label className="field">
        <span>Expected close</span>
        <input name="expectedClose" type="date" value={dealForm.expectedClose} onChange={handleChange} required />
      </label>

      <label className="field field--span-2">
        <span>Owner</span>
        <input name="owner" list="owners-deal-list" value={dealForm.owner} onChange={handleChange} placeholder="Enter owner name" />
      </label>

      <div className="form-actions field--span-2">
        <button type="submit" className="primary-button">Save deal</button>
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
      </div>

      <datalist id="companies-deal-list">
        {companies.map((c) => <option key={c.id} value={c.name} />)}
      </datalist>
      <datalist id="contacts-deal-list">
        {contacts.map((c) => <option key={c.id} value={c.name} />)}
      </datalist>
      <datalist id="owners-deal-list">
        {teamMembers.map((m) => <option key={m} value={m} />)}
      </datalist>
    </form>
  )
}
