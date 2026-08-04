import type { VideoTracker } from './content/videoTracker'
import { initializeDriveTracking } from './content/driveTracker'
import { initializeYouTubeTracking } from './content/youtubeTracker'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { FloatingWidget } from './components/FloatingWidget'
import './index.css'

let activeTracker: VideoTracker | null = null

console.log('FilmMetrics content script loaded')

void chrome.storage.local.get(['installed']).then((result: Record<string, unknown>) => {
  console.log('FilmMetrics storage state:', result)
})

activeTracker = initializeYouTubeTracking() ?? initializeDriveTracking()

const mountWidget = () => {
  const container = document.createElement('div')
  container.id = 'filmmetrics-feedback-root'
  document.body.appendChild(container)
  const root = createRoot(container)
  const video = document.querySelector('video') as HTMLVideoElement | null
  const sessionId = activeTracker?.getState().sessionId ?? 'session_unknown'
  root.render(
    React.createElement(FloatingWidget, {
      sessionId,
      title: document.title,
      url: window.location.href,
      video,
    }),
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountWidget)
} else {
  mountWidget()
}

chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
  if (message?.type === 'getStatus') {
    sendResponse(activeTracker?.getSnapshot() ?? { hasVideo: false, completion: 0, speed: 1, eventsCount: 0 })
    return true
  }

  return false
})
