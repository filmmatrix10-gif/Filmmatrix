import type { Platform, VideoEvent, VideoSession } from '../types/tracking'
import { createSessionId, getPageTitle } from '../utils/session'
import { appendEvent, loadSessions } from '../utils/storage'
import { detectPlatform } from '../utils/platform'

const COMPLETION_STEP = 5

export interface TrackerState {
  sessionId: string
  sessionStartedAt: number
  video: HTMLVideoElement | null
  hasVideo: boolean
  lastLoggedCompletion: number
  currentUrl: string
  title: string
  platform?: Platform
  eventsCount: number
  lastKnownSpeed: number
  lastKnownVolume: number
  lastKnownMuted: boolean
  lastKnownTime: number
}

export class VideoTracker {
  private state: TrackerState
  private intervalId: number | null = null
  private cleanupFns: Array<() => void> = []

  constructor() {
    this.state = {
      sessionId: createSessionId(),
      sessionStartedAt: Date.now(),
      video: null,
      hasVideo: false,
      lastLoggedCompletion: -1,
      currentUrl: window.location.href,
      title: getPageTitle(document),
      platform: detectPlatform(window.location.href),
      eventsCount: 0,
      lastKnownSpeed: 1,
      lastKnownVolume: 1,
      lastKnownMuted: false,
      lastKnownTime: 0,
    }
  }

  public async initialize(): Promise<void> {
    this.bindVideoDetection()
    await this.ensureSessionStored()
    this.attachToCurrentVideo()
    this.startCompletionTracking()
  }

  public async destroy(): Promise<void> {
    this.cleanupFns.forEach((cleanup) => cleanup())
    this.cleanupFns = []
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.requestAutoSync()
  }

  /**
   * Fire-and-forget: asks the background service worker to attempt a cloud
   * sync now that the session has ended. Manual "Upload Session" in the
   * popup remains the primary, reliable path — this is a best-effort extra.
   */
  private requestAutoSync(): void {
    try {
      chrome.runtime.sendMessage({ type: 'syncSession', sessionId: this.state.sessionId }).catch(() => {})
    } catch {
      // Extension context can be invalidated during page teardown; local data is unaffected.
    }
  }

  public getState(): TrackerState {
    return { ...this.state, video: this.state.video }
  }

  public getSnapshot(): Record<string, unknown> {
    return {
      sessionId: this.state.sessionId,
      hasVideo: this.state.hasVideo,
      completion: this.getLiveCompletion(),
      speed: this.state.lastKnownSpeed,
      volume: this.state.lastKnownVolume,
      muted: this.state.lastKnownMuted,
      eventsCount: this.state.eventsCount,
      title: this.state.title,
      url: this.state.currentUrl,
    }
  }

  private getLiveCompletion(): number {
    const video = this.state.video
    if (!video || Number.isNaN(video.duration) || video.duration <= 0) {
      return 0
    }
    return (video.currentTime / video.duration) * 100
  }

  private bindVideoDetection(): void {
    const observer = new MutationObserver(() => {
      this.attachToCurrentVideo()
    })

    observer.observe(document.documentElement, { childList: true, subtree: true })
    this.cleanupFns.push(() => observer.disconnect())
  }

  private async ensureSessionStored(): Promise<void> {
    const existing = await loadSessions()
    const alreadyExists = existing.some((session) => session.sessionId === this.state.sessionId)

    if (!alreadyExists) {
      const session: VideoSession = {
        sessionId: this.state.sessionId,
        url: this.state.currentUrl,
        title: this.state.title,
        startedAt: this.state.sessionStartedAt,
        events: [],
        platform: this.state.platform,
        syncStatus: 'pending',
        uploaded: false,
        uploadedAt: null,
        uploadedEventCount: 0,
      }
      await chrome.storage.local.set({ 'filmmetrics-sessions': [...existing, session] })
    }
  }

  private attachToCurrentVideo(): void {
    const video = this.findVideoElement()
    if (!video || video === this.state.video) {
      this.state.hasVideo = Boolean(video)
      return
    }

    this.state.video = video
    this.state.hasVideo = true
    this.state.lastKnownSpeed = video.playbackRate || 1
    this.state.lastKnownVolume = video.volume || 1
    this.state.lastKnownMuted = video.muted
    this.state.lastKnownTime = video.currentTime || 0
    this.bindVideoEvents(video)
    void this.logEvent({ type: 'playback-detected', time: Date.now(), timestamp: video.currentTime })
  }

  private findVideoElement(): HTMLVideoElement | null {
    const video = document.querySelector('video')
    return video instanceof HTMLVideoElement ? video : null
  }

