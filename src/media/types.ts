import type { Texture } from 'pixijs'

/** image: foto de la carpeta · clip: fragmento de video en reproducción · frame: fotograma fijo de un video. */
export type MediaKind = 'image' | 'clip' | 'frame'

/** A ready-to-display piece of media: static (image, frame) or dynamic (video clip). */
export interface MediaItem {
  kind: MediaKind
  texture: Texture
  /** Frees the texture and any underlying resources. Safe to call more than once. */
  release(): void
  /** Dynamic media only: length in seconds of the visible clip (replaces the image display time). */
  clipSeconds?: number
  /** Dynamic media only: begins playback. Resolves false if it could not start. */
  start?(): Promise<boolean>
  /** Dynamic media only: freezes/resumes playback together with the engine. */
  setPaused?(paused: boolean): void
}

/** What the engine tells the provider when it needs one more element. */
export interface SpawnContext {
  /** Simultaneous elements wanted. */
  target: number
  /** Clips already in their last seconds (their replacement may start loading). */
  endingClips: number
}

/** What the animation engine needs from a media provider. */
export interface MediaProvider {
  readonly count: number
  /** Resolves with the next item, or null if nothing is available right now. */
  next(ctx: SpawnContext): Promise<MediaItem | null>
}
