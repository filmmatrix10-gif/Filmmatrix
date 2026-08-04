import type { FC } from 'react'
import type { FeedbackItem } from '../types/feedback'
import { FeedbackItemView } from './FeedbackItem'

interface TimelineProps {
  feedback: FeedbackItem[]
  onJump: (timestamp: number) => void
  onEdit?: (id: string, text: string) => void
  onDelete?: (id: string) => void
}

export const Timeline: FC<TimelineProps> = ({ feedback, onJump, onEdit, onDelete }) => {
  return (
    <div className="timeline-list">
      {feedback.length === 0 ? <p className="empty-state">No feedback yet.</p> : null}
      {feedback.map((item) => (
        <FeedbackItemView key={item.id} item={item} onJump={onJump} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}
