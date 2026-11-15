import { isSupportedImage } from './ImageSource.ts'
import { isSupportedVideo } from './VideoSource.ts'

export interface Folder {
  id: number
  name: string
  files: File[]
  images: number
  videos: number
  /** Identity of the folder's content, used to reject the same folder twice. */
  fingerprint: string
}

export type AddResult = 'added' | 'duplicate' | 'empty'

/** Folders chosen one by one with the native picker. Nothing is stored beyond this session. */
export class FolderList {
  private items: Folder[] = []
  private nextId = 1

  get folders(): readonly Folder[] {
    return this.items
  }

  /** Adds the files of one picked folder (as returned by <input webkitdirectory>). */
  add(files: File[]): AddResult {
    if (!files.length) return 'empty'
    const name = files[0].webkitRelativePath.split('/')[0] || 'Carpeta'
    const fingerprint = fingerprintOf(name, files)
    if (this.items.some((f) => f.fingerprint === fingerprint)) return 'duplicate'
    this.items.push({
      id: this.nextId++,
      name,
      files,
      images: files.filter(isSupportedImage).length,
      videos: files.filter(isSupportedVideo).length,
      fingerprint,
    })
    return 'added'
  }

  remove(id: number) {
    this.items = this.items.filter((f) => f.id !== id)
  }

  /** Image files of all folders (candidates for the background picture). */
  imageFiles(): File[] {
    return this.allFiles().filter(isSupportedImage)
  }

  /** Video files of all folders (candidates for background audio). */
  videoFiles(): File[] {
    return this.allFiles().filter(isSupportedVideo)
  }

  /**
   * All files of all folders. A folder nested inside another selected folder would
   * list its files twice, so files are de-duplicated by name, size and date.
   */
  allFiles(): File[] {
    const seen = new Map<string, File>()
    for (const folder of this.items) {
      for (const f of folder.files) {
        const key = `${f.name}|${f.size}|${f.lastModified}`
        if (!seen.has(key)) seen.set(key, f)
      }
    }
    return [...seen.values()]
  }
}

/** Folder name + a cheap hash of every file's relative path, size and date. */
function fingerprintOf(name: string, files: File[]): string {
  const entries = files.map((f) => `${f.webkitRelativePath}:${f.size}:${f.lastModified}`).sort()
  let h = 2166136261
  for (const e of entries) {
    for (let i = 0; i < e.length; i++) h = Math.imul(h ^ e.charCodeAt(i), 16777619)
  }
  return `${name}|${files.length}|${(h >>> 0).toString(16)}`
}
