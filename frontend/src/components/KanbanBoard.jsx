import React from 'react'
import { stageOrder } from '../constants'
import { formatCurrencyCompact, getToneClass } from '../utils'

export default function KanbanBoard({ deals, onStageChange }) {
  const handleDragStart = (e, dealId) => {
    e.dataTransfer.setData('dealId', dealId)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e, stage) => {
    e.preventDefault()
    const dealId = e.dataTransfer.getData('dealId')
    onStageChange(dealId, stage)
  }

  return (
    <div className="kanban-board">
      {stageOrder.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage)
        const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0)
        
        return (
          <div 
            key={stage} 
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="kanban-header">
              <div className="kanban-header-top">
                <h3>{stage}</h3>
                <span className="kanban-count">{stageDeals.length}</span>
              </div>
              <p className="kanban-value">{formatCurrencyCompact(stageValue)}</p>
            </div>
            
            <div className="kanban-list">
              {stageDeals.map((deal) => (
                <div 
                  key={deal.id} 
                  className="kanban-card" 
                  draggable
                  onDragStart={(e) => handleDragStart(e, deal.id)}
                >
                  <div className="kanban-card-top">
                    <strong>{deal.name}</strong>
                    <span className={`tone-pill tone-pill--small ${getToneClass(deal.priority)}`}>{deal.priority}</span>
                  </div>
                  <p className="kanban-card-company">{deal.companyName}</p>
                  <p className="kanban-card-value">{formatCurrencyCompact(deal.value)}</p>
                </div>
              ))}
              {stageDeals.length === 0 && <div className="kanban-empty">No deals</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
