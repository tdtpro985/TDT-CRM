const PLM = [
  { name: 'Frinz Sagmaquen', role: 'Developer' },
  { name: 'Lord Mungcal',    role: 'Developer' },
  { name: 'Charles Miranda', role: 'Developer' },
]

const UCC = [
  { name: 'Ronan Aleck A. Gatmaitan', role: 'Frontend Dev' },
  { name: 'Glenn Jimm G. Gamul',      role: 'Frontend Dev' },
  { name: 'Alberto Magno C. Rili',    role: 'Backend Dev'  },
  { name: 'Mark Creed P. Angco',      role: 'Backend Dev'  },
]

function initials(name) {
  const parts = name.trim().split(' ')
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function DevCard({ name, role, index }) {
  return (
    <div className="dev-card" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="dev-card-inner">
        <div className="dev-avatar-badge">{initials(name)}</div>
        <div className="dev-info">
          <span className="dev-name">{name}</span>
          <span className="dev-role">{role}</span>
        </div>
        <div className="dev-card-watermark">CRM</div>
      </div>
      <div className="dev-card-accent" />
    </div>
  )
}

export default function AboutContent() {
  return (
    <div className="about-content">
      <div className="about-hero">
        <img src="/Logo_tdt.png" alt="TDT Powersteel" className="about-hero-logo" />
        <p className="about-hero-sub">Sales CRM · Internal Tool</p>
      </div>

      <div className="about-school">
        <p className="about-school-label">Pamantasan ng Lungsod ng Maynila</p>
        <div className="dev-list">
          {PLM.map((d, i) => <DevCard key={d.name} {...d} index={i} />)}
        </div>
      </div>

      <div className="about-school">
        <p className="about-school-label">University of Caloocan City</p>
        <div className="dev-list">
          {UCC.map((d, i) => <DevCard key={d.name} {...d} index={PLM.length + i} />)}
        </div>
      </div>

      <p className="about-footer">Built with React + Flask · {new Date().getFullYear()}</p>
    </div>
  )
}
