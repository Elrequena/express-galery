export type BackgroundFit = 'height' | 'width'

/**
 * Background image of the page (the stage canvas is transparent, so it shows through).
 * Always keeps the aspect ratio: it is sized to the window height or width, never stretched.
 * The browser reads the file through a Blob URL, which is revoked when replaced or removed.
 */
export class BackgroundImage {
  file: File | null = null
  private url: string | null = null
  private fit: BackgroundFit = 'height'

  /** Applies a new image. Resolves false (keeping the previous one) if it cannot be decoded. */
  async setFile(file: File): Promise<boolean> {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
    } catch {
      URL.revokeObjectURL(url)
      return false
    }
    if (this.url) URL.revokeObjectURL(this.url)
    this.url = url
    this.file = file
    const s = document.body.style
    s.backgroundImage = `url("${url}")`
    s.backgroundRepeat = 'no-repeat'
    s.backgroundPosition = 'center'
    this.applyFit()
    return true
  }

  clear() {
    document.body.style.backgroundImage = ''
    if (this.url) URL.revokeObjectURL(this.url)
    this.url = null
    this.file = null
  }

  setFit(fit: BackgroundFit) {
    this.fit = fit
    this.applyFit()
  }

  private applyFit() {
    document.body.style.backgroundSize = this.fit === 'height' ? 'auto 100%' : '100% auto'
  }
}
