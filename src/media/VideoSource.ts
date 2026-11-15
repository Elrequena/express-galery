import { BaseTexture, Texture, VideoResource } from 'pixijs'
import { videoConfig } from './config.ts'
import type { MediaItem } from './types.ts'

const VIDEO_EXT = /\.(mp4|webm|mov)$/i
const MIME: Record<string, string> = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' }

const probe = document.createElement('video')

/** Cheap pre-check; the real verdict is the load itself (bad files are skipped at runtime). */
function maybePlayable(file: File): boolean {
  const ext = file.name.split('.').pop()!.toLowerCase()
  const can = (t: string) => probe.canPlayType(t) !== ''
  if (ext === 'mov') return can(MIME.mov) || can(MIME.mp4)
  return can(MIME[ext])
}

export const isSupportedVideo = (f: File) => VIDEO_EXT.test(f.name) && maybePlayable(f)

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** Resolves on `ok`, rejects on media error or timeout. */
function waitFor(video: HTMLVideoElement, ok: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = (err?: Error) => {
      clearTimeout(timer)
      video.removeEventListener(ok, onOk)
      video.removeEventListener('error', onErr)
      err ? reject(err) : resolve()
    }
    const onOk = () => done()
    const onErr = () => done(new Error('video error'))
    const timer = setTimeout(() => done(new Error('timeout')), videoConfig.loadTimeoutMs)
    video.addEventListener(ok, onOk)
    video.addEventListener('error', onErr)
  })
}

interface Opened {
  video: HTMLVideoElement
  duration: number
  /** Detaches the element and revokes its Blob URL. */
  close(): void
}

/**
 * Provides short random clips (and still frames) of the selected videos.
 * Nothing is loaded until requested; each video is streamed by the browser
 * from a Blob URL (never read into memory by us).
 */
export class VideoSource {
  private files: File[] = []
  private bad = new Set<File>()
  private inUse = new Map<File, number[]>() // file -> start times of its active clips
  private recent = new Map<File, number[]>() // file -> recent frame times
  private slots = 0
  private generation = 0
  private frameQueue: Promise<unknown> = Promise.resolve()

  get count() {
    return this.files.length
  }

  /** Clips currently loading or playing. */
  get active() {
    return this.slots
  }

  get hasUsable() {
    return this.files.some((f) => !this.bad.has(f))
  }

  /** True when another clip may start loading (a little headroom lets replacements preload). */
  get canStartClip() {
    return this.hasUsable && this.slots < videoConfig.maxConcurrent + videoConfig.overlapSlots
  }

  setFiles(list: File[]) {
    this.generation++ // in-flight work becomes stale and cleans itself up
    this.slots = 0
    this.inUse.clear()
    this.recent.clear()
    this.bad.clear()
    this.files = list.filter(isSupportedVideo)
  }

  /** Picks the least-used usable file, so one is repeated only when all are already playing. */
  private pickFile(): File | null {
    const usable = this.files.filter((f) => !this.bad.has(f))
    if (!usable.length) return null
    const use = (f: File) => this.inUse.get(f)?.length ?? 0
    const min = Math.min(...usable.map(use))
    const pool = usable.filter((f) => use(f) === min)
    return pool[Math.floor(Math.random() * pool.length)]
  }

  /** Best-of-N random time in [lo, hi], far from `avoid` times. */
  private pickTime(lo: number, hi: number, avoid: number[]): number {
    if (hi <= lo) return lo
    let best = rand(lo, hi)
    let bestGap = -1
    for (let i = 0; i < 8; i++) {
      const t = rand(lo, hi)
      const gap = avoid.length ? Math.min(...avoid.map((a) => Math.abs(a - t))) : Infinity
      if (gap > bestGap) {
        best = t
        bestGap = gap
        if (gap >= videoConfig.startSeparation) break
      }
    }
    return best
  }

  private async open(file: File): Promise<Opened> {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.src = url
    const close = () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url) // only when nothing uses it anymore
    }
    try {
      await waitFor(video, 'loadedmetadata')
      const d = video.duration
      if (!Number.isFinite(d) || d < 0.5 || !video.videoWidth) throw new Error('no usable metadata')
      return { video, duration: d, close }
    } catch (e) {
      close()
      throw e
    }
  }

  private async seek(video: HTMLVideoElement, t: number) {
    const seeked = waitFor(video, 'seeked')
    video.currentTime = t
    await seeked
  }

  /** A playing clip of a random video. */
  async nextClip(): Promise<MediaItem | null> {
    const file = this.canStartClip ? this.pickFile() : null
    if (!file) return null
    const gen = this.generation
    const starts = this.inUse.get(file) ?? []
    this.inUse.set(file, starts)
    this.slots++

    let opened: Opened | null = null
    let texture: Texture | null = null
    let start = -1
    let disposed = false
    const dispose = () => {
      if (disposed) return
      disposed = true
      texture?.destroy(true) // disposes the VideoResource (pauses and unloads the element)
      opened?.close()
      if (gen === this.generation) {
        this.slots--
        const i = starts.indexOf(start)
        if (i >= 0) starts.splice(i, 1)
      }
    }

    try {
      opened = await this.open(file)
      const { video, duration: d } = opened
      const { clipMin, clipMax, fadeTail } = videoConfig
      const clip = Math.min(rand(clipMin, clipMax), d) // short videos: use what exists
      const startMax = Math.max(0, d - clip - fadeTail)
      // Never 0: a real seek guarantees decoded data at the chosen point.
      start = Math.min(Math.max(0.1, this.pickTime(0, startMax, starts)), d - 0.1)
      starts.push(start)

      await this.seek(video, start)
      if (video.readyState < 3) await waitFor(video, 'canplay')
      if (gen !== this.generation) throw new Error('stale')

      texture = new Texture(new BaseTexture(new VideoResource(video, { autoPlay: false })))
      return {
        kind: 'clip',
        texture,
        clipSeconds: clip,
        start: async () => {
          try {
            await video.play()
            return true
          } catch {
            return false
          }
        },
        setPaused: (paused) => {
          if (paused) video.pause()
          else void video.play().catch(() => {})
        },
        release: dispose,
      }
    } catch {
      if (gen === this.generation) this.bad.add(file)
      dispose()
      return null
    }
  }

  /** A still frame of a random video. Extractions run one at a time. */
  nextFrame(): Promise<MediaItem | null> {
    const run = this.frameQueue.then(() => this.extractFrame())
    this.frameQueue = run.catch(() => {})
    return run
  }

  private async extractFrame(): Promise<MediaItem | null> {
    const gen = this.generation
    const file = this.pickFile()
    if (!file) return null
    let opened: Opened | null = null
    try {
      opened = await this.open(file)
      const { video, duration: d } = opened
      const times = this.recent.get(file) ?? []
      this.recent.set(file, times)
      const t = Math.min(Math.max(0.1, this.pickTime(0, d - 0.2, times)), d - 0.1)
      times.push(t)
      if (times.length > 6) times.shift()

      await this.seek(video, t)
      if (gen !== this.generation) return null

      const k = Math.min(1, videoConfig.frameMaxSide / Math.max(video.videoWidth, video.videoHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(video.videoWidth * k)
      canvas.height = Math.round(video.videoHeight * k)
      canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)

      const texture = Texture.from(canvas)
      let released = false
      return {
        kind: 'frame',
        texture,
        release: () => {
          if (released) return
          released = true
          texture.destroy(true)
          canvas.width = canvas.height = 0
        },
      }
    } catch {
      if (gen === this.generation) this.bad.add(file)
      return null
    } finally {
      opened?.close() // the video element only lives for the extraction
    }
  }
}
