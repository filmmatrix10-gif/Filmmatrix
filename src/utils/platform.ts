import type { Platform } from '../types/tracking'

export function detectPlatform(url: string): Platform | undefined {
  try {
    const hostname = new URL(url).hostname
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube'
    }
    if (hostname.includes('drive.google.com')) {
      return 'google_drive'
    }
    return undefined
  } catch {
    return undefined
  }
}
