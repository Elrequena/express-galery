import { AnimationEngine } from '../engine/AnimationEngine.ts'
import { densityConfig } from '../media/config.ts'
import { MediaLibrary } from '../media/MediaLibrary.ts'

const DEFAULT_BG = '#0b0b0e'

type State = 'idle' | 'playing' | 'paused'

export class AppUI {
  private source = new MediaLibrary()
  private engine: AnimationEngine
  private state: State = 'idle'
  private searched = false
  private started = false

  private input = el('input', { type: 'file', hidden: '' }) as HTMLInputElement
  private pick = el('button', { class: 'btn' }, 'Elegir carpeta') as HTMLButtonElement
  private info = el('span', { class: 'info' })
  private slider = el('input', { type: 'range', min: '2', max: '30', step: '1', value: '10' }) as HTMLInputElement
  private secs = el('span', { class: 'secs' }, '10 s')
  private count = el('input', { type: 'number', min: String(densityConfig.min), max: String(densityConfig.max), step: '1', value: String(densityConfig.default) }) as HTMLInputElement
  private play = el('button', { class: 'btn primary' }, 'Iniciar') as HTMLButtonElement
  private stop = el('button', { class: 'btn' }, 'Detener') as HTMLButtonElement
  private empty = el('div', { class: 'empty' })
  private dock!: HTMLElement

  constructor(root: HTMLElement) {
    this.input.setAttribute('webkitdirectory', '')
    this.input.multiple = true
    const stage = el('div', { class: 'stage' })
    const bar = el('div', { class: 'bar' })
    const time = el('label', { class: 'time' }, 'Tiempo ', this.slider, this.secs)
    const minus = el('button', { class: 'step', type: 'button', 'aria-label': 'Menos' }, '−')
    const plus = el('button', { class: 'step', type: 'button', 'aria-label': 'Más' }, '+')
    const dens = el('div', { class: 'time' }, 'Cantidad', el('span', { class: 'stepper' }, minus, this.count, plus))
    const pin = el('input', { type: 'checkbox' }) as HTMLInputElement
    const fix = el('label', { class: 'switch' }, pin, el('span', { class: 'track' }), 'Fijar')
    const gear = el('button', { class: 'btn icon', type: 'button', 'aria-label': 'Ajustes', title: 'Ajustes' }, '⚙︎')
    bar.append(this.pick, this.info, time, dens, this.play, this.stop, fix, gear)

    // Panel de ajustes (por ahora solo Apariencia); crecerá con más secciones.
    const color = el('input', { type: 'color', value: DEFAULT_BG }) as HTMLInputElement
    const reset = el('button', { class: 'btn', type: 'button' }, 'Restablecer')
    const panel = el(
      'div',
      { class: 'panel', hidden: '' },
      el('h2', {}, 'Apariencia'),
      el('div', { class: 'row' }, el('label', {}, 'Color de fondo'), el('span', { class: 'row-ctrl' }, color, reset)),
    )
    const applyBg = (c: string) => {
      document.body.style.background = c
      document.body.classList.toggle('light-bg', isLight(c))
      color.value = c
    }
    color.oninput = () => applyBg(color.value)
    reset.onclick = () => applyBg(DEFAULT_BG)

    const dock = (this.dock = el('div', { class: 'dock' }, el('div', { class: 'dock-inner' }, panel, bar)))
    const setPanel = (open: boolean) => {
      panel.hidden = !open
      dock.classList.toggle('open', open)
    }
    gear.onclick = () => setPanel(!!panel.hidden)
    document.addEventListener('pointerdown', (e) => {
      const t = e.target as Node
      if (!panel.hidden && !panel.contains(t) && !gear.contains(t)) setPanel(false)
    })
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setPanel(false)
    })
    root.append(stage, this.empty, dock, this.input)

    pin.onchange = () => dock.classList.toggle('pinned', pin.checked)
    let hideTimer = 0
    window.addEventListener('keydown', (e) => {
      if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'Escape') return
      dock.classList.add('shown')
      clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => dock.classList.remove('shown'), 3000)
    })
    this.engine = new AnimationEngine(stage, this.source)

    this.pick.onclick = () => this.input.click()
    this.input.onchange = () => this.onFolder()
    this.slider.oninput = () => {
      this.engine.displayTime = Number(this.slider.value)
      this.secs.textContent = `${this.slider.value} s`
    }
    const setCount = (n: number) => {
      const v = Math.min(densityConfig.max, Math.max(densityConfig.min, Math.round(n) || densityConfig.default))
      this.count.value = String(v)
      this.engine.density = v
    }
    this.count.onchange = () => setCount(Number(this.count.value))
    minus.onclick = () => setCount(Number(this.count.value) - 1)
    plus.onclick = () => setCount(Number(this.count.value) + 1)
    this.play.onclick = () => this.onPlay()
    this.stop.onclick = () => {
      this.engine.stop()
      this.state = 'idle'
      this.render()
    }
    this.render()
  }

  private onFolder() {
    this.engine.stop()
    this.state = 'idle'
    this.source.setFiles(this.input.files)
    this.searched = true
    this.input.value = '' // allows re-selecting the same folder
    this.render()
  }

  private onPlay() {
    if (this.state === 'idle') {
      this.engine.start()
      this.started = true
      this.state = 'playing'
    } else if (this.state === 'playing') {
      this.engine.pause()
      this.state = 'paused'
    } else {
      this.engine.resume()
      this.state = 'playing'
    }
    this.render()
  }

  private render() {
    const n = this.source.count
    this.dock.classList.toggle('always', !this.started)
    const i = this.source.images.count
    const v = this.source.videos.count
    this.info.textContent = this.searched
      ? `${i} ${i === 1 ? 'imagen' : 'imágenes'}` + (v ? ` · ${v} ${v === 1 ? 'video' : 'videos'}` : '')
      : ''
    this.play.textContent = { idle: 'Iniciar', playing: 'Pausar', paused: 'Reanudar' }[this.state]
    this.play.disabled = n === 0
    this.stop.disabled = this.state === 'idle'

    let msg = ''
    if (!this.searched) msg = 'Elige una carpeta con imágenes (JPG, PNG, WEBP, GIF) o videos (MP4, WEBM, MOV) para empezar.'
    else if (n === 0) msg = 'No se encontraron imágenes ni videos compatibles en esa carpeta.'
    else if (this.state === 'idle') msg = 'Pulsa «Iniciar» para crear la composición.'
    this.empty.replaceChildren(el('div', {}, el('h1', {}, 'Express Galery'), el('p', {}, msg)))
    this.empty.style.display = msg ? '' : 'none'
  }
}

/** True when dark text reads better than light text on this hex color (WCAG luminance). */
function isLight(hex: string): boolean {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179
}

function el(tag: string, attrs: Record<string, string> = {}, ...children: (string | Node)[]) {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  e.append(...children)
  return e
}
