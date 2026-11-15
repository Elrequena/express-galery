import { Sprite } from 'pixijs'
import { sizeConfig } from '../media/config.ts'
import type { MediaItem } from '../media/types.ts'

export interface Bounds {
  width: number
  height: number
}

const CENTRE_BIAS = 0.65 // chance that an image starts moving towards the centre

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** One active image: its sprite, motion and independent lifecycle. */
export class ImageEntity {
  readonly sprite: Sprite
  private age = 0
  private vx = 0
  private vy = 0
  private fadeIn: number
  private fadeOut: number

  private item: MediaItem
  private lifetime: number // seconds

  constructor(item: MediaItem, bounds: Bounds, lifetime: number, sizeScale = 1) {
    this.item = item
    this.lifetime = lifetime
    const tex = item.texture
    const side = rand(sizeConfig.min, sizeConfig.max) * sizeScale * Math.min(bounds.width, bounds.height)
    const scale = side / Math.max(tex.width, tex.height)

    this.sprite = new Sprite(tex)
    this.sprite.anchor.set(0.5)
    this.sprite.scale.set(scale)
    this.sprite.alpha = 0

    // Positions favour the centre (average of two uniforms = triangular distribution).
    const centred = (u: number) => 0.5 + (rand(-1, 1) + rand(-1, 1)) * 0.25 * u
    this.sprite.x = centred(0.9) * bounds.width
    this.sprite.y = centred(0.9) * bounds.height

    // Movement leans towards the centre so images cross it instead of drifting to the edges.
    const speed = rand(12, 70) // px/s
    const horizontal = Math.random() < 0.6
    const towardCentre = Math.random() < CENTRE_BIAS
    const offset = horizontal ? this.sprite.x - bounds.width / 2 : this.sprite.y - bounds.height / 2
    const away = offset >= 0 ? 1 : -1
    const sign = towardCentre ? -away : away
    if (horizontal) this.vx = sign * speed
    else this.vy = sign * speed

    this.fadeIn = Math.min(1.5, lifetime * 0.2)
    this.fadeOut = Math.min(2, lifetime * 0.25)
  }

  /** Advances by dt seconds (ageRate speeds up only its lifecycle, not its motion). Returns false once the entity is finished. */
  update(dt: number, ageRate = 1): boolean {
    this.age += dt * ageRate // ageRate > 1 makes it fade out sooner
    this.sprite.x += this.vx * dt
    this.sprite.y += this.vy * dt
    const left = this.lifetime - this.age
    this.sprite.alpha = Math.max(0, Math.min(1, this.age / this.fadeIn, left / this.fadeOut)) * 0.95
    return left > 0
  }

  get kind() {
    return this.item.kind
  }

  /** Seconds of life left. */
  get remaining() {
    return this.lifetime - this.age
  }

  setPaused(paused: boolean) {
    this.item.setPaused?.(paused)
  }

  destroy() {
    this.sprite.destroy() // texture is released by the media item
    this.item.release()
  }
}
