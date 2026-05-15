import { useState } from 'react'
import { DEAL_STAGES } from '../../constants'
import Select from '../Select'

export default function DealForm({ onSubmit, onCancel, companies, contacts, teamMembers, currentUser, dealStages = DEAL_STAGES }) {
  const isSalesRep = currentUser?.role === 'Sales Representative' || currentUser?.role === 'Sales Rep'
  
  const [dealForm, setDealForm] = useState({
    name: '',
    companyName: '',
    contactName: '',
    stage: dealStages[0],
    value: '',
    expectedClose: '',
    owner: isSalesRep ? currentUser.name : '',
    ownerId: isSalesRep ? currentUser.id : ''
  })

  function handleChange(e) {
    const { name, value } = e.target
    setDealForm((current) => {
      let next = { ...current, [name]: value }
      if (name === 'ownerId') {
        const selectedMember = teamMembers.find(m => String(m.id) === value)
        next.owner = selectedMember ? selectedMember.name : ''
        next.ownerId = value
      } else if (name === 'companyName' && value) {
        const c = companies.find((comp) => comp.name.toLowerCase() === value.toLowerCase())
        if (c && !current.ownerId) {
          next.ownerId = c.ownerId || ''
          next.owner = c.owner || ''
        }
      } else if (name === 'contactName' && value) {
        const c = contacts.find((cont) => cont.name.toLowerCase() === value.toLowerCase())
        if (c && !current.ownerId) {
          next.ownerId = c.ownerId || ''
          next.owner = c.owner || ''
        }
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
        <Select
          value={dealForm.stage}
          onChange={(v) => handleChange({ target: { name: 'stage', value: v } })}
          options={dealStages.map(s => ({ value: s, label: s }))}
        />
      </label>

      <label className="field">
        <span>Value</span>
        <input name="value" type="number" min="0" value={dealForm.value} onChange={handleChange} placeholder="Enter value" required />
      </label>

      <label className="field">
        <span>Expected close</span>
        <input name="expectedClose" type="date" value={dealForm.expectedClose} onChange={handleChange} required />
      </label>

      {!isSalesRep && (
        <label className="field field--span-2">
          <span>Owner</span>
          <Select
            value={String(dealForm.ownerId)}
            onChange={(v) => handleChange({ target: { name: 'ownerId', value: v } })}
            options={teamMembers.map(m => ({ value: String(m.id), label: `${m.name} (${m.branch})` }))}
            placeholder="Select Representative"
          />
        </label>
      )}

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
    </form>
  )
}
