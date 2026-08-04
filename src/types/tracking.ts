export interface VideoEvent {
  type: string
  timestamp?: number
  value?: number | boolean
  from?: number
  to?: number
  muted?: boolean
  time: number
  sessionId?: string
  url?: string
  title?: string
}

export interface VideoSession {
  sessionId: string
  url: string
  title: string
  startedAt: number
  events: VideoEvent[]
}

export interface TrackingStorage {
  sessions: VideoSession[]
}
