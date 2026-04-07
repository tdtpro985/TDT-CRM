export default function MetricCard({ label, value, meta, accent = 'surface' }) {
  return (
    <article className={`metric-card metric-card--${accent}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{meta}</span>
    </article>
  )
}
