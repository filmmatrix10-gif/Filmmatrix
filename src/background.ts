import { MAX_AUTO_SYNC_ATTEMPTS, uploadSessionToSupabase } from './services/supabase/uploadSession'
import { getSessionById } from './utils/storage'

chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.set({ installed: true })
})

chrome.tabs.onActivated.addListener(async () => {
  await chrome.storage.local.set({ lastTabChange: Date.now() })
})

async function autoSyncSession(sessionId: string): Promise<void> {
  const session = await getSessionById(sessionId)
  if (!session || session.syncStatus === 'synced' || session.syncStatus === 'syncing') {
    return
  }
  if ((session.syncAttempts ?? 0) >= MAX_AUTO_SYNC_ATTEMPTS) {
    return
  }
  await uploadSessionToSupabase(sessionId)
}

chrome.runtime.onMessage.addListener((message: { type?: string; sessionId?: string }) => {
  if (message?.type === 'syncSession' && message.sessionId) {
    void autoSyncSession(message.sessionId)
  }
  return false
})