  private bindVideoEvents(video: HTMLVideoElement): void {
    if (this.state.video && this.state.video !== video) {
      this.removeVideoListeners(this.state.video)
    }

    const handlers = [
      { eventName: 'play', handler: this.onPlay },
      { eventName: 'pause', handler: this.onPause },
      { eventName: 'seeking', handler: this.onSeek },
      { eventName: 'seeked', handler: this.onSeeked },
      { eventName: 'ratechange', handler: this.onRateChange },
      { eventName: 'volumechange', handler: this.onVolumeChange },
      { eventName: 'timeupdate', handler: this.onTimeUpdate },
    ] as const

    for (const { eventName, handler } of handlers) {
      video.addEventListener(eventName, handler as EventListener)
      this.cleanupFns.push(() => video.removeEventListener(eventName, handler as EventListener))
    }

    document.addEventListener('fullscreenchange', this.onFullscreenChange)
    this.cleanupFns.push(() => document.removeEventListener('fullscreenchange', this.onFullscreenChange))
  }

  private removeVideoListeners(video: HTMLVideoElement | null): void {
    if (!video) {
      return
    }

    this.cleanupFns = this.cleanupFns.filter((cleanup) => {
      if (cleanup.name === 'boundCleanup') {
        return true
      }
      return true
    })
  }

  private onPlay = (event: Event): void => {
    const video = this.state.video
    if (!video) {
      return
    }
    void this.logEvent({ type: 'play', time: Date.now(), timestamp: video.currentTime })
    this.logPrefix('Play', event)
  }

  private onPause = (event: Event): void => {
    const video = this.state.video
    if (!video) {
      return
    }
    void this.logEvent({ type: 'pause', time: Date.now(), timestamp: video.currentTime })
    this.logPrefix('Pause', event)
  }

  private onSeek = (event: Event): void => {
    const video = this.state.video
    if (!video) {
      return
    }
    const from = this.state.lastKnownTime
    const to = video.currentTime
    if (from === to) {
      return
    }
    const type = to < from ? 'rewind' : 'seek'
    void this.logEvent({ type, time: Date.now(), from, to })
    this.logPrefix(type === 'rewind' ? 'Rewind' : 'Seek', event)
  }

  private onSeeked = (event: Event): void => {
    const video = this.state.video
    if (!video) {
      return
    }
    this.state.lastKnownTime = video.currentTime
    this.logPrefix('Seeked', event)
  }

  private onRateChange = (event: Event): void => {
    const video = this.state.video
    if (!video) {
      return
    }
    const value = video.playbackRate
    this.state.lastKnownSpeed = value
    void this.logEvent({ type: 'speed', time: Date.now(), value })
    this.logPrefix('Speed', event)
  }

  private onVolumeChange = (event: Event): void => {
    const video = this.state.video
    if (!video) {
      return
    }
    const value = video.volume
    const muted = video.muted
    this.state.lastKnownVolume = value
    this.state.lastKnownMuted = muted
    void this.logEvent({ type: 'volume', time: Date.now(), value, muted })
    this.logPrefix('Volume', event)
  }

  private onFullscreenChange = (event: Event): void => {
    const value = Boolean(document.fullscreenElement)
    void this.logEvent({ type: 'fullscreen', time: Date.now(), value })
    this.logPrefix('Fullscreen', event)
  }

  private onTimeUpdate = (event: Event): void => {
    const video = this.state.video
    if (!video) {
      return
    }
    this.state.lastKnownTime = video.currentTime
    this.logPrefix('Timeupdate', event)
  }

  private startCompletionTracking(): void {
    this.intervalId = window.setInterval(() => {
      const video = this.state.video
      if (!video || Number.isNaN(video.duration) || video.duration <= 0) {
        return
      }
      const completion = (video.currentTime / video.duration) * 100
      const delta = completion - this.state.lastLoggedCompletion
      if (delta >= COMPLETION_STEP) {
        this.state.lastLoggedCompletion = completion
        void this.logEvent({ type: 'completion', time: Date.now(), value: Number(completion.toFixed(1)) })
        this.logPrefix(`Completion ${completion.toFixed(1)}%`)
      }
    }, 5000)
  }

  private async logEvent(event: VideoEvent): Promise<void> {
    this.state.eventsCount += 1
    const eventWithMetadata: VideoEvent = {
      ...event,
      sessionId: this.state.sessionId,
      url: this.state.currentUrl,
      title: this.state.title,
    }

    console.log('[FilmMetrics]', eventWithMetadata.type, eventWithMetadata)
    await appendEvent(this.state.sessionId, eventWithMetadata)
  }

  private logPrefix(label: string, event?: Event): void {
    console.log(`[FilmMetrics] ${label}`, event?.type ?? '')
  }
}
