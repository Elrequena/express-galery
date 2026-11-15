import { Application, Container } from 'pixijs'
import type { MediaProvider } from '../media/types.ts'
import { ImageEntity } from './ImageEntity.ts'

const TARGET_ACTIVE = 8

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

    for (let i = this.entities.length - 1; i >= 0; i--) {
      if (!this.entities[i].update(dt)) {
        this.entities[i].destroy()
        this.entities.splice(i, 1)
      }
    }

    this.spawnTimer -= dt
    if (this.spawnTimer <= 0 && this.entities.length + this.pending < TARGET_ACTIVE) {
      this.spawnTimer = (this.displayTime / TARGET_ACTIVE) * (0.6 + Math.random() * 0.8)
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
