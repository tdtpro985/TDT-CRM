import { useState } from 'react'

export default function CompanyForm({ onSubmit, onCancel, teamMembers }) {
  const [companyForm, setCompanyForm] = useState({
    name: '',
    industry: '',
    city: '',
    website: '',
    owner: teamMembers[0] ?? '',
    status: 'Active'
  })

  function handleChange(e) {
    const { name, value } = e.target
    setCompanyForm((current) => ({ ...current, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(companyForm)
  }

  return (
    <form className="form-grid" style={{ padding: '0 24px 24px' }} onSubmit={handleSubmit}>
      <label className="field field--span-2">
        <span>Company name</span>
        <input name="name" value={companyForm.name} onChange={handleChange} placeholder="Official business name" required minLength={2} maxLength={100} autoFocus />
      </label>

      <label className="field">
        <span>Industry</span>
        <input name="industry" value={companyForm.industry} onChange={handleChange} placeholder="e.g. Construction, Manufacturing" required maxLength={100} />
      </label>

      <label className="field">
        <span>City</span>
        <input name="city" value={companyForm.city} onChange={handleChange} placeholder="Headquarters location" required maxLength={100} />
      </label>

      <label className="field">
        <span>Website</span>
        <input name="website" type="url" value={companyForm.website} onChange={handleChange} placeholder="https://www.example.com" />
      </label>

      <label className="field">
        <span>Owner</span>
        <input name="owner" list="owners-company-list" value={companyForm.owner} onChange={handleChange} placeholder="Assigned sales owner" required maxLength={80} />
      </label>

      <div className="form-actions field--span-2">
        <button type="submit" className="primary-button">Save company</button>
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
      </div>

      <datalist id="owners-company-list">
        {teamMembers.map((m) => <option key={m} value={m} />)}
      </datalist>
    </form>
  )
}
