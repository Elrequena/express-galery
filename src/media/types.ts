import type { Texture } from 'pixijs'

/** A ready-to-display piece of media. Today only images; videos could later provide a texture too. */
export interface MediaItem {
  texture: Texture
  /** Frees the texture and any underlying resources. Safe to call once. */
  release(): void
}

/** What the animation engine needs from a media provider. */
export interface MediaProvider {
  readonly count: number
  /** Resolves with a random item, or null if nothing is available. */
  next(): Promise<MediaItem | null>
}
