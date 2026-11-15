import { videoConfig } from './config.ts'
import { ImageSource } from './ImageSource.ts'
import type { MediaItem, MediaProvider, SpawnContext } from './types.ts'
import { VideoSource } from './VideoSource.ts'

/**
 * One collection for the engine. Decides what kind of element comes next:
 *   1. clips, up to min(limit, target), so the video limit is always kept;
 *   2. images for the remaining slots (up to how many the folder has);
 *   3. video frames to fill whatever is still missing, plus an occasional
 *      frame (`frameShare`) even when there are plenty of images.
 */
export class MediaLibrary implements MediaProvider {
  readonly images = new ImageSource()
  readonly videos = new VideoSource()
  private live = { image: 0, frame: 0 } // handed out or loading, per static kind
  private generation = 0

  get count() {
    return this.images.count + this.videos.count
  }

  setFiles(list: FileList | null) {
    const files = Array.from(list ?? [])
    this.generation++
    this.live = { image: 0, frame: 0 }
    this.images.setFiles(files)
    this.videos.setFiles(files)
  }

  async next(ctx: SpawnContext): Promise<MediaItem | null> {
    const hasImages = this.images.count > 0
    const hasVideos = this.videos.hasUsable

    if (hasVideos) {
      const clipsWanted = Math.min(videoConfig.maxConcurrent, ctx.target)
      if (this.videos.active - ctx.endingClips < clipsWanted && this.videos.canStartClip) {
        const clip = await this.videos.nextClip()
        if (clip) return clip
      }
    }

    if (!hasVideos) return hasImages ? this.tracked('image', this.images.next()) : null
    if (!hasImages) return this.tracked('frame', this.videos.nextFrame())

    const slots = ctx.target - Math.min(videoConfig.maxConcurrent, ctx.target)
    const imagesWanted = Math.min(this.images.count, slots)
    if (this.live.image < imagesWanted && Math.random() >= videoConfig.frameShare) {
      return this.tracked('image', this.images.next())
    }
    return this.tracked('frame', this.videos.nextFrame())
  }

  /** Counts an item from the moment it is requested until it is released. */
  private async tracked(kind: 'image' | 'frame', pending: Promise<MediaItem | null>) {
    const gen = this.generation
    this.live[kind]++
    const free = () => {
      if (gen === this.generation) this.live[kind]--
    }
    const item = await pending.catch(() => null)
    if (!item) {
      free()
      return null
    }
    const release = item.release
    let freed = false
    item.release = () => {
      release()
      if (!freed) {
        freed = true
        free()
      }
    }
    return item
  }
}
