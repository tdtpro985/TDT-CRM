import { useState } from 'react'

const LEAD_SOURCES = ['Website', 'Referral', 'Outbound', 'Event', 'Email']

export default function LeadForm({ onSubmit, onCancel, companies, contacts, teamMembers }) {
  const [leadForm, setLeadForm] = useState({
    name: '',
    companyName: '',
    contactName: '',
    phone: '',
    source: LEAD_SOURCES[0],
    owner: teamMembers[0] ?? '',
    nextStep: ''
  })

  function handleChange(e) {
    const { name, value } = e.target
    setLeadForm((current) => {
      const next = { ...current, [name]: value }
      if (name === 'companyName' && value) {
        const c = companies.find(comp => comp.name.toLowerCase() === value.toLowerCase())
        if (c) {
          if (!current.owner) next.owner = c.owner
          const defContact = contacts.find(cont => cont.companyId === c.id)
          if (defContact && !current.contactName) {
             next.contactName = defContact.name
             if (!current.phone) next.phone = defContact.phone
          }
        }
      } else if (name === 'contactName' && value) {
        const c = contacts.find(cont => cont.name.toLowerCase() === value.toLowerCase())
        if (c) {
          if (!current.phone) next.phone = c.phone
          if (!current.owner) next.owner = c.owner
          if (!current.companyName) {
            const comp = companies.find(comp => comp.id === c.companyId)
            if (comp) next.companyName = comp.name
          }
        }
      }
      return next
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(leadForm)
  }

  return (
    <form className="form-grid" style={{ padding: '0 24px 24px' }} onSubmit={handleSubmit}>
      <label className="field field--span-2">
        <span>Lead name</span>
        <input name="name" value={leadForm.name} onChange={handleChange} placeholder="Context or title for this lead" required minLength={2} maxLength={100} autoFocus />
      </label>

      <label className="field">
        <span>Company</span>
        <input name="companyName" list="companies-lead-list" value={leadForm.companyName} onChange={handleChange} placeholder="Start typing a company..." required />
      </label>

      <label className="field">
        <span>Contact</span>
        <input name="contactName" list="contacts-lead-list" value={leadForm.contactName} onChange={handleChange} placeholder="Start typing a contact..." required />
      </label>

      <label className="field">
        <span>Contact number</span>
        <input
          name="phone"
          type="tel"
          value={leadForm.phone}
          onChange={handleChange}
          placeholder="+63 9XX XXX XXXX"
          pattern="[0-9+\-\s()]{7,20}"
          required
        />
      </label>

      <label className="field">
        <span>Source</span>
        <select name="source" value={leadForm.source} onChange={handleChange}>
          {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label className="field">
        <span>Owner</span>
        <input name="owner" list="owners-lead-list" value={leadForm.owner} onChange={handleChange} placeholder="Assigned sales owner" required maxLength={80} />
      </label>

      <label className="field field--span-2">
        <span>Next step</span>
        <textarea name="nextStep" value={leadForm.nextStep} onChange={handleChange} placeholder="Describe the next action the sales team should take" required maxLength={500} />
      </label>

      <div className="form-actions field--span-2">
        <button type="submit" className="primary-button">Save lead</button>
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
      </div>

      <datalist id="companies-lead-list">
        {companies.map((c) => <option key={c.id} value={c.name} />)}
      </datalist>
      <datalist id="contacts-lead-list">
        {contacts.map((c) => <option key={c.id} value={c.name} />)}
      </datalist>
      <datalist id="owners-lead-list">
        {teamMembers.map((m) => <option key={m} value={m} />)}
      </datalist>
    </form>
  )
}
