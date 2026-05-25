import { useState, useEffect } from 'react'

export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  prevLabel = 'Previous', 
  nextLabel = 'Next', 
  className = '' 
}) {
  const [inputValue, setInputValue] = useState(String(currentPage || 1))

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setInputValue(String(currentPage || 1))
  }, [currentPage])
  /* eslint-enable react-hooks/set-state-in-effect */

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
  
  return (
    <div className={`pagination-controls ${className}`}>
      <button
        type="button"
        className="secondary-button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        {prevLabel}
      </button>
      <div className="pagination-jump">
        <span>Page</span>
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ''))}
          onBlur={hBlur}
          onKeyDown={hKeyDown}
        />
        <span>of {totalPages}</span>
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
