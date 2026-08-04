export interface FeedbackItem {
  id: string
  type: 'emoji' | 'comment'
  emoji?: string
  text?: string
  timestamp: number
  createdAt: number
  sessionId?: string
  url?: string
  title?: string
}

export interface FeedbackState {
  feedback: FeedbackItem[]
}
