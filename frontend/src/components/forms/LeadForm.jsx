import { useState } from 'react'

export default function LeadForm({ onSubmit, onCancel, teamMembers, branch }) {
  const [leadForm, setLeadForm] = useState({
    customerName: '',
    contactNum: '',
    address: '',
    region: '',
    sr: teamMembers[0] ?? '',
  })

  function handleChange(e) {
    const { name, value } = e.target
    setLeadForm((f) => ({ ...f, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({ ...leadForm, branch })
  }

  return (
    <form className="form-grid" style={{ padding: '0 24px 24px' }} onSubmit={handleSubmit}>

      <label className="field field--span-2">
        <span>Customer Name</span>
        <input
          name="customerName"
          value={leadForm.customerName}
          onChange={handleChange}
          placeholder="Full name of the customer or business"
          required
          minLength={2}
          maxLength={200}
          autoFocus
        />
      </label>

      <label className="field">
        <span>Contact Number</span>
        <input
          name="contactNum"
          type="tel"
          value={leadForm.contactNum}
          onChange={handleChange}
          placeholder="+63 9XX XXX XXXX"
          pattern="[0-9+\-\s()]{7,20}"
          required
        />
      </label>

      <label className="field">
        <span>Region</span>
        <input
          name="region"
          value={leadForm.region}
          onChange={handleChange}
          placeholder="e.g. NCR, Region III, Region VII"
          required
        />
      </label>

      <label className="field field--span-2">
        <span>Address</span>
        <input
          name="address"
          value={leadForm.address}
          onChange={handleChange}
          placeholder="Street, Barangay, City, Province"
          required
        />
      </label>

      <label className="field">
        <span>SR (Sales Representative)</span>
        <input
          name="sr"
          list="sr-list"
          value={leadForm.sr}
          onChange={handleChange}
          placeholder="Assigned sales representative"
          required
          maxLength={100}
        />
        <datalist id="sr-list">
          {teamMembers.map((m) => <option key={m} value={m} />)}
        </datalist>
      </label>

      <label className="field">
        <span>Branch</span>
        <input
          name="branch"
          value={branch}
          readOnly
          className="input--readonly"
          title="Branch is set by your login account"
        />
      </label>

      <div className="form-actions field--span-2">
        <button type="submit" className="primary-button">Save Customer</button>
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
