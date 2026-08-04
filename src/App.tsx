import { useEffect, useState } from 'react'
import './App.css'
import { clearFeedback, exportFeedbackPayload, loadFeedback } from './utils/feedbackStorage'
import { clearSessions, getStorageSnapshot } from './utils/storage'

function App() {
  const [status, setStatus] = useState('Loading...')
  const [videoDetected, setVideoDetected] = useState('No video detected')
  const [sessionId, setSessionId] = useState('')
  const [eventsCollected, setEventsCollected] = useState(0)
  const [completion, setCompletion] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [feedbackCount, setFeedbackCount] = useState(0)

  const refreshStats = async (): Promise<void> => {
    const result = await chrome.storage.local.get(['installed'])
    setStatus(result.installed ? 'Extension ready' : 'Not installed yet')

    const snapshot = await getStorageSnapshot()
    const latestSession = snapshot.sessions.at(-1)
    if (latestSession) {
      setSessionId(latestSession.sessionId)
      setEventsCollected(latestSession.events.length)
      const latestCompletion = latestSession.events
        .filter((event) => event.type === 'completion' && typeof event.value === 'number')
        .map((event) => event.value as number)
        .at(-1)
      setCompletion(latestCompletion ?? 0)
      const latestSpeed = latestSession.events
        .filter((event) => event.type === 'speed' && typeof event.value === 'number')
        .map((event) => event.value as number)
        .at(-1)
      setSpeed(latestSpeed ?? 1)
      setVideoDetected('Video active')
    } else {
      setVideoDetected('No video detected')
      setSessionId('')
      setEventsCollected(0)
      setCompletion(0)
      setSpeed(1)
    }

    const feedback = await loadFeedback()
    setFeedbackCount(feedback.length)
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
      <div className="popup-actions">
        <button type="button" onClick={handleExport}>Export Feedback</button>
        <button type="button" onClick={async () => { await clearFeedback(); await refreshStats() }}>Clear Feedback</button>
        <button type="button" onClick={async () => { await clearSessions(); await refreshStats() }}>Clear Local Data</button>
      </div>
    </div>
  )
}

export default App
