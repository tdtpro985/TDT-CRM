import { useState, useMemo } from 'react'
import { isSrRole, isValidPhone } from '../../utils'
import { REGION_BRANCHES } from '../../constants'

function getRegionFromBranch(branch) {
  for (const [region, branches] of Object.entries(REGION_BRANCHES)) {
    if (branches.some(b => b.toLowerCase() === (branch || '').toLowerCase())) return region
  }
  return ''
}

export default function LeadForm({ onSubmit, onCancel, teamMembers, currentUser, contacts = [] }) {
  const isSr = isSrRole(currentUser?.role)
  const isRsm = currentUser?.role === 'Regional Sales Manager'
  const isHos = currentUser?.role === 'Head of Sales'
  const canPickRegion = isHos
  const canPickBranch = isHos || isRsm

  const initialRegion = !canPickRegion
    ? (isRsm ? (currentUser?.region || '') : getRegionFromBranch(currentUser?.branch))
    : ''
  const [leadForm, setLeadForm] = useState({
    customerName: '',
    contactNum: '',
    address: '',
    region: initialRegion,
    branch: isSr ? (currentUser?.branch || '') : '',
    contactName: '',
    email: '',
    website: '',
    industry: '',
    sr: isSr ? currentUser?.name || '' : '',
    ownerId: isSr ? currentUser?.id || '' : '',
  })
  const [errors, setErrors] = useState({})

  const branchOptions = useMemo(() => {
    if (!leadForm.region) return Object.values(REGION_BRANCHES).flat()
    return REGION_BRANCHES[leadForm.region] || []
  }, [leadForm.region])

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
    } else if (name === 'region') {
      setLeadForm((f) => ({ ...f, region: value, branch: '' }))
    } else if (name === 'contactName') {
      setLeadForm((f) => ({ ...f, contactName: value }))
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
    if (canPickBranch && !leadForm.branch.trim()) newErrors.branch = 'Branch is required'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onSubmit(leadForm)
  }

  return (
    <form className="form-grid form-body" onSubmit={handleSubmit} noValidate>

      {/* ── Company Details ── */}
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
        <span>Website</span>
        <input
          name="website"
          value={leadForm.website}
          onChange={handleChange}
          placeholder="https://example.com"
        />
      </label>

      <label className="field">
        <span>Industry</span>
        <input
          name="industry"
          value={leadForm.industry}
          onChange={handleChange}
          placeholder="e.g. Construction, Logistics"
        />
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

      {canPickRegion ? (
        <label className="field">
          <span>Region</span>
          <input
            name="region"
            list="region-list"
            value={leadForm.region}
            onChange={handleChange}
            placeholder="Select or type a region"
            className={errors.region ? 'u-border-alert' : ''}
          />
          <datalist id="region-list">
            {Object.keys(REGION_BRANCHES).map(r => <option key={r} value={r} />)}
          </datalist>
          {errors.region && <p className="u-fs-10 u-alert u-margin-t-4">{errors.region}</p>}
        </label>
      ) : (
        <label className="field">
          <span>Region</span>
          <input
            value={leadForm.region}
            readOnly
            className="input--readonly"
          />
        </label>
      )}

      {canPickBranch ? (
        <label className="field">
          <span>Branch</span>
          <input
            name="branch"
            list="branch-list"
            value={leadForm.branch}
            onChange={handleChange}
            placeholder={isRsm ? `Select branch in ${currentUser?.region || 'your region'}` : 'Select or type a branch'}
            className={errors.branch ? 'u-border-alert' : ''}
          />
          <datalist id="branch-list">
            {(isRsm ? (REGION_BRANCHES[currentUser?.region] || []) : branchOptions).map(b => (
              <option key={b} value={b} />
            ))}
          </datalist>
          {errors.branch && <p className="u-fs-10 u-alert u-margin-t-4">{errors.branch}</p>}
        </label>
      ) : (
        <label className="field">
          <span>Branch</span>
          <input
            value={leadForm.branch}
            readOnly
            className="input--readonly"
            title="Branch is set by your login account"
          />
        </label>
      )}

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
              .filter(m => !leadForm.branch || m.branch === leadForm.branch)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.region})
                </option>
              ))
            }
          </select>
        </label>
      )}

      {/* ── Contact Details ── */}
      <label className="field">
        <span>Contact Person</span>
        <input
          name="contactName"
          list="contact-list"
          value={leadForm.contactName}
          onChange={handleChange}
          placeholder="Primary contact name"
        />
        <datalist id="contact-list">
          {contacts.map(c => <option key={c.id} value={c.name} />)}
        </datalist>
      </label>

      <label className="field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          value={leadForm.email}
          onChange={handleChange}
          placeholder="name@company.com"
        />
      </label>

      <label className="field">
        <span>Contact Phone</span>
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

      <div className="form-actions field--span-2">
        <button type="submit" className="primary-button">Save Customer</button>
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
