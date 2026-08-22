export type Platform = 'youtube' | 'google_drive'

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'

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
  /** Present on sessions created after Week 4; absent on older stored sessions. */
  platform?: Platform
  syncStatus?: SyncStatus
  uploaded?: boolean
  uploadedAt?: string | null
  /** Supabase sessions.id once the session has been created in the cloud. */
  cloudSessionId?: string
  /** Cursor into `events` marking how many have already been uploaded. */
  uploadedEventCount?: number
  syncError?: string
  /** Consecutive failed sync attempts; used to cap automatic retries (manual retry is always allowed). */
  syncAttempts?: number
}

export interface TrackingStorage {
  sessions: VideoSession[]
}
