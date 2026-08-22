import { isCloudSyncConfigured } from '../../lib/supabase'
import { getFeedbackForSession, markFeedbackSynced } from '../../utils/feedbackStorage'
import { getSessionById, updateSession } from '../../utils/storage'
import { detectPlatform } from '../../utils/platform'
import { findOrCreateMovie } from './movies'
import { findOrCreateSession, updateSession as updateCloudSession } from './sessions'
import { uploadEvents } from './events'
import { uploadFeedback } from './feedback'

export const MAX_AUTO_SYNC_ATTEMPTS = 3

export interface UploadResult {
  success: boolean
  eventsUploaded: number
  feedbackUploaded: number
  error?: string
}

/**
 * Uploads one local session (movie -> session -> events -> feedback) to
 * Supabase. Safe to call repeatedly for the same session: the movie is
 * matched by video_url and the session by its unique session_id, and only
 * events/feedback not already marked as uploaded are sent, so retries never
 * duplicate cloud rows. Local data is never deleted, regardless of outcome.
 */
export async function uploadSessionToSupabase(sessionId: string): Promise<UploadResult> {
  if (!isCloudSyncConfigured()) {
    return {
      success: false,
      eventsUploaded: 0,
      feedbackUploaded: 0,
      error: 'Cloud sync is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).',
    }
  }

  const session = await getSessionById(sessionId)
  if (!session) {
    return { success: false, eventsUploaded: 0, feedbackUploaded: 0, error: 'Session not found locally.' }
  }

  await updateSession(sessionId, { syncStatus: 'syncing' })

  try {
    const platform = session.platform ?? detectPlatform(session.url)
    if (!platform) {
      throw new Error('Unable to determine platform (youtube / google_drive) for this session.')
    }

    const movie = await findOrCreateMovie({
      title: session.title,
      video_url: session.url,
      platform,
    })

    const startedAt = new Date(session.startedAt)
    const lastEvent = session.events.at(-1)
    const endedAt = lastEvent ? new Date(lastEvent.time) : new Date()
    const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))

    const cloudSession = await findOrCreateSession({
      movie_id: movie.id,
      session_id: session.sessionId,
      video_url: session.url,
      video_title: session.title,
      platform,
      started_at: startedAt.toISOString(),
    })

    const alreadyUploadedCount = session.uploadedEventCount ?? 0
    const pendingEvents = session.events.slice(alreadyUploadedCount)
    const eventsUploaded = await uploadEvents(cloudSession.id, pendingEvents)

    const pendingFeedback = (await getFeedbackForSession(sessionId)).filter((item) => !item.synced)
    const feedbackUploaded = await uploadFeedback(cloudSession.id, pendingFeedback)
    await markFeedbackSynced(pendingFeedback.map((item) => item.id))

    const uploadedAt = new Date()
    await updateCloudSession(cloudSession.id, {
      ended_at: endedAt.toISOString(),
      duration: durationSeconds,
      uploaded_at: uploadedAt.toISOString(),
    })

    await updateSession(sessionId, {
      syncStatus: 'synced',
      uploaded: true,
      uploadedAt: uploadedAt.toISOString(),
      cloudSessionId: cloudSession.id,
      uploadedEventCount: session.events.length,
      syncError: undefined,
      syncAttempts: 0,
    })

    return { success: true, eventsUploaded, feedbackUploaded }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error'
    await updateSession(sessionId, {
      syncStatus: 'failed',
      syncError: message,
      syncAttempts: (session.syncAttempts ?? 0) + 1,
    })
    return { success: false, eventsUploaded: 0, feedbackUploaded: 0, error: message }
  }
}
