import { useState, useRef } from 'react'

export default function Select({ value, onChange, options, placeholder, readOnly, className = '' }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)
  const selected = options.find(o => o.value === value)

  function handleMouseEnter() {
    if (readOnly) return
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setOpen(true)
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => {
      setOpen(false)
    }, 300)
  }

  return (
    <div 
      className={`custom-select-container ${className}`} 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`custom-select-trigger ${readOnly ? 'input--readonly' : ''}`}>
        <span>{selected?.label || placeholder || 'Select...'}</span>
        {!readOnly && <span>▼</span>}
      </div>

      {open && !readOnly && (
        <div className="custom-select-dropdown">
          {options.map(o => (
            <div 
              key={o.value} 
              className={`custom-select-option ${o.value === value ? 'is-selected' : ''}`}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
