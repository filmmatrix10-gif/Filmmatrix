import { useEffect, useState } from 'react'
import './App.css'
import { clearFeedback, exportFeedbackPayload, loadFeedback } from './utils/feedbackStorage'
import { clearSessions, getSessionById, getStorageSnapshot } from './utils/storage'
import { uploadSessionToSupabase } from './services/supabase/uploadSession'
import { isCloudSyncConfigured } from './lib/supabase'
import type { SyncStatus } from './types/tracking'

function App() {
  const [status, setStatus] = useState('Loading...')
  const [videoDetected, setVideoDetected] = useState('No video detected')
  const [sessionId, setSessionId] = useState('')
  const [eventsCollected, setEventsCollected] = useState(0)
  const [completion, setCompletion] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [feedbackCount, setFeedbackCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('pending')
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [lastUploadCounts, setLastUploadCounts] = useState<{ events: number; feedback: number } | null>(null)
  const cloudSyncConfigured = isCloudSyncConfigured()

  const getLiveStatus = async (): Promise<Record<string, unknown> | null> => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return null
    }
    try {
      return await chrome.tabs.sendMessage(tab.id, { type: 'getStatus' })
    } catch {
      return null
    }
  }

  const refreshStats = async (): Promise<void> => {
    const result = await chrome.storage.local.get(['installed'])
    setStatus(result.installed ? 'Extension ready' : 'Not installed yet')

    const live = await getLiveStatus()
    const liveSessionId = live && typeof live.sessionId === 'string' ? live.sessionId : ''
    if (live) {
      setSessionId(liveSessionId)
      setEventsCollected(typeof live.eventsCount === 'number' ? live.eventsCount : 0)
      setCompletion(typeof live.completion === 'number' ? Math.max(live.completion, 0) : 0)
      setSpeed(typeof live.speed === 'number' ? live.speed : 1)
      setVideoDetected(live.hasVideo ? 'Video active' : 'No video detected')
    } else {
      setVideoDetected('No video detected')
      setSessionId('')
      setEventsCollected(0)
      setCompletion(0)
      setSpeed(1)
    }

    if (liveSessionId) {
      const localSession = await getSessionById(liveSessionId)
      if (localSession) {
        setSyncStatus(localSession.syncStatus ?? 'pending')
        setLastSyncedAt(localSession.uploadedAt ?? null)
        setSyncError(localSession.syncError ?? null)
      }
    }

    const feedback = await loadFeedback()
    setFeedbackCount(feedback.length)
  }

  const handleUpload = async (): Promise<void> => {
    if (!sessionId || uploading) {
      return
    }
    setUploading(true)
    setSyncStatus('syncing')
    const result = await uploadSessionToSupabase(sessionId)
    setUploading(false)
    if (result.success) {
      setSyncStatus('synced')
      setSyncError(null)
      setLastSyncedAt(new Date().toISOString())
      setLastUploadCounts({ events: result.eventsUploaded, feedback: result.feedbackUploaded })
    } else {
      setSyncStatus('failed')
      setSyncError(result.error ?? 'Sync failed')
    }
  }

  const syncStatusLabel = (): string => {
    switch (syncStatus) {
      case 'synced':
        return '✓ Session synced'
      case 'failed':
        return '⚠ Sync failed'
      case 'syncing':
        return 'Uploading...'
      default:
        return '● Local data saved'
    }
  }

  useEffect(() => {
    void refreshStats()
    const intervalId = window.setInterval(() => {
      void refreshStats()
    }, 2000)

    return () => window.clearInterval(intervalId)
  }, [])

  const handleExport = async () => {
    const snapshot = await getStorageSnapshot()
    const latestSession = snapshot.sessions.at(-1)
    const feedback = await loadFeedback()
    const payload = await exportFeedbackPayload(latestSession?.title ?? 'Demo Video', latestSession?.sessionId ?? sessionId, feedback)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `filmmetrics-feedback-${payload.sessionId || 'session'}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="popup">
      <h1>FilmMetrics</h1>
      <p>Chrome extension popup for YouTube insights.</p>
      <p>Status: {status}</p>
      <p>Video detected: {videoDetected}</p>
      <p>Session ID: {sessionId || 'No session yet'}</p>
      <p>Events collected: {eventsCollected}</p>
      <p>Completion: {completion.toFixed(1)}%</p>
      <p>Playback speed: {speed.toFixed(2)}x</p>
      <p>Feedback items: {feedbackCount}</p>

      <div className="cloud-sync">
        <h2>Cloud Sync</h2>
        {cloudSyncConfigured ? (
          <>
            <p>{syncStatusLabel()}</p>
            <p>Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}</p>
            {syncStatus === 'synced' && lastUploadCounts ? (
              <p className="sync-detail">
                Events uploaded: {lastUploadCounts.events}
                <br />
                Feedback uploaded: {lastUploadCounts.feedback}
              </p>
            ) : null}
            {syncStatus === 'failed' ? (
              <p className="sync-error">Your data is still safely stored locally.{syncError ? ` (${syncError})` : ''}</p>
            ) : null}
            <button type="button" className="primary-btn" disabled={uploading || !sessionId} onClick={handleUpload}>
              {uploading ? 'Uploading...' : syncStatus === 'failed' ? 'Try Again' : 'Upload Session'}
            </button>
          </>
        ) : (
          <p className="sync-note">Cloud sync not configured. Add Supabase credentials to .env to enable it.</p>
        )}
      </div>

      <div className="popup-actions">
        <button type="button" onClick={handleExport}>Export Feedback</button>
        <button type="button" onClick={async () => { await clearFeedback(); await refreshStats() }}>Clear Feedback</button>
        <button type="button" onClick={async () => { await clearSessions(); await refreshStats() }}>Clear Local Data</button>
      </div>
    </div>
  )
}

export default App
