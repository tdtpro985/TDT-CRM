import { useNavigate } from 'react-router-dom'

export default function MetricCard({ label, value, meta, accent = 'surface', route }) {
  const navigate = useNavigate()

  const interactive = !!route

  const handleClick = () => {
    if (route) navigate(route)
  }

  const handleKeyDown = (e) => {
    if (route && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      navigate(route)
    }
  }

  const cls = interactive
    ? `metric-card metric-card--${accent} metric-card--interactive`
    : `metric-card metric-card--${accent}`

  return (
    <article
      className={cls}
      onClick={interactive ? handleClick : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? `${label}: ${value}. Click to navigate.` : undefined}
    >
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{meta}</span>
    </article>
  )
}
