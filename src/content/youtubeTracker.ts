import { VideoTracker } from './videoTracker'

export function initializeYouTubeTracking(): VideoTracker | null {
  if (!window.location.hostname.includes('youtube.com')) {
    return null
  }

  const tracker = new VideoTracker()
  void tracker.initialize()

  window.addEventListener('beforeunload', () => {
    void tracker.destroy()
  })

  return tracker
}
