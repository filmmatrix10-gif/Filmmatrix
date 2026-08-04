import { VideoTracker } from './videoTracker'

export function initializeDriveTracking(): VideoTracker | null {
  if (!window.location.hostname.includes('drive.google.com')) {
    return null
  }

  const tracker = new VideoTracker()
  void tracker.initialize()

  window.addEventListener('beforeunload', () => {
    void tracker.destroy()
  })

  return tracker
}
