export default function Panel({ kicker, title, detail, className = '', id, action, children }) {
  return (
    <article id={id} className={`panel ${className}`.trim()}>
      <div className="panel-header">
        <div>
          <p className="panel-kicker">{kicker}</p>
          <h3>{title}</h3>
        </div>
        {action ? <div className="panel-action">{action}</div> : null}
      </div>
      {detail ? <p className="panel-copy">{detail}</p> : null}
      {children}
    </article>
  )
}
