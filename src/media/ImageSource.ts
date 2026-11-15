import { Texture } from 'pixijs'
import type { MediaItem, MediaProvider } from './types.ts'

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i
const MAX_TEXTURE_SIDE = 2048
const PRELOAD_AHEAD = 3

export const isSupportedImage = (f: File) =>
  IMAGE_EXT.test(f.name) || /^image\/(jpeg|png|webp|gif)$/.test(f.type)

/**
 * Holds the files of the selected folder and decodes them on demand.
 * Order is a shuffled "bag" so images don't repeat until all were shown.
 * Only a few upcoming items are decoded ahead of time.
 */
export class ImageSource implements MediaProvider {
  private files: File[] = []
  private bag: File[] = []
  private buffer: Promise<MediaItem | null>[] = []
  private generation = 0

  get count() {
    return this.files.length
  }

  setFiles(list: FileList | File[]) {
    this.clear()
    this.files = Array.from(list).filter(isSupportedImage)
  }

  /** Drops queued items and invalidates in-flight loads. */
  clear() {
    this.generation++
    for (const p of this.buffer) void p.then((item) => item?.release())
    this.buffer = []
    this.bag = []
  }

  async next(): Promise<MediaItem | null> {
    if (!this.files.length) return null
    while (this.buffer.length < PRELOAD_AHEAD + 1) this.buffer.push(this.load(this.pick()))
    return (await this.buffer.shift()!) ?? null
  }

  private pick(): File {
    if (!this.bag.length) {
      this.bag = [...this.files]
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
      }
    }
    return this.bag.pop()!
  }

  private async load(file: File): Promise<MediaItem | null> {
    const gen = this.generation
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      let source: HTMLImageElement | HTMLCanvasElement = img
      const max = Math.max(img.naturalWidth, img.naturalHeight)
      if (max > MAX_TEXTURE_SIDE) {
        const k = MAX_TEXTURE_SIDE / max
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.naturalWidth * k)
        canvas.height = Math.round(img.naturalHeight * k)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        source = canvas
      }
      const texture = Texture.from(source)
      const item: MediaItem = {
        texture,
        release: () => {
          texture.destroy(true) // also destroys the BaseTexture
          if (source instanceof HTMLCanvasElement) source.width = source.height = 0
        },
      }
      if (gen !== this.generation) {
        item.release()
        return null
      }
      return item
    } catch {
      return null
    } finally {
      URL.revokeObjectURL(url) // pixels are already decoded in memory
    }
  }
}
