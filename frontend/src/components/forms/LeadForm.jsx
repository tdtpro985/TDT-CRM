import { useState } from 'react'
import { isSrRole, isValidPhone } from '../../utils'

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
  const [errors, setErrors] = useState({})

  function handleChange(e) {
    const { name, value } = e.target
    setErrors((prev) => ({ ...prev, [name]: '' }))
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
    const newErrors = {}
    if (!leadForm.customerName.trim()) newErrors.customerName = 'Customer name is required'
    else if (leadForm.customerName.trim().length < 2) newErrors.customerName = 'Name is too short'
    if (!leadForm.contactNum.trim()) newErrors.contactNum = 'Contact number is required'
    else if (!isValidPhone(leadForm.contactNum)) newErrors.contactNum = 'Invalid phone number'
    if (!leadForm.region.trim()) newErrors.region = 'Region is required'
    if (!leadForm.address.trim()) newErrors.address = 'Address is required'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onSubmit({ ...leadForm, branch })
  }

  return (
    <form className="form-grid form-body" onSubmit={handleSubmit} noValidate>

      <label className="field field--span-2">
        <span>Customer Name</span>
        <input
          name="customerName"
          value={leadForm.customerName}
          onChange={handleChange}
          placeholder="Full name of the customer or business"
          className={errors.customerName ? 'u-border-alert' : ''}
          autoFocus
        />
        {errors.customerName && <p className="u-fs-10 u-alert u-margin-t-4">{errors.customerName}</p>}
      </label>

      <label className="field">
        <span>Contact Number</span>
        <input
          name="contactNum"
          type="tel"
          value={leadForm.contactNum}
          onChange={handleChange}
          placeholder="+63 9XX XXX XXXX"
          className={errors.contactNum ? 'u-border-alert' : ''}
        />
        {errors.contactNum && <p className="u-fs-10 u-alert u-margin-t-4">{errors.contactNum}</p>}
      </label>

      <label className="field">
        <span>Region</span>
        <input
          name="region"
          value={leadForm.region}
          onChange={handleChange}
          placeholder="e.g. NCR, Region III, Region VII"
          className={errors.region ? 'u-border-alert' : ''}
        />
        {errors.region && <p className="u-fs-10 u-alert u-margin-t-4">{errors.region}</p>}
      </label>

      <label className="field field--span-2">
        <span>Address</span>
        <input
          name="address"
          value={leadForm.address}
          onChange={handleChange}
          placeholder="Street, Barangay, City, Province"
          className={errors.address ? 'u-border-alert' : ''}
        />
        {errors.address && <p className="u-fs-10 u-alert u-margin-t-4">{errors.address}</p>}
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
