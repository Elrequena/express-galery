import { Application, Container } from 'pixijs'
import type { MediaProvider } from '../media/types.ts'
import { ImageEntity } from './ImageEntity.ts'

const RETIRE_BOOST = 3 // lifecycle speed-up for surplus images

export class AnimationEngine {
  private app: Application
  private layer = new Container()
  private entities: ImageEntity[] = []
  private running = false
  private paused = false
  private pending = 0
  private spawnTimer = 0
  private run = 0 // invalidates in-flight spawns on stop

  displayTime = 8 // seconds
  density = 8 // desired simultaneous images
  private effective = 8 // density smoothed over time
  private boost = 1

  private media: MediaProvider

  constructor(host: HTMLElement, media: MediaProvider) {
    this.media = media
    this.app = new Application({
      resizeTo: window,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    })
    host.appendChild(this.app.view as unknown as HTMLCanvasElement)
    this.app.stage.addChild(this.layer)
    this.app.ticker.add(() => this.tick(this.app.ticker.deltaMS / 1000))
  }

  start() {
    if (this.running) return
    this.running = true
    this.paused = false
    this.effective = this.density
    this.boost = 1
    this.spawnTimer = 0 // spawn the first one immediately
  }

  pause() {
    if (this.running) this.paused = true
  }

  resume() {
    this.paused = false
  }

  stop() {
    this.running = false
    this.paused = false
    this.run++
    this.pending = 0
    for (const e of this.entities) e.destroy()
    this.entities = []
  }

  private tick(dt: number) {
    if (!this.running || this.paused) return
    dt = Math.min(dt, 0.1)

    // Ease the effective density towards the requested one (~2 s time constant).
    this.effective += (this.density - this.effective) * (1 - Math.exp(-dt / 2))
    // Surplus images (oldest first) fade out faster, with a smoothed ramp.
    const surplus = this.entities.length - this.effective
    const boostGoal = surplus > 0.5 ? RETIRE_BOOST : 1
    this.boost += (boostGoal - this.boost) * (1 - Math.exp(-dt))
    const boosted = surplus > 0.5 ? Math.ceil(surplus) : 0

    for (let i = this.entities.length - 1; i >= 0; i--) {
      if (!this.entities[i].update(dt, i < boosted ? this.boost : 1)) {
        this.entities[i].destroy()
        this.entities.splice(i, 1)
      }
    }

    this.spawnTimer -= dt
    const target = Math.max(1, Math.round(this.effective))
    if (this.spawnTimer <= 0 && this.entities.length + this.pending < target) {
      this.spawnTimer = (this.displayTime / target) * (0.6 + Math.random() * 0.8)
      void this.spawn()
    }
  }

  private async spawn() {
    const run = this.run
    this.pending++
    const item = await this.media.next()
    if (run !== this.run) {
      item?.release()
      return
    }
    this.pending--
    if (!item) return
    const lifetime = this.displayTime * (0.8 + Math.random() * 0.4)
    const entity = new ImageEntity(item, this.app.screen, lifetime)
    this.layer.addChild(entity.sprite)
    this.entities.push(entity)
  }
}
