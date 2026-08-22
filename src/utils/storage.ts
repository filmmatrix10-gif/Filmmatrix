import type { TrackingStorage, VideoEvent, VideoSession } from '../types/tracking'

const STORAGE_KEY = 'filmmetrics-sessions'

export async function loadSessions(): Promise<VideoSession[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const sessions = result[STORAGE_KEY] as VideoSession[] | undefined
  return Array.isArray(sessions) ? sessions : []
}

export async function appendEvent(sessionId: string, event: VideoEvent): Promise<void> {
  const sessions = await loadSessions()
  const session = sessions.find((entry) => entry.sessionId === sessionId)

  if (!session) {
    return
  }

  session.events.push(event)
  await chrome.storage.local.set({ [STORAGE_KEY]: sessions })
}

export async function appendSession(session: VideoSession): Promise<void> {
  const sessions = await loadSessions()
  sessions.push(session)
  await chrome.storage.local.set({ [STORAGE_KEY]: sessions })
}

export async function clearSessions(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}

export async function getSessionById(sessionId: string): Promise<VideoSession | null> {
  const sessions = await loadSessions()
  return sessions.find((entry) => entry.sessionId === sessionId) ?? null
}

export async function updateSession(sessionId: string, updates: Partial<VideoSession>): Promise<void> {
  const sessions = await loadSessions()
  const index = sessions.findIndex((entry) => entry.sessionId === sessionId)
  if (index === -1) {
    return
  }
  sessions[index] = { ...sessions[index], ...updates }
  await chrome.storage.local.set({ [STORAGE_KEY]: sessions })
}

export async function getStorageSnapshot(): Promise<TrackingStorage> {
  const sessions = await loadSessions()
  return { sessions }
}
