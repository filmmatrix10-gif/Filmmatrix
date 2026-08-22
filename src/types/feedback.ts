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
  /** Set once this item has been uploaded to Supabase; absent/false otherwise. */
  synced?: boolean
}

export interface FeedbackState {
  feedback: FeedbackItem[]
}
