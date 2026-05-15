import { useState } from 'react'

export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  prevLabel = 'Previous', 
  nextLabel = 'Next', 
  className = 'pagination-controls' 
}) {
  const [inputValue, setInputValue] = useState(String(currentPage || 1))
  
  if (totalPages <= 1) return null
  
  const hBlur = () => {
    const num = parseInt(inputValue, 10)
    if (inputValue === '' || isNaN(num) || num < 1) {
      setInputValue(String(currentPage || 1))
    } else if (num > totalPages) {
      setInputValue(String(totalPages))
      onPageChange(totalPages)
    } else if (num !== currentPage) {
      onPageChange(num)
    }
  }

  const hKeyDown = (e) => {
    if (e.key === 'Enter') {
      hBlur()
    }
  }
  
  if (String(currentPage || 1) !== inputValue && !inputValue) {
    setInputValue(String(currentPage || 1))
  }
  
  return (
    <div className={className} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border)', marginTop: '16px' }}>
      <button
        type="button"
        className="secondary-button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        {prevLabel}
      </button>
      <div className="pagination-jump" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Page</span>
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ''))}
          onBlur={hBlur}
          onKeyDown={hKeyDown}
          style={{ 
            width: '40px', 
            textAlign: 'center', 
            padding: '4px 0',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            color: 'var(--text-strong)',
            fontWeight: 700,
            outline: 'none'
          }}
        />
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>of {totalPages}</span>
      </div>
      <button
        type="button"
        className="secondary-button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
        {nextLabel}
      </button>
    </div>
  )
}
