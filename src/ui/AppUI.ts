import { AnimationEngine } from '../engine/AnimationEngine.ts'
import { ImageSource } from '../media/ImageSource.ts'

type State = 'idle' | 'playing' | 'paused'

export class AppUI {
  private source = new ImageSource()
  private engine: AnimationEngine
  private state: State = 'idle'
  private searched = false
  private started = false

  private input = el('input', { type: 'file', hidden: '' }) as HTMLInputElement
  private pick = el('button', { class: 'btn' }, 'Elegir carpeta') as HTMLButtonElement
  private info = el('span', { class: 'info' })
  private slider = el('input', { type: 'range', min: '2', max: '30', step: '1', value: '8' }) as HTMLInputElement
  private secs = el('span', { class: 'secs' }, '8 s')
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
    const pin = el('input', { type: 'checkbox' }) as HTMLInputElement
    const fix = el('label', { class: 'switch' }, pin, el('span', { class: 'track' }), 'Fijar')
    bar.append(this.pick, this.info, time, this.play, this.stop, fix)
    const dock = (this.dock = el('div', { class: 'dock' }, bar))
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
    this.source.setFiles(this.input.files ?? [])
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
    this.info.textContent = this.searched ? `${n} ${n === 1 ? 'imagen' : 'imágenes'}` : ''
    this.play.textContent = { idle: 'Iniciar', playing: 'Pausar', paused: 'Reanudar' }[this.state]
    this.play.disabled = n === 0
    this.stop.disabled = this.state === 'idle'

    let msg = ''
    if (!this.searched) msg = 'Elige una carpeta con imágenes (JPG, PNG, WEBP o GIF) para empezar.'
    else if (n === 0) msg = 'No se encontraron imágenes compatibles en esa carpeta.'
    else if (this.state === 'idle') msg = 'Pulsa «Iniciar» para crear la composición.'
    this.empty.textContent = msg
    this.empty.style.display = msg ? '' : 'none'
  }
}

function el(tag: string, attrs: Record<string, string> = {}, ...children: (string | Node)[]) {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  e.append(...children)
  return e
}
