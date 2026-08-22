import type { FeedbackItem } from '../types/feedback'

const STORAGE_KEY = 'filmmetrics-feedback'

export async function loadFeedback(): Promise<FeedbackItem[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const feedback = result[STORAGE_KEY] as FeedbackItem[] | undefined
  return Array.isArray(feedback) ? feedback : []
}

export async function saveFeedback(feedback: FeedbackItem[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: feedback })
}

export async function appendFeedback(item: FeedbackItem): Promise<void> {
  const feedback = await loadFeedback()
  feedback.push(item)
  await saveFeedback(feedback)
}

export async function updateFeedback(id: string, updates: Partial<FeedbackItem>): Promise<void> {
  const feedback = await loadFeedback()
  const index = feedback.findIndex((entry) => entry.id === id)
  if (index === -1) {
    return
  }
  feedback[index] = { ...feedback[index], ...updates }
  await saveFeedback(feedback)
}

export async function deleteFeedback(id: string): Promise<void> {
  const feedback = await loadFeedback()
  const next = feedback.filter((entry) => entry.id !== id)
  await saveFeedback(next)
}

export async function clearFeedback(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}

export async function getFeedbackForSession(sessionId: string): Promise<FeedbackItem[]> {
  const feedback = await loadFeedback()
  return feedback.filter((entry) => entry.sessionId === sessionId)
}

export async function markFeedbackSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return
  }
  const idSet = new Set(ids)
  const feedback = await loadFeedback()
  const next = feedback.map((entry) => (idSet.has(entry.id) ? { ...entry, synced: true } : entry))
  await saveFeedback(next)
}

export async function exportFeedbackPayload(title: string, sessionId: string, feedback: FeedbackItem[]): Promise<{ movie: string; sessionId: string; feedback: FeedbackItem[] }> {
  return { movie: title, sessionId, feedback }
}
