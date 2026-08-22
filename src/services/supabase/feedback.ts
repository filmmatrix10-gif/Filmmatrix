import { supabase } from '../../lib/supabase'
import type { Feedback, FeedbackInsert } from '../../types/database'
import type { FeedbackItem } from '../../types/feedback'

export function toFeedbackInsert(sessionCloudId: string, item: FeedbackItem): FeedbackInsert {
  return {
    session_id: sessionCloudId,
    feedback_type: item.type,
    emoji: item.type === 'emoji' ? item.emoji ?? null : null,
    text: item.type === 'comment' ? item.text ?? null : null,
    video_timestamp: item.timestamp,
    created_at: new Date(item.createdAt).toISOString(),
  }
}

/** Batches all given feedback into a single insert call rather than one request per item. */
export async function uploadFeedback(sessionCloudId: string, items: FeedbackItem[]): Promise<number> {
  if (!supabase || items.length === 0) {
    return 0
  }

  const rows = items.map((item) => toFeedbackInsert(sessionCloudId, item))

  const { error } = await supabase.from('feedback').insert(rows)

  if (error) {
    throw error
  }

  return rows.length
}

export async function getSessionFeedback(sessionCloudId: string): Promise<Feedback[]> {
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('session_id', sessionCloudId)
    .order('video_timestamp', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as Feedback[]
}
