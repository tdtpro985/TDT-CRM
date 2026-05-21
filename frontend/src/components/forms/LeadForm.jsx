import { useState } from 'react'
import { isSrRole } from '../../utils'

export default function LeadForm({ onSubmit, onCancel, teamMembers, branch, currentUser }) {
  const isSr = isSrRole(currentUser?.role)
  const [leadForm, setLeadForm] = useState({
    customerName: '',
    contactNum: '',
    address: '',
    region: '',
    sr: isSr ? currentUser?.name || '' : '',
    ownerId: isSr ? currentUser?.id || '' : '',
  })

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'ownerId') {
      const selectedMember = teamMembers.find(m => String(m.id) === value)
      setLeadForm((f) => ({ 
        ...f, 
        ownerId: value,
        sr: selectedMember ? selectedMember.name : ''
      }))
    } else {
      setLeadForm((f) => ({ ...f, [name]: value }))
    }
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

      {isSr ? (
        <label className="field">
          <span>SR (Sales Representative)</span>
          <input
            value={leadForm.sr || currentUser?.name || ''}
            readOnly
            className="input--readonly"
            title="Assigned to you automatically"
          />
        </label>
      ) : (
        <label className="field">
          <span>SR (Sales Representative)</span>
          <select
            name="ownerId"
            value={leadForm.ownerId}
            onChange={handleChange}
            required
          >
            <option value="">Select Representative</option>
            {teamMembers
              .filter(m => m.branch === branch || branch === 'Headquarters')
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.region})
                </option>
              ))
            }
          </select>
        </label>
      )}

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
