import { useCallback, useEffect, useState } from 'react'
import type { FeedbackItem } from '../types/feedback'
import { appendFeedback, clearFeedback, deleteFeedback, loadFeedback, updateFeedback } from '../utils/feedbackStorage'

export function useFeedback(sessionId: string, title: string, url: string) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const items = await loadFeedback()
    setFeedback(items)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addEmoji = useCallback(async (emoji: string, timestamp: number) => {
    const item: FeedbackItem = {
      id: `fb_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type: 'emoji',
      emoji,
      timestamp,
      createdAt: Date.now(),
      sessionId,
      url,
      title,
    }
    await appendFeedback(item)
    await refresh()
  }, [refresh, sessionId, title, url])

  const addComment = useCallback(async (text: string, timestamp: number) => {
    const item: FeedbackItem = {
      id: `fb_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type: 'comment',
      text,
      timestamp,
      createdAt: Date.now(),
      sessionId,
      url,
      title,
    }
    await appendFeedback(item)
    await refresh()
  }, [refresh, sessionId, title, url])

  const editComment = useCallback(async (id: string, text: string) => {
    await updateFeedback(id, { text })
    await refresh()
  }, [refresh])

  const removeFeedback = useCallback(async (id: string) => {
    await deleteFeedback(id)
    await refresh()
  }, [refresh])

  const clear = useCallback(async () => {
    await clearFeedback()
    await refresh()
  }, [refresh])

  return { feedback, loading, addEmoji, addComment, editComment, removeFeedback, clear }
}
