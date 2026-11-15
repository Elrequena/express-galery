export type PlayState = 'idle' | 'playing' | 'paused'

/**
 * Background sound from a local file: an audio file or the audio track of a video.
 * The browser streams it from a Blob URL (nothing is read into memory) and the
 * URL is revoked as soon as the source is replaced or removed.
 */
export class BackgroundAudio {
  private el = new Audio()
  private url: string | null = null
  file: File | null = null

  constructor() {
    this.el.loop = true
    this.el.preload = 'auto'
    this.el.volume = 0.5
  }

  /** Loads a new source. Resolves false (and leaves no source) if the browser cannot play it. */
  async setFile(file: File): Promise<boolean> {
    this.release()
    const url = URL.createObjectURL(file)
    this.url = url
    this.el.src = url
    try {
      await new Promise<void>((resolve, reject) => {
        const done = (err?: Error) => {
          clearTimeout(timer)
          this.el.removeEventListener('loadedmetadata', ok)
          this.el.removeEventListener('error', fail)
          err ? reject(err) : resolve()
        }
        const ok = () => done()
        const fail = () => done(new Error('audio error'))
        const timer = setTimeout(() => done(new Error('timeout')), 8000)
        this.el.addEventListener('loadedmetadata', ok)
        this.el.addEventListener('error', fail)
      })
      this.file = file
      return true
    } catch {
      this.release()
      return false
    }
  }

  clear() {
    this.release()
  }

  setVolume(v: number) {
    this.el.volume = Math.min(1, Math.max(0, v))
  }

  /** Follows the animation: plays, pauses, or stops and rewinds. Safe to call repeatedly. */
  sync(state: PlayState) {
    if (!this.file) return
    if (state === 'playing') {
      if (this.el.paused) void this.el.play().catch(() => {})
      return
    }
    if (!this.el.paused) this.el.pause()
    if (state === 'idle' && this.el.currentTime > 0) this.el.currentTime = 0
  }

  private release() {
    this.el.pause()
    this.el.removeAttribute('src')
    this.el.load()
    if (this.url) URL.revokeObjectURL(this.url)
    this.url = null
    this.file = null
  }
}
