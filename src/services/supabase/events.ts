import { supabase } from '../../lib/supabase'
import type { EventInsert, EventType } from '../../types/database'
import type { VideoEvent } from '../../types/tracking'

const COMPLETE_THRESHOLD = 99.5

/**
 * Local VideoEvent.type values (set by videoTracker.ts) don't exactly match
 * the events.event_type check constraint, so they're translated here rather
 * than widening the database enum to internal-only concepts like
 * "playback-detected".
 */
function mapEventType(event: VideoEvent): EventType | null {
  switch (event.type) {
    case 'play':
      return 'play'
    case 'pause':
      return 'pause'
    case 'seek':
      return 'seek'
    case 'rewind':
      return 'rewind'
    case 'speed':
      return 'speed_change'
    case 'volume':
      return 'volume_change'
    case 'fullscreen':
      return 'fullscreen'
    case 'completion':
      return typeof event.value === 'number' && event.value >= COMPLETE_THRESHOLD
        ? 'complete'
        : 'progress'
    default:
      return null
  }
}

function toVideoTimestamp(event: VideoEvent): number | null {
  if (typeof event.timestamp === 'number') {
    return event.timestamp
  }
  if (typeof event.to === 'number') {
    return event.to
  }
  return null
}

function toValue(event: VideoEvent): number | null {
  if (typeof event.value === 'number') {
    return event.value
  }
  if (typeof event.value === 'boolean') {
    return event.value ? 1 : 0
  }
  return null
}

function toMetadata(event: VideoEvent): Record<string, unknown> | null {
  const metadata: Record<string, unknown> = {}
  if (typeof event.from === 'number') metadata.from = event.from
  if (typeof event.to === 'number') metadata.to = event.to
  if (typeof event.muted === 'boolean') metadata.muted = event.muted
  return Object.keys(metadata).length > 0 ? metadata : null
}

export function toEventInsert(sessionCloudId: string, event: VideoEvent): EventInsert | null {
  const eventType = mapEventType(event)
  if (!eventType) {
    return null
  }

  return {
    session_id: sessionCloudId,
    event_type: eventType,
    video_timestamp: toVideoTimestamp(event),
    value: toValue(event),
    metadata: toMetadata(event),
    created_at: new Date(event.time).toISOString(),
  }
}

/** Batches all given events into a single insert call rather than one request per event. */
export async function uploadEvents(sessionCloudId: string, events: VideoEvent[]): Promise<number> {
  if (!supabase || events.length === 0) {
    return 0
  }

  const rows = events
    .map((event) => toEventInsert(sessionCloudId, event))
    .filter((row): row is EventInsert => row !== null)

  if (rows.length === 0) {
    return 0
  }

  const { error } = await supabase.from('events').insert(rows)

  if (error) {
    throw error
  }

  return rows.length
}
