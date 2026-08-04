import type { FC } from 'react'
import type { FeedbackItem as FeedbackItemType } from '../types/feedback'

interface FeedbackItemProps {
  item: FeedbackItemType
  onJump: (timestamp: number) => void
  onEdit?: (id: string, text: string) => void
  onDelete?: (id: string) => void
}

const formatTime = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export const FeedbackItemView: FC<FeedbackItemProps> = ({ item, onJump, onEdit, onDelete }) => {
  return (
    <div className="timeline-entry">
      <button type="button" className="timeline-main" onClick={() => onJump(item.timestamp)}>
        <span>{formatTime(item.timestamp)}</span>
        <span>{item.type === 'emoji' ? item.emoji : '“' + (item.text ?? '') + '”'}</span>
      </button>
      {item.type === 'comment' && onEdit && onDelete ? (
        <div className="timeline-actions">
          <button type="button" className="ghost-btn" onClick={() => onEdit(item.id, item.text ?? '')}>Edit</button>
          <button type="button" className="ghost-btn" onClick={() => onDelete(item.id)}>Delete</button>
        </div>
      ) : null}
      {item.type === 'emoji' && onDelete ? (
        <div className="timeline-actions">
          <button type="button" className="ghost-btn" onClick={() => onDelete(item.id)}>Delete</button>
        </div>
      ) : null}
    </div>
  )
}
