export type Platform = 'youtube' | 'google_drive'

export type EventType =
  | 'play'
  | 'pause'
  | 'seek'
  | 'rewind'
  | 'speed_change'
  | 'fullscreen'
  | 'volume_change'
  | 'progress'
  | 'complete'

export type FeedbackType = 'emoji' | 'comment'

export interface Movie {
  id: string
  title: string
  video_url: string
  platform: Platform
  created_at: string
}

export interface MovieInsert {
  title: string
  video_url: string
  platform: Platform
}

export interface Session {
  id: string
  movie_id: string
  session_id: string
  video_url: string
  video_title: string
  platform: Platform
  started_at: string
  ended_at: string | null
  duration: number | null
  uploaded_at: string | null
  created_at: string
}

export interface SessionInsert {
  movie_id: string
  session_id: string
  video_url: string
  video_title: string
  platform: Platform
  started_at: string
  ended_at?: string | null
  duration?: number | null
  uploaded_at?: string | null
}

export interface Event {
  id: string
  session_id: string
  event_type: EventType
  video_timestamp: number | null
  value: number | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface EventInsert {
  session_id: string
  event_type: EventType
  video_timestamp: number | null
  value: number | null
  metadata: Record<string, unknown> | null
  created_at?: string
}

export interface Feedback {
  id: string
  session_id: string
  feedback_type: FeedbackType
  emoji: string | null
  text: string | null
  video_timestamp: number
  created_at: string
}

export interface FeedbackInsert {
  session_id: string
  feedback_type: FeedbackType
  emoji: string | null
  text: string | null
  video_timestamp: number
  created_at?: string
}

export interface Survey {
  id: string
  session_id: string
  rating: number | null
  comment: string | null
  created_at: string
}

export interface SurveyInsert {
  session_id: string
  rating?: number | null
  comment?: string | null
}
