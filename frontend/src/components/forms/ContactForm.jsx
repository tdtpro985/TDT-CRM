import { useState } from 'react'

export default function ContactForm({ onSubmit, onCancel, companies, teamMembers }) {
  const [contactForm, setContactForm] = useState({
    name: '',
    companyName: '',
    role: '',
    email: '',
    phone: '',
    owner: teamMembers[0] ?? '',
    status: 'Active'
  })

  function handleChange(e) {
    const { name, value } = e.target
    setContactForm((current) => {
      const next = { ...current, [name]: value }
      if (name === 'companyName' && value) {
        const c = companies.find(comp => comp.name.toLowerCase() === value.toLowerCase())
        if (c && !current.owner) next.owner = c.owner
      }
      return next
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(contactForm)
  }

  return (
    <form className="form-grid" style={{ padding: '0 24px 24px' }} onSubmit={handleSubmit}>
      <label className="field field--span-2">
        <span>Contact name</span>
        <input name="name" value={contactForm.name} onChange={handleChange} placeholder="Full name of the contact" required minLength={2} maxLength={100} autoFocus />
      </label>

      <label className="field">
        <span>Company</span>
        <input name="companyName" list="companies-contact-list" value={contactForm.companyName} onChange={handleChange} placeholder="Start typing a company..." required />
      </label>

      <label className="field">
        <span>Role</span>
        <input name="role" value={contactForm.role} onChange={handleChange} placeholder="e.g. Procurement Manager" required maxLength={100} />
      </label>

      <label className="field">
        <span>Email</span>
        <input name="email" type="email" value={contactForm.email} onChange={handleChange} placeholder="contact@company.com" required maxLength={100} />
      </label>

      <label className="field">
        <span>Phone</span>
        <input
          name="phone"
          type="tel"
          value={contactForm.phone}
          onChange={handleChange}
          placeholder="+63 9XX XXX XXXX"
          pattern="[0-9+\-\s()]{7,20}"
          required
        />
      </label>

      <label className="field">
        <span>Owner</span>
        <input name="owner" list="owners-contact-list" value={contactForm.owner} onChange={handleChange} placeholder="Assigned sales owner" required maxLength={80} />
      </label>

      <div className="form-actions field--span-2">
        <button type="submit" className="primary-button">Save contact</button>
        <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
      </div>

      <datalist id="companies-contact-list">
        {companies.map((c) => <option key={c.id} value={c.name} />)}
      </datalist>
      <datalist id="owners-contact-list">
        {teamMembers.map((m) => <option key={m} value={m} />)}
      </datalist>
    </form>
  )
}
